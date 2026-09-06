import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardContent, Badge } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import usePageTitle from "@/lib/usePageTitle";

const DIRECTIONS = ["gauche", "centre", "droite"] as const;
type Direction = (typeof DIRECTIONS)[number];

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
  resultatManche?: string | null;
  vainqueurId?: string | null;
};

function hydrateMatchFromPayload(payload: any): MatchState {
  return {
    id: payload.id,
    joueurHoteId: payload.joueurHoteId,
    joueurHotePseudo: payload.joueurHotePseudo,
    joueurInviteId: payload.joueurInviteId,
    joueurInvitePseudo: payload.joueurInvitePseudo,
    scoreHote: Number(payload.scoreHote ?? 0),
    scoreInvite: Number(payload.scoreInvite ?? 0),
    scoreCible: Number(payload.scoreCible ?? 0),
    round: Number(payload.round ?? 1),
    statut: payload.statut,
    resultatManche: payload.resultatManche ?? null,
    vainqueurId: payload.vainqueurId ?? null,
  };
}

export default function PenaltyMatchPage({ onNavigate }: { onNavigate?: (p: string, id?: number | null) => void }) {
  usePageTitle("Duel Tir au but");
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roundLocked, setRoundLocked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showVictoryBadge, setShowVictoryBadge] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [publishingVictory, setPublishingVictory] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const loadStoredMatch = () => {
    const stored = sessionStorage.getItem("squid_penalty_match");
    if (!stored) return false;
    try {
      const payload = JSON.parse(stored) as MatchState;
      if (!payload.id || !payload.joueurHoteId || !payload.joueurInviteId) {
        console.error("Match invalide dans sessionStorage:", payload);
        sessionStorage.removeItem("squid_penalty_match");
        return false;
      }
      setMatch(payload);
      
      // Vérifier si c'est un nouveau match accepté
      const isNewMatch = sessionStorage.getItem("squid_penalty_new_match");
      if (isNewMatch === "true") {
        sessionStorage.removeItem("squid_penalty_new_match");
        // Démarrer le compte à rebours si c'est un nouveau match
        if (payload.round === 1 && payload.scoreHote === 0 && payload.scoreInvite === 0) {
          setCountdown(5);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Erreur lors du parsing du match stocké:", error);
      sessionStorage.removeItem("squid_penalty_match");
      return false;
    }
  };

  const loadPendingChallenge = async () => {
    if (!user?.id) return;
    try {
      const res = await api.mesMatchsPenalty();
      const activeMatch = (res.mesMatchsPenalty ?? []).find((item) => item.statut === "en_cours");
      if (!activeMatch) {
        setError("Aucun match actif pour ce duel.");
        return;
      }

      const nextMatch = hydrateMatchFromPayload(activeMatch);
      setMatch(nextMatch);
      sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch));
      setError(null);
      
      // Démarrer le compte à rebours de 5 secondes si c'est un nouveau match
      if (nextMatch.round === 1 && nextMatch.scoreHote === 0 && nextMatch.scoreInvite === 0) {
        setCountdown(5);
      }
    } catch (err: any) {
      setError(err?.message ?? "Impossible d'ouvrir le duel.");
    }
  };

  const pollMatch = async () => {
    if (!match || match.statut === "termine") return;
    try {
      const res = await api.mesMatchsPenalty();
      const currentMatch = (res.mesMatchsPenalty ?? []).find((item) => item.id === match.id);
      if (currentMatch) {
        const nextMatch = hydrateMatchFromPayload(currentMatch);
        setMatch(nextMatch);
        sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch));
      }
    } catch {
      // ignore polling errors
    }
  };

  useEffect(() => {
    if (user?.id && !loadStoredMatch()) {
      void loadPendingChallenge();
    }
  }, [user?.id]);

  // Polling automatique pour synchroniser le score
  useEffect(() => {
    if (!match || match.statut === "termine") {
      return;
    }
    
    const pollInterval = setInterval(() => void pollMatch(), 2000);
    return () => clearInterval(pollInterval);
  }, [match?.id, match?.statut]);

  // Gestion du compte à rebours
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!match?.id) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/penalty/${match.id}/`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket penalty connecté");
    };

    ws.onclose = () => {
      console.log("WebSocket penalty déconnecté");
    };

    ws.onerror = (error) => {
      console.error("WebSocket penalty error:", error);
    };

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        
        if (payload?.type === "penalty.update" && payload.match) {
          const nextMatch = hydrateMatchFromPayload(payload.match);
          setMatch(nextMatch);
          sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch));
          setRoundLocked(false);
          
          if (nextMatch.statut === "termine" && match.statut !== "termine") {
            setShowVictoryBadge(true);
          }
        }
      } catch {
        // ignore malformed payload
      }
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
      socketRef.current = null;
    };
  }, [match?.id]);

  const meIsHost = !!match && String(user?.id) === String(match.joueurHoteId);
  const meIsInvite = !!match && String(user?.id) === String(match.joueurInviteId);
  const meIsSpectator = !!match && !meIsHost && !meIsInvite;

  const statusText = useMemo(() => {
    if (!match) return "Chargement du duel…";
    if (match.statut === "termine") {
      if (match.scoreHote === match.scoreInvite) return "Partie terminée — égalité !";
      const winner = match.scoreHote > match.scoreInvite ? match.joueurHotePseudo : match.joueurInvitePseudo;
      return `Partie terminée — ${winner} a gagné !`;
    }
    return `${match.joueurHotePseudo} vs ${match.joueurInvitePseudo} — Score ${match.scoreHote} - ${match.scoreInvite}`;
  }, [match]);

  const roundResultLabel = useMemo(() => {
    if (!match?.resultatManche) return "En attente du tir…";
    return match.resultatManche;
  }, [match?.resultatManche]);

  const quitMatch = () => {
    sessionStorage.removeItem("squid_penalty_match");
    try {
      socketRef.current?.close();
    } catch {
      // ignore close errors
    }
    onNavigate?.("penaltyKick");
  };

  const winnerLabel = useMemo(() => {
    if (!match || match.statut !== "termine") return null;
    const winner = match.scoreHote > match.scoreInvite ? match.joueurHotePseudo : match.joueurInvitePseudo;
    return `Félicitations ! ${winner} remporte le duel de tir au but.`;
  }, [match]);

  const iAmWinner = useMemo(() => {
    if (!match || match.statut !== "termine") return false;
    const winnerId = match.scoreHote > match.scoreInvite ? match.joueurHoteId : match.joueurInviteId;
    return String(user?.id) === String(winnerId);
  }, [match, user?.id]);

  const iAmLoser = useMemo(() => {
    if (!match || match.statut !== "termine") return false;
    const winnerId = match.scoreHote > match.scoreInvite ? match.joueurHoteId : match.joueurInviteId;
    return String(user?.id) !== String(winnerId);
  }, [match, user?.id]);

  const handleRequestRematch = () => {
    setRematchRequested(true);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "rematch_request",
        from_id: user?.id,
      }));
    }
  };

  const handleAcceptRematch = async () => {
    if (!match) return;
    setRematchAccepted(true);
    try {
      const result = await api.demarrerRevanchePenalty(match.id);
      const newMatch = hydrateMatchFromPayload(result.demarrerRevanchePenalty);
      setMatch(newMatch);
      sessionStorage.setItem("squid_penalty_match", JSON.stringify(newMatch));
      setCountdown(5);
      setShowVictoryBadge(false);
      setRematchRequested(false);
      setRematchAccepted(false);
    } catch (error: any) {
      setError(error?.message || "Impossible de démarrer la revanche");
      setRematchAccepted(false);
    }
  };

  const handleRefuseRematch = () => {
    setRematchRequested(false);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "rematch_refused",
      }));
    }
  };

  const handlePublishVictory = async () => {
    if (!match) return;
    setPublishingVictory(true);
    try {
      const winner = match.scoreHote > match.scoreInvite ? match.joueurHotePseudo : match.joueurInvitePseudo;
      const loser = match.scoreHote > match.scoreInvite ? match.joueurInvitePseudo : match.joueurHotePseudo;
      await api.publier(`⚽ ${winner} a gagné un duel de tir au but contre ${loser} ! Score final : ${match.scoreHote} - ${match.scoreInvite}`);
      setShowVictoryBadge(false);
    } catch (error: any) {
      setError(error?.message || "Impossible de publier la victoire");
    } finally {
      setPublishingVictory(false);
    }
  };

  async function playShot(direction: Direction) {
    if (!match || roundLocked) return;
    setLoading(true);
    setError(null);
    setCurrentDirection(direction);
    setRoundLocked(true);
    try {
      const result = await api.jouerTirPenalty(match.id, direction);
      const nextMatch = hydrateMatchFromPayload(result.jouerTirPenalty);
      setMatch(nextMatch);
      sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch));
      setRoundLocked(false);
      setCurrentDirection(null);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("introuvable") || msg.includes("not found") || msg.includes("Partie")) {
        try {
          const res = await api.mesMatchsPenalty();
          const fallback = (res.mesMatchsPenalty ?? []).find((item) => item.statut === "en_cours");
          if (fallback) {
            const hydrated = hydrateMatchFromPayload(fallback);
            setMatch(hydrated);
            sessionStorage.setItem("squid_penalty_match", JSON.stringify(hydrated));
            setError(null);
            setRoundLocked(false);
            return;
          }
        } catch {
          // ignore recovery failure
        }
      }
      setError(err?.message ?? "Impossible d'envoyer le tir.");
      setRoundLocked(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] min-h-screen">
      <div className="shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#002244] border-b border-white/10 shadow-lg">
          <button onClick={() => onNavigate?.("penaltyKick")} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors">
            <span>←</span>
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Duel Tir au but</span>
          </div>
          <button onClick={quitMatch} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition-colors">
            <span>✕</span>
            <span className="hidden sm:inline">Quitter</span>
          </button>
        </div>
        
        {match && match.joueurHotePseudo && match.joueurInvitePseudo && (
          <div className="bg-gradient-to-r from-[#FF6B35]/20 to-[#FFD700]/20 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFD700] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {match.joueurHotePseudo[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{match.joueurHotePseudo}</p>
                  <p className="text-white/60 text-xs">{meIsHost ? "Vous" : "Adversaire"}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-3xl font-black text-white drop-shadow-lg">
                  {match.scoreHote} - {match.scoreInvite}
                </div>
                <p className="text-xs text-white/60 uppercase tracking-wider">Score</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{match.joueurInvitePseudo}</p>
                  <p className="text-white/60 text-xs">{!meIsHost ? "Vous" : "Adversaire"}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#8BC34A] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {match.joueurInvitePseudo[0]?.toUpperCase() || "?"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!match ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/60">Chargement du duel…</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Badge variant={match.statut === "termine" ? "won" : "playing"} className="text-xs font-bold px-4 py-2 shadow-lg">
                {statusText}
              </Badge>
              {meIsSpectator && (
                <Badge variant="live" className="text-xs font-bold px-4 py-2 shadow-lg">
                  👁️ Spectateur
                </Badge>
              )}
            </div>

            {countdown !== null && (
              <div className="rounded-3xl border-2 border-[#FF6B35] bg-gradient-to-br from-[#FF6B35]/20 to-[#FFD700]/20 backdrop-blur-sm p-8 text-center shadow-2xl">
                <p className="text-sm font-semibold text-[#FF6B35] mb-2 uppercase tracking-wider">Le duel commence dans</p>
                <p className="text-7xl font-black text-[#FF6B35] drop-shadow-lg animate-pulse">{countdown}</p>
              </div>
            )}

            {winnerLabel && (
              <div className="rounded-3xl border-2 border-[#4CAF50] bg-gradient-to-br from-[#4CAF50]/20 to-[#8BC34A]/20 backdrop-blur-sm p-6 text-center shadow-2xl">
                <div className="text-5xl mb-3">⚽</div>
                <p className="text-lg font-bold text-[#4CAF50]">{winnerLabel}</p>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse"></div>
                <p className="text-xs uppercase tracking-wider text-white/60">Résultat du tir</p>
              </div>
              <p className="text-lg font-semibold text-white">{roundResultLabel}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {DIRECTIONS.map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => void playShot(direction)}
                  disabled={loading || roundLocked || match.statut === "termine" || countdown !== null || meIsSpectator}
                  className={`relative group rounded-3xl border-2 p-6 text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                    currentDirection === direction 
                      ? "border-[#4CAF50] bg-gradient-to-br from-[#4CAF50]/30 to-[#8BC34A]/30 shadow-[0_0_30px_rgba(76,175,80,0.5)]" 
                      : "border-white/20 bg-gradient-to-br from-white/10 to-white/5 hover:border-[#FF6B35] hover:shadow-[0_0_30px_rgba(255,107,53,0.3)]"
                  } ${loading || roundLocked || match.statut === "termine" || countdown !== null || meIsSpectator ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {direction === "gauche" ? "⬅️" : direction === "centre" ? "⬆️" : "➡️"}
                  </div>
                  <div className="text-sm font-bold capitalize text-white drop-shadow-md">
                    {direction}
                  </div>
                  {currentDirection === direction && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#4CAF50] rounded-full flex items-center justify-center text-white text-xs shadow-lg">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#FFD700]"></div>
                <p className="text-xs uppercase tracking-wider text-white/60">Informations du duel</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/60 mb-1">Score actuel</p>
                  <p className="text-2xl font-bold text-white">{match.scoreHote} - {match.scoreInvite}</p>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/60 mb-1">Score cible</p>
                  <p className="text-2xl font-bold text-white">{match.scoreCible}</p>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-white/80">
                  {meIsSpectator ? "👁️ Vous regardez ce duel en tant que spectateur" : meIsHost ? "🎯 Vous êtes l'hôte du défi" : "🎯 Vous êtes l'invité du défi"}
                </p>
              </div>
            </div>

            {showVictoryBadge && match.statut === "termine" && !meIsSpectator && (
              <div className="rounded-3xl border-2 border-[#FFD700] bg-gradient-to-br from-[#FFD700]/20 to-[#FF6B35]/20 backdrop-blur-sm p-8 shadow-2xl">
                <div className="text-center">
                  <div className="mb-6">
                    <span className="text-6xl animate-bounce">🏆</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Félicitations !</h3>
                  <p className="text-sm text-white/80 mb-6">
                    {match.scoreHote > match.scoreInvite ? match.joueurHotePseudo : match.joueurInvitePseudo} a remporté le duel !
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => onNavigate?.("penaltyKick")}
                      className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Quitter la partie
                    </Button>
                    
                    {iAmLoser && !rematchRequested && (
                      <Button 
                        onClick={handleRequestRematch}
                        className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FFD700] text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
                        disabled={rematchRequested}
                      >
                        Demander une revanche
                      </Button>
                    )}
                    
                    {iAmWinner && rematchRequested && !rematchAccepted && (
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleAcceptRematch}
                          className="flex-1 bg-gradient-to-r from-[#4CAF50] to-[#8BC34A] text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
                        >
                          Accepter la revanche
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleRefuseRematch}
                          className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          Refuser
                        </Button>
                      </div>
                    )}
                    
                    {rematchAccepted && (
                      <div className="p-4 rounded-2xl bg-[#4CAF50]/20 border border-[#4CAF50]/50 text-center">
                        <p className="text-sm font-semibold text-[#4CAF50]">✓ Revanche acceptée ! Nouveau duel qui commence...</p>
                      </div>
                    )}
                    
                    {iAmWinner && (
                      <Button 
                        onClick={handlePublishVictory}
                        disabled={publishingVictory}
                        className="w-full bg-gradient-to-r from-[#9C27B0] to-[#E91E63] text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
                      >
                        {publishingVictory ? "Publication..." : "📢 Publier la victoire"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
