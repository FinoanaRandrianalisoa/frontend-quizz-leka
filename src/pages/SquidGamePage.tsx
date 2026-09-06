import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardContent, Badge } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import usePageTitle from "@/lib/usePageTitle";

const MOVES = ["pierre", "papier", "ciseaux"] as const;
type Move = (typeof MOVES)[number];

type PlayerList = {
  id: string;
  pseudo: string;
};

type MatchState = {
  id: string;
  joueurHoteId: string;
  joueurHotePseudo: string;
  joueurInviteId: string;
  joueurInvitePseudo: string;
  scoreHote: number;
  scoreInvite: number;
  scoreCible: number;
  round: number;
  statut: string;
};

export default function SquidGamePage({ onNavigate }: { onNavigate?: (p: string, id?: number | null) => void }) {
  usePageTitle("Squid Game");
  const { user } = useAuth();
  const [players, setPlayers] = useState<PlayerList[]>([]);
  const [selected, setSelected] = useState<PlayerList | null>(null);
  const [targetScore, setTargetScore] = useState<number>(3);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);
  const [spectatorMatches, setSpectatorMatches] = useState<MatchState[]>([]);
  const [currentMove, setCurrentMove] = useState<Move | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roundLocked, setRoundLocked] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await api.utilisateurs();
        setPlayers((res.utilisateurs ?? []).filter((p) => p.id !== user?.id));
      } catch {
        setPlayers([]);
      }
    };
    void fetchPlayers();
  }, [user?.id]);

  const loadActiveMatches = async () => {
    if (!user?.id) return;
    try {
      const res = await api.mesMatchsRps();
      const inProgress = (res.mesMatchsRps ?? [])
        .filter((item) => item.statut === "en_cours")
        .map((item) => ({
          id: item.id,
          joueurHoteId: item.joueurHoteId,
          joueurHotePseudo: item.joueurHotePseudo,
          joueurInviteId: item.joueurInviteId,
          joueurInvitePseudo: item.joueurInvitePseudo,
          scoreHote: Number(item.scoreHote ?? 0),
          scoreInvite: Number(item.scoreInvite ?? 0),
          scoreCible: Number(item.scoreCible ?? 3),
          round: Number(item.round ?? 1),
          statut: item.statut,
        }));
      setActiveMatches(inProgress);
    } catch {
      setActiveMatches([]);
    }
  };

  useEffect(() => {
    void loadActiveMatches();
  }, [user?.id]);

  const loadSpectatorMatches = async () => {
    try {
      const res = await api.partiesRpsDisponibles();
      const available = (res.partiesRpsDisponibles ?? [])
        .filter((item) => item.statut === "en_cours")
        .filter((item) => 
          String(item.joueurHoteId) !== String(user?.id) && 
          String(item.joueurInviteId) !== String(user?.id)
        )
        .map((item) => ({
          id: item.id,
          joueurHoteId: item.joueurHoteId,
          joueurHotePseudo: item.joueurHotePseudo,
          joueurInviteId: item.joueurInviteId,
          joueurInvitePseudo: item.joueurInvitePseudo,
          scoreHote: Number(item.scoreHote ?? 0),
          scoreInvite: Number(item.scoreInvite ?? 0),
          scoreCible: Number(item.scoreCible ?? 3),
          round: Number(item.round ?? 1),
          statut: item.statut,
        }));
      setSpectatorMatches(available);
    } catch {
      setSpectatorMatches([]);
    }
  };

  useEffect(() => {
    void loadSpectatorMatches();
    const interval = setInterval(() => void loadSpectatorMatches(), 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadPendingChallenges = async () => {
    if (!user?.id) return;
    try {
      const res = await api.mesDefisRps();
      const pending = res.mesDefisRps?.[0];
      if (!pending) {
        setChallengeId(null);
        setSelected(null);
        return;
      }

      setChallengeId(pending.id);
      setSelected({
        id: String(pending.fromId),
        pseudo: pending.fromPseudo,
      });
    } catch {
      setChallengeId(null);
      setSelected(null);
    }
  };

  useEffect(() => {
    void loadPendingChallenges();
  }, [user?.id]);

  useEffect(() => {
    const refreshChallenges = () => {
      void loadPendingChallenges();
      void loadActiveMatches();
    };
    window.addEventListener("notifications:refresh", refreshChallenges);
    return () => window.removeEventListener("notifications:refresh", refreshChallenges);
  }, [user?.id]);

  useEffect(() => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!match || !token) return;

    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || "https://quizz-leka.onrender.com/graphql/";
    const apiRoot = apiBase.replace(/\/graphql\/?$/, "");
    const wsBase = (import.meta.env.VITE_WS_URL as string | undefined) || apiRoot.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/ws/rps/${match.id}/?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === "rps.update" && payload.match) {
          setMatch(payload.match);
          setRoundLocked(false);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      try { ws.close(); } catch {}
      socketRef.current = null;
    };
  }, [match?.id]);

  const meIsHost = !!match && String(user?.id) === String(match.joueurHoteId);

  const statusText = useMemo(() => {
    if (challengeId && selected) return `Défi reçu de ${selected.pseudo} — accepte pour démarrer le duel.`;
    if (!match) return "Défiez un autre joueur en ligne pour commencer.";
    if (match.statut === "termine") {
      const winner = String(match.joueurHoteId) === String(match.joueurHoteId) && match.scoreHote >= match.scoreCible ? match.joueurHotePseudo : match.joueurInvitePseudo;
      return `Partie terminée — ${winner} a gagné !`;
    }
    return `${match.joueurHotePseudo} vs ${match.joueurInvitePseudo} — manche ${match.round}`;
  }, [match]);

  async function challengePlayer(player: PlayerList) {
    setSelected(player);
    setLoading(true);
    setError(null);
    sessionStorage.removeItem("squid_rps_match");
    setMatch(null);
    try {
      const result = await api.defierJoueurRps(Number(player.id), targetScore);
      setChallengeId(result.defierJoueurRps.id);
    } catch (err: any) {
      setError(err?.message ?? "Impossible d'envoyer le défi.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptChallenge() {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const pending = await api.mesDefisRps();
      const validChallenge = pending.mesDefisRps?.find((item) => item.id === challengeId);
      if (!validChallenge) {
        setChallengeId(null);
        setError("Ce défi a déjà été accepté ou n'existe plus.");
        setLoading(false);
        return;
      }

      const result = await api.accepterDefiRps(challengeId);
      const nextMatch = {
        id: result.accepterDefiRps.id,
        joueurHoteId: result.accepterDefiRps.joueurHoteId,
        joueurHotePseudo: result.accepterDefiRps.joueurHotePseudo,
        joueurInviteId: result.accepterDefiRps.joueurInviteId,
        joueurInvitePseudo: result.accepterDefiRps.joueurInvitePseudo,
        scoreHote: result.accepterDefiRps.scoreHote,
        scoreInvite: result.accepterDefiRps.scoreInvite,
        scoreCible: result.accepterDefiRps.scoreCible,
        round: result.accepterDefiRps.round,
        statut: result.accepterDefiRps.statut,
      };
      setMatch(nextMatch);
      sessionStorage.setItem("squid_rps_match", JSON.stringify(nextMatch));
      setChallengeId(null);
    } catch (err: any) {
      setChallengeId(null);
      setError(err?.message ?? "Impossible d'accepter le défi.");
    } finally {
      setLoading(false);
    }
  }

  async function playMove(move: Move) {
    if (!match || roundLocked) return;
    setLoading(true);
    setError(null);
    setCurrentMove(move);
    setRoundLocked(true);
    try {
      const result = await api.jouerCoupRps(match.id, move);
      const nextMatch = {
        id: result.jouerCoupRps.id,
        joueurHoteId: result.jouerCoupRps.joueurHoteId,
        joueurHotePseudo: result.jouerCoupRps.joueurHotePseudo,
        joueurInviteId: result.jouerCoupRps.joueurInviteId,
        joueurInvitePseudo: result.jouerCoupRps.joueurInvitePseudo,
        scoreHote: result.jouerCoupRps.scoreHote,
        scoreInvite: result.jouerCoupRps.scoreInvite,
        scoreCible: result.jouerCoupRps.scoreCible,
        round: result.jouerCoupRps.round,
        statut: result.jouerCoupRps.statut,
      };
      setMatch(nextMatch);
      sessionStorage.setItem("squid_rps_match", JSON.stringify(nextMatch));
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("introuvable") || msg.includes("not found") || msg.includes("Partie Rock Paper Scissors")) {
        try {
          const res = await api.mesMatchsRps();
          const fallback = (res.mesMatchsRps ?? []).find((item) => item.statut === "en_cours");
          if (fallback) {
            const hydrated = {
              id: fallback.id,
              joueurHoteId: fallback.joueurHoteId,
              joueurHotePseudo: fallback.joueurHotePseudo,
              joueurInviteId: fallback.joueurInviteId,
              joueurInvitePseudo: fallback.joueurInvitePseudo,
              scoreHote: Number(fallback.scoreHote ?? 0),
              scoreInvite: Number(fallback.scoreInvite ?? 0),
              scoreCible: Number(fallback.scoreCible ?? 3),
              round: Number(fallback.round ?? 1),
              statut: fallback.statut,
            };
            setMatch(hydrated);
            sessionStorage.setItem("squid_rps_match", JSON.stringify(hydrated));
            setError(null);
            setRoundLocked(false);
            return;
          }
        } catch {
          // ignore recovery failure
        }
      }
      setError(err?.message ?? "Impossible d'envoyer le coup.");
      setRoundLocked(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Squid Game</h1>
          <p className="text-sm text-[#64748b]">Pierre, Papier, Ciseaux en ligne multijoueur.</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate?.("categories")}>Retour</Button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#64748b]">Game status</p>
                <h2 className="mt-2 text-xl font-bold">{statusText}</h2>
              </div>
              {match && (
                <div className="rounded-full bg-[#ecfdf5] px-3 py-1 text-sm font-medium text-[#166534]">
                  {match.scoreHote} - {match.scoreInvite}
                </div>
              )}
            </div>

            {match ? (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {MOVES.map((move) => (
                    <button
                      key={move}
                      type="button"
                      onClick={() => void playMove(move)}
                      disabled={loading || roundLocked || match.statut === "termine"}
                      className={`rounded-2xl border p-4 text-center transition ${
                        currentMove === move ? "border-[#16a34a] bg-[#f0fdf4]" : "border-[#dfeae0] bg-white hover:border-[#16a34a]"
                      }`}
                    >
                      <div className="text-3xl">{move === "pierre" ? "✊" : move === "papier" ? "✋" : "✌️"}</div>
                      <div className="mt-2 text-sm font-semibold capitalize">{move}</div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-4 text-sm text-[#64748b]">
                  {meIsHost ? "Tu es l'hôte du défi." : "Tu es l'invité du défi."}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-6 text-center text-[#64748b]">
                  Aucune partie active pour le moment. Choisissez un joueur pour envoyer un défi.
                </div>

                {activeMatches.length > 0 && (
                  <div className="rounded-2xl border border-[#edf2ee] bg-white p-4">
                    <p className="mb-3 text-sm font-semibold text-[#1f2a1f]">Parties lancées</p>
                    <div className="space-y-2">
                      {activeMatches.map((active) => {
                        const opponent = String(active.joueurHoteId) === String(user?.id)
                          ? active.joueurInvitePseudo
                          : active.joueurHotePseudo;

                        return (
                          <button
                            key={active.id}
                            type="button"
                            onClick={() => {
                              setMatch(active);
                              sessionStorage.setItem("squid_rps_match", JSON.stringify(active));
                              if (onNavigate) onNavigate("rpsMatch");
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-[#edf2ee] bg-[#f8fafc] p-3 text-left hover:border-[#16a34a]"
                          >
                            <div>
                              <div className="font-medium text-[#1f2a1f]">vs {opponent}</div>
                              <div className="text-xs text-[#64748b]">Manche {active.round} · {active.scoreHote} - {active.scoreInvite}</div>
                            </div>
                            <span className="text-xs font-medium text-[#166534]">Ouvrir</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {spectatorMatches.length > 0 && (
                  <div className="rounded-2xl border border-[#e7d8a9] bg-[#fff9eb] p-4">
                    <p className="mb-3 text-sm font-semibold text-[#8a5b00]">Matchs en direct (Spectateur)</p>
                    <div className="space-y-2">
                      {spectatorMatches.map((spectatorMatch) => (
                        <button
                          key={spectatorMatch.id}
                          type="button"
                          onClick={() => {
                            setMatch(spectatorMatch);
                            sessionStorage.setItem("squid_rps_match", JSON.stringify(spectatorMatch));
                            if (onNavigate) onNavigate("rpsMatch");
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-[#e7d8a9] bg-[#fffbf0] p-3 text-left hover:border-[#FF6B35]"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="live">LIVE</Badge>
                            <div>
                              <div className="font-medium text-[#1f2a1f]">{spectatorMatch.joueurHotePseudo} vs {spectatorMatch.joueurInvitePseudo}</div>
                              <div className="text-xs text-[#64748b]">Manche {spectatorMatch.round} · {spectatorMatch.scoreHote} - {spectatorMatch.scoreInvite}</div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-[#FF6B35]">Regarder</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Joueurs en ligne</h3>
            </div>
            <div className="mb-4 rounded-xl border border-[#edf2ee] bg-[#f8fafc] p-3">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#64748b]">Score cible</label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetScore}
                onChange={(e) => setTargetScore(Math.max(1, Math.min(20, Number(e.target.value || 1))))}
                className="w-24 rounded-lg border border-[#d9e7dd] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="text-sm text-[#64748b]">Aucun autre joueur disponible.</div>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf2ee] p-3">
                    <div>
                      <p className="font-medium">{player.pseudo}</p>
                      <p className="text-xs text-[#64748b]">Disponible pour un duel</p>
                    </div>
                    <Button size="sm" onClick={() => void challengePlayer(player)} disabled={loading}>
                      Défi
                    </Button>
                  </div>
                ))
              )}
            </div>

            {challengeId && !match && (
              <div className="mt-6 rounded-2xl border border-[#e7d8a9] bg-[#fff9eb] p-4 text-sm text-[#8a5b00]">
                <p className="font-medium">Défi envoyé à {selected?.pseudo ?? "ce joueur"}.</p>
                <p className="mt-2">En attente d'acceptation.</p>
                <Button className="mt-3" onClick={() => void acceptChallenge()} disabled={loading}>Accepter le défi</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
