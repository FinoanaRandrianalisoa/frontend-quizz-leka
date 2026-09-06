import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Users } from "lucide-react";
import { Button, Card, CardContent } from "../components/ui";
import { api } from "../lib/api";
import { quizGlobalApi, type QuizGlobalState } from "../lib/quizGlobalApi";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/hooks";
import UserName from "../components/UserName";
import type { NavigateFn } from "../App";
import usePageTitle from "@/lib/usePageTitle";

const TARGETS = [4, 8, 12] as const;
const LETTERS = ["A", "B", "C", "D"] as const;

function remainingSeconds(deadline?: string | null, serverOffset = 0) {
  if (!deadline) return 0;
  const dead = new Date(deadline).getTime();
  return Math.max(0, Math.ceil((dead - (Date.now() - serverOffset)) / 1000));
}

function withServerOffset(state: QuizGlobalState): QuizGlobalState {
  if (!state.serverTime) return state;
  return { ...state, serverOffset: Date.now() - new Date(state.serverTime).getTime() };
}

export default function QuizGlobalPage({ onNavigate, matchId }: { onNavigate: NavigateFn; matchId?: number | null }) {
  usePageTitle("Quizz global");
  const { user } = useAuth();
  const [target, setTarget] = useState<(typeof TARGETS)[number]>(8);
  const [players, setPlayers] = useState<Array<{ id: string; pseudo: string; enLigne?: boolean }>>([]);
  const [pendingInvites, setPendingInvites] = useState<Record<string, number>>({});
  const [waiting, setWaiting] = useState<QuizGlobalState[]>([]);
  const [game, setGame] = useState<QuizGlobalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [ackStatus, setAckStatus] = useState<string | null>(null);
  const [myPick, setMyPick] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    void api.utilisateurs().then((res) => {
      setPlayers((res.utilisateurs ?? []).filter((p) => p.id !== user?.id));
    }).catch(() => setPlayers([]));
  }, [user?.id]);

  const reloadLobbies = async () => {
    try {
      const [open, mine] = await Promise.all([quizGlobalApi.disponibles(), quizGlobalApi.mesParties()]);
      setWaiting(open.partiesQuizGlobalDisponibles ?? []);
      const mineList = mine.mesPartiesQuizGlobal ?? [];
      const myPending = mineList.filter(
        (g) => g.status === "WAITING" && g.invitedPlayer?.id && g.playerA?.id === user?.id,
      );
      setPendingInvites(Object.fromEntries(myPending.map((g) => [String(g.invitedPlayer?.id), g.gameId])));
      const active = mineList.find((g) => g.status !== "WAITING" || g.playerA?.id === user?.id);
      if (!game && (matchId || active)) {
        const id = matchId || active?.gameId;
        if (id) {
          const res = await quizGlobalApi.get(Number(id));
          setGame(withServerOffset(res.partieQuizGlobal));
        }
      }
    } catch {
      setWaiting([]);
    }
  };

  useEffect(() => {
    void reloadLobbies();
    const id = setInterval(() => void reloadLobbies(), 4000);
    return () => clearInterval(id);
  }, [matchId, user?.id]);

  useEffect(() => {
    if (!matchId) return;
    void quizGlobalApi.get(matchId).then((res) => setGame(withServerOffset(res.partieQuizGlobal))).catch((err) => setError(errMsg(err)));
  }, [matchId]);

  useEffect(() => {
    if (!game?.gameId) return;
    const token = localStorage.getItem("access_token") || "";
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || "https://quizz-leka.onrender.com";
    const wsBase = (import.meta.env.VITE_WS_URL as string | undefined) || apiBase.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/ws/quiz-global/${game.gameId}/?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "ERROR") {
          setError(data.message || "Action refusée.");
          return;
        }
        if (data.event === "PLAYER_ANSWER_ACK") {
          setAckStatus(data.status);
          return;
        }
        if (data.gameId) {
          setGame(withServerOffset(data));
          setError(null);
          if (data.status !== "ANSWERING") {
            setAckStatus(null);
            setMyPick(null);
          }
        }
      } catch {
        // ignore
      }
    };
    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [game?.gameId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!game?.gameId || !game.phaseDeadline) return;
    if (remainingSeconds(game.phaseDeadline, game.serverOffset) > 0) return;
    void quizGlobalApi.avancer(game.gameId).then((res) => {
      setGame(withServerOffset(res.avancerPhaseQuizGlobal));
      if (res.avancerPhaseQuizGlobal.status !== "ANSWERING") {
        setAckStatus(null);
        setMyPick(null);
      }
    }).catch(() => undefined);
  }, [tick, game?.gameId, game?.phaseDeadline, game?.status]);

  const seconds = remainingSeconds(game?.phaseDeadline, game?.serverOffset);
  const myTurn = game?.mySeat === game?.activeSeat;
  const locked = Boolean(game?.myAnswer) || ackStatus === "INCORRECT" || ackStatus === "RECORDED";

  const createGame = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await quizGlobalApi.creer(target, undefined);
      setGame(withServerOffset(res.creerPartieQuizGlobal));
      onNavigate("quizGlobal", res.creerPartieQuizGlobal.gameId);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (player: { id: string; pseudo: string }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await quizGlobalApi.creer(target, Number(player.id));
      setPendingInvites((prev) => ({ ...prev, [player.id]: res.creerPartieQuizGlobal.gameId }));
      await reloadLobbies();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelInvite = async (playerId: string, gameId: number) => {
    setBusy(true);
    setError(null);
    try {
      await quizGlobalApi.annuler(gameId);
      setPendingInvites((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      await reloadLobbies();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const joinGame = async (id: number) => {
    setBusy(true);
    try {
      const res = await quizGlobalApi.rejoindre(id);
      setGame(withServerOffset(res.rejoindrePartieQuizGlobal));
      onNavigate("quizGlobal", id);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const chooseTheme = async (themeId: number) => {
    if (!game) return;
    setError(null);
    try {
      const res = await quizGlobalApi.choisirTheme(game.gameId, themeId);
      setGame(withServerOffset(res.choisirThemeQuizGlobal));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const answer = async (letter: string) => {
    if (!game?.question || locked) return;
    try {
      const res = await quizGlobalApi.repondre(game.gameId, game.question.id, letter);
      setAckStatus(res.repondreQuizGlobal.status);
      setMyPick(letter);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const winnerName = useMemo(() => {
    if (!game?.winnerId) return null;
    if (game.playerA?.id === game.winnerId) return game.playerA.pseudo;
    if (game.playerB?.id === game.winnerId) return game.playerB.pseudo;
    return "Gagnant";
  }, [game]);

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Globe size={22} className="text-[#16a34a]" /> Quizz global</h1>
            <p className="text-sm text-[#64748b]">Deux joueurs, thèmes alternés, lecture 10s puis réponse 10s, Tie-Break en cas d'égalité.</p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("categories")}>Retour</Button>
        </div>
        {error && <p className="mb-4 text-sm text-[#D62828]">{error}</p>}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold">Créer une partie</h2>
              <p className="text-sm text-[#64748b]">Nombre de questions normales</p>
              <div className="flex gap-2">
                {TARGETS.map((n) => (
                  <Button key={n} variant={target === n ? "default" : "outline"} onClick={() => setTarget(n)}>{n}</Button>
                ))}
              </div>
              <Button loading={busy} onClick={() => void createGame()}>Créer un salon ouvert</Button>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">
                  Joueurs en ligne — envoyez une invitation
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {players.filter((p) => p.enLigne).length === 0 && (
                    <p className="text-sm text-[#64748b]">Aucun joueur en ligne.</p>
                  )}
                  {players.filter((p) => p.enLigne).map((p) => {
                    const pendingGameId = pendingInvites[p.id];
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#e6f4ea] p-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                          <UserName user={p} />
                        </span>
                        {pendingGameId ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void cancelInvite(p.id, pendingGameId)}>
                            Annuler
                          </Button>
                        ) : (
                          <Button size="sm" variant="default" disabled={busy} onClick={() => void sendInvite(p)}>
                            Envoyer
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Users size={16} /> Parties en attente</h2>
              {waiting.length === 0 && <p className="text-sm text-[#64748b]">Aucune partie disponible.</p>}
              {waiting.map((g) => (
                <div key={g.gameId} className="flex items-center justify-between rounded-xl border border-[#e6f4ea] p-3">
                  <div>
                    <p className="text-sm font-semibold">{g.playerA?.pseudo} attend un adversaire</p>
                    <p className="text-xs text-[#64748b]">{g.targetQuestions} questions</p>
                  </div>
                  <Button size="sm" disabled={busy || g.playerA?.id === user?.id} onClick={() => void joinGame(g.gameId)}>Rejoindre</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Quizz global</h1>
          <p className="text-sm text-[#64748b]">
            {game.playerA?.pseudo ?? "A"} {game.playerA?.score ?? 0} — {game.playerB?.score ?? 0} {game.playerB?.pseudo ?? "en attente"}
            {" · "}Tour {game.currentTurn}/{game.targetQuestions}{game.question?.isTieBreak ? " · Tie-Break" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => { setGame(null); onNavigate("categories"); }}>Quitter</Button>
      </div>
      {error && <p className="mb-4 text-sm text-[#D62828]">{error}</p>}

      {game.status === "WAITING" && (
        <Card><CardContent><p>En attente d'un adversaire… Partagez la partie ou attendez qu'un joueur rejoigne le salon.</p></CardContent></Card>
      )}

      {game.status === "THEME_SELECTION" && (
        <Card>
          <CardContent>
            <p className="mb-4 text-sm">
              {myTurn ? "C'est à vous de choisir le thème." : `${game.activeSeat === "A" ? game.playerA?.pseudo : game.playerB?.pseudo} choisit le thème.`}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {game.themes.map((theme) => (
                <button
                  key={theme.id}
                  disabled={!myTurn || !theme.selectable}
                  onClick={() => void chooseTheme(theme.id)}
                  className="text-left rounded-xl border border-[#e6f4ea] p-4 hover:shadow-md disabled:opacity-40"
                >
                  <p className="font-semibold">{theme.nom}</p>
                  <p className="text-xs text-[#64748b]">{theme.remaining} questions disponibles</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {game.status === "QUESTION_READING" && game.question && (
        <Card>
          <CardContent className="text-center space-y-4 py-10">
            <p className="text-sm font-semibold text-[#16a34a]">🇲🇬 {game.question.theme}</p>
            <p className="text-2xl font-bold">{game.question.question}</p>
            <p className="text-5xl font-black tabular-nums">{seconds}</p>
            <p className="text-sm text-[#64748b]">Les réponses arrivent bientôt…</p>
          </CardContent>
        </Card>
      )}

      {game.status === "ANSWERING" && game.question?.options && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#16a34a]">🇲🇬 {game.question.theme}</p>
              <p className="text-3xl font-black tabular-nums">{seconds}</p>
            </div>
            <p className="text-xl font-bold">{game.question.question}</p>
            {(ackStatus === "INCORRECT" || game.myAnswer?.status === "INCORRECT") && (
              <div className="rounded-xl bg-[#fef2f2] text-[#D62828] p-3 text-sm">
                Mauvaise réponse. Vous êtes bloqué pour cette question. Attendez le prochain tour.
              </div>
            )}
            {ackStatus === "RECORDED" && game.myAnswer?.status !== "INCORRECT" && (
              <div className="rounded-xl bg-[#f1faf5] text-[#166534] p-3 text-sm">Réponse enregistrée</div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  disabled={locked}
                  onClick={() => void answer(letter)}
                  className={`rounded-xl border p-4 text-left ${(game.myAnswer?.selectedOption ?? myPick) === letter ? "border-[#16a34a]" : "border-[#e6f4ea]"} disabled:opacity-60`}
                >
                  <span className="font-bold mr-2">{letter}.</span>
                  {game.question?.options?.[letter]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(game.status === "QUESTION_FINISHED" || game.status === "FINISHED") && game.question && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-semibold text-[#16a34a]">
              Bonne réponse : {game.question.correctOption}. {game.question.correctText}
            </p>
            {(game.results ?? []).map((r) => {
              const letter = r.selectedOption;
              const optText = letter ? (game.question?.options as Record<string, string> | undefined)?.[letter] : null;
              return (
                <div
                  key={r.seat}
                  className={`flex items-center justify-between rounded-xl border p-3 ${r.isCorrect ? "border-[#16a34a] bg-[#f1faf5]" : "border-[#fecaca] bg-[#fef2f2]"}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{r.pseudo}</p>
                    <p className="text-xs text-[#64748b]">
                      {r.selectedOption ? `a choisi ${r.selectedOption}. ${optText ?? ""}` : "n'a pas répondu"}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{r.isCorrect ? "✅ +1" : "❌ +0"}</p>
                </div>
              );
            })}
            <p className="font-semibold">Score : {game.playerA?.pseudo} {game.playerA?.score} — {game.playerB?.score} {game.playerB?.pseudo}</p>
            {game.status === "FINISHED" && (
              <p className="text-lg font-bold">{winnerName ? <>🏆 {winnerName} gagne</> : <>🤝 Égalité</>}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
