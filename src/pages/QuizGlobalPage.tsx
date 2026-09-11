import { useEffect, useMemo, useRef, useState } from "react"
import {
  Globe,
  Users,
  MessageCircle,
  X,
  Repeat,
  AlertTriangle,
} from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "../components/ui"
import { api } from "../lib/api"
import { quizGlobalApi, type QuizGlobalState } from "../lib/quizGlobalApi"
import { GraphqlError } from "../lib/graphql"
import { useAuth } from "../lib/auth"
import { errMsg } from "../lib/hooks"
import UserName from "../components/UserName"
import QuizTimer from "../components/game/QuizTimer"
import ChatPanel from "../components/chat/ChatPanel"
import type { NavigateFn } from "../App"
import usePageTitle from "@/lib/usePageTitle"
import { BACKEND_URL, GRAPHQL_URL, WS_URL } from "@/config/backend"

const TARGETS = [4, 8, 12] as const
const LETTERS = ["A", "B", "C", "D"] as const
const WAITING_EXPIRY_MS = 30 * 60 * 1000

function remainingSeconds(deadline?: string | null, serverOffset = 0) {
  if (!deadline) return 0
  const dead = new Date(deadline).getTime()
  return Math.max(0, Math.ceil((dead - (Date.now() - serverOffset)) / 1000))
}

function waitingLeftSeconds(game: QuizGlobalState | null) {
  if (game?.status !== "WAITING" || !game.createdAt) return null
  const exp = new Date(game.createdAt).getTime() + WAITING_EXPIRY_MS
  return Math.max(
    0,
    Math.ceil((exp - (Date.now() - (game.serverOffset ?? 0))) / 1000),
  )
}

function phaseDuration(state: QuizGlobalState | null) {
  if (!state?.phaseDeadline || !state.phaseStartedAt) return null
  const start = new Date(state.phaseStartedAt).getTime()
  const dead = new Date(state.phaseDeadline).getTime()
  return Math.max(1, Math.round((dead - start) / 1000))
}

function withServerOffset(state: QuizGlobalState): QuizGlobalState {
  if (!state.serverTime) return state
  return {
    ...state,
    serverOffset: Date.now() - new Date(state.serverTime).getTime(),
  }
}

export default function QuizGlobalPage({
  onNavigate,
  matchId,
}: {
  onNavigate: NavigateFn
  matchId?: number | null
}) {
  usePageTitle("Quizz global")
  const { user } = useAuth()
  const [target, setTarget] = useState<typeof TARGETS[number]>(8)
  const [players, setPlayers] = useState<Array<{
    id: string
    pseudo: string
    enLigne?: boolean
  }>>([])
  const [pendingInvites, setPendingInvites] = useState<Record<string, number>>(
    {},
  )
  const [waiting, setWaiting] = useState<QuizGlobalState[]>([])
  const [myActiveGames, setMyActiveGames] = useState<QuizGlobalState[]>([])
  const [blockedDialog, setBlockedDialog] = useState(false)
  const [game, setGame] = useState<QuizGlobalState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const [ackStatus, setAckStatus] = useState<string | null>(null)
  const [myPick, setMyPick] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [tieBreakIntro, setTieBreakIntro] = useState(false)
  const [mise, setMise] = useState<string>("")
  const [wallet, setWallet] = useState<{
    soldeRecharge: string
    portefeuilleDeverrouille: boolean
  } | null>(null)
  const [lastThemeChoice, setLastThemeChoice] = useState<{
    theme: string
    seat: string
  } | null>(null)
  const [confirmQuitOpen, setConfirmQuitOpen] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const tieBreakShownRef = useRef(false)
  const exitedGameIdsRef = useRef<Set<number>>(
    new Set(
      (() => {
        try {
          return JSON.parse(
            sessionStorage.getItem("quiz_global_exited") ?? "[]",
          ) as number[]
        } catch {
          return []
        }
      })(),
    ),
  )

  const persistExited = (ids: Set<number>) => {
    try {
      sessionStorage.setItem("quiz_global_exited", JSON.stringify([...ids]))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (
      game?.question?.isTieBreak &&
      game.status === "QUESTION_READING" &&
      !tieBreakShownRef.current
    ) {
      tieBreakShownRef.current = true
      setTieBreakIntro(true)
      const t = setTimeout(() => setTieBreakIntro(false), 2600)
      return () => clearTimeout(t)
    }
    if (game?.status === "WAITING" || game?.status === "THEME_SELECTION") {
      tieBreakShownRef.current = false
    }
  }, [game?.status, game?.question?.id])

  useEffect(() => {
    void api
      .utilisateurs()
      .then((res) => {
        setPlayers((res.utilisateurs ?? []).filter((p) => p.id !== user?.id))
      })
      .catch(() => setPlayers([]))
  }, [user?.id])

  useEffect(() => {
    void api
      .monPortefeuille()
      .then((res) => setWallet(res.monPortefeuille))
      .catch(() => undefined)
  }, [user?.id])

  const reloadLobbies = async () => {
    try {
      const [open, mine, active] = await Promise.all([
        quizGlobalApi.disponibles(),
        quizGlobalApi.mesParties(),
        quizGlobalApi.myActiveGame(),
      ])
      setWaiting(open.partiesQuizGlobalDisponibles ?? [])
      const mineList = mine.mesPartiesQuizGlobal ?? []
      const myPending = mineList.filter(
        (g) =>
          g.status === "WAITING" &&
          g.invitedPlayer?.id &&
          g.playerA?.id === user?.id,
      )
      setPendingInvites(
        Object.fromEntries(
          myPending.map((g) => [String(g.invitedPlayer?.id), g.gameId]),
        ),
      )
      // Partie réellement active (unique). Une partie FINISHED/CANCELLED/EXPIRED/ABANDONED
      // n'apparaît jamais ici et ne doit jamais bloquer le joueur.
      setMyActiveGames(active.myActiveGame ? [active.myActiveGame] : [])
      // Charger automatiquement seulement si matchId est fourni explicitement (navigation directe)
      if (matchId) {
        const res = await quizGlobalApi.get(Number(matchId))
        setGame(withServerOffset(res.partieQuizGlobal))
      }
    } catch {
      setWaiting([])
    }
  }

  useEffect(() => {
    void reloadLobbies()
    const id = setInterval(() => void reloadLobbies(), 4000)
    return () => clearInterval(id)
  }, [matchId, user?.id])

  useEffect(() => {
    if (!matchId) return
    void quizGlobalApi
      .get(matchId)
      .then((res) => setGame(withServerOffset(res.partieQuizGlobal)))
      .catch(() => {
        // Ancienne partie expirée/supprimée → on repart sur le lobby proprement.
        setGame(null)
        setError(null)
      })
  }, [matchId])

  useEffect(() => {
    if (!game?.gameId) return
    const token = localStorage.getItem("access_token") || ""
    const apiBase = GRAPHQL_URL
    const apiRoot = BACKEND_URL
    const wsBase = WS_URL
    const wsUrl = `${wsBase}/ws/quiz-global/${game.gameId}/?token=${encodeURIComponent(token)}`
    console.log("Connecting to Quiz Global WebSocket:", wsUrl)
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log("Quiz Global WebSocket connected for game:", game.gameId)
    }

    ws.onerror = (error) => {
      console.error("Quiz Global WebSocket error:", error)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("Quiz Global WebSocket message received:", data)
        if (data.event === "ERROR") {
          setError(data.message || "Action refusée.")
          return
        }
        if (data.event === "PLAYER_ANSWER_ACK") {
          setAckStatus(data.status)
          return
        }
        if (data.event === "THEME_SELECTED") {
          setLastThemeChoice({
            theme: data.chosenTheme,
            seat: data.chosenBySeat,
          })
        }
        if (data.gameId) {
          console.log("Updating game state, new status:", data.status)
          setGame(withServerOffset(data))
          setError(null)
          if (data.status !== "ANSWERING") {
            setAckStatus(null)
            setMyPick(null)
          }
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err)
        // ignore
      }
    }
    return () => {
      ws.close()
      socketRef.current = null
    }
  }, [game?.gameId])

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!game?.gameId || !game.phaseDeadline) return
    if (remainingSeconds(game.phaseDeadline, game.serverOffset) > 0) return
    void quizGlobalApi
      .avancer(game.gameId)
      .then((res) => {
        setGame(withServerOffset(res.avancerPhaseQuizGlobal))
        if (res.avancerPhaseQuizGlobal.status !== "ANSWERING") {
          setAckStatus(null)
          setMyPick(null)
        }
      })
      .catch(() => undefined)
  }, [tick, game?.gameId, game?.phaseDeadline, game?.status])

  const seconds = remainingSeconds(game?.phaseDeadline, game?.serverOffset)
  const myTurn = game?.mySeat === game?.activeSeat
  const locked =
    Boolean(game?.myAnswer) ||
    ackStatus === "INCORRECT" ||
    ackStatus === "RECORDED"

  const miseValue = (): number => {
    const n = parseFloat(mise || "0")
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  const cancelMyGame = async (gameId: number) => {
    setBusy(true)
    setError(null)
    try {
      await quizGlobalApi.annuler(gameId)
      setBlockedDialog(false)
      await reloadLobbies()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const handleJoinBlockedError = (err: unknown) => {
    if (err instanceof GraphqlError && err.code === "PLAYER_ALREADY_IN_GAME") {
      setBlockedDialog(true)
      return
    }
    setError(errMsg(err))
  }

  const createGame = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await quizGlobalApi.creer(target, undefined, miseValue())
      setGame(withServerOffset(res.creerPartieQuizGlobal))
      onNavigate("quizGlobal", res.creerPartieQuizGlobal.gameId)
    } catch (err) {
      handleJoinBlockedError(err)
    } finally {
      setBusy(false)
    }
  }

  const sendInvite = async (player: { id: string pseudo: string }) => {
    setBusy(true)
    setError(null)
    try {
      const res = await quizGlobalApi.creer(
        target,
        Number(player.id),
        miseValue(),
      )
      setPendingInvites((prev) => ({
        ...prev,
        [player.id]: res.creerPartieQuizGlobal.gameId,
      }))
      await reloadLobbies()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const cancelInvite = async (playerId: string, gameId: number) => {
    setBusy(true)
    setError(null)
    try {
      await quizGlobalApi.annuler(gameId)
      setPendingInvites((prev) => {
        const next = { ...prev }
        delete next[playerId]
        return next
      })
      await reloadLobbies()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const joinGame = async (id: number) => {
    setBusy(true)
    try {
      const res = await quizGlobalApi.rejoindre(id, miseValue())
      exitedGameIdsRef.current.delete(id)
      persistExited(exitedGameIdsRef.current)
      setGame(withServerOffset(res.rejoindrePartieQuizGlobal))
      onNavigate("quizGlobal", id)
    } catch (err) {
      handleJoinBlockedError(err)
    } finally {
      setBusy(false)
    }
  }

  const chooseTheme = async (themeId: number) => {
    if (!game) return
    setError(null)
    try {
      const res = await quizGlobalApi.choisirTheme(game.gameId, themeId)
      setGame(withServerOffset(res.choisirThemeQuizGlobal))
    } catch (err) {
      setError(errMsg(err))
    }
  }

  const answer = async (letter: string) => {
    if (!game?.question || locked) return
    try {
      const res = await quizGlobalApi.repondre(
        game.gameId,
        game.question.id,
        letter,
      )
      setAckStatus(res.repondreQuizGlobal.status)
      setMyPick(letter)
    } catch (err) {
      setError(errMsg(err))
    }
  }

  const winnerName = useMemo(() => {
    if (!game?.winnerId) return null
    if (game.playerA?.id === game.winnerId) return game.playerA.pseudo
    if (game.playerB?.id === game.winnerId) return game.playerB.pseudo
    return "Gagnant"
  }, [game])

  const startRematch = async () => {
    if (!game) return
    setBusy(true)
    setError(null)
    try {
      const res = await quizGlobalApi.revanche(game.gameId)
      const next = withServerOffset(res.revanchePartieQuizGlobal)
      exitedGameIdsRef.current.delete(game.gameId)
      setGame(next)
      onNavigate("quizGlobal", next.gameId)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmQuit = () => {
    if (!game) return
    const leaving = game
    setConfirmQuitOpen(false)
    exitedGameIdsRef.current.add(leaving.gameId)
    persistExited(exitedGameIdsRef.current)

    // Annuler le salon si c'est l'hôte et que le statut est "WAITING"
    if (
      leaving.status === "WAITING" &&
      user?.id &&
      leaving.playerA?.id === user.id
    ) {
      void quizGlobalApi.annuler(leaving.gameId).catch(() => undefined)
    }

    // Fermer le WebSocket proprement
    if (socketRef.current) {
      try {
        socketRef.current.close()
      } catch {
        // ignore
      }
      socketRef.current = null
    }

    // Nettoyer l'état
    setGame(null)
    setChatOpen(false)
    setError(null)
    setAckStatus(null)
    setMyPick(null)
    setLastThemeChoice(null)

    // Naviguer vers les catégories sans matchId
    onNavigate("categories", null)
  }

  const quitInProgress =
    game &&
    game.status !== "FINISHED" &&
    [
      "WAITING",
      "THEME_SELECTION",
      "QUESTION_READING",
      "ANSWERING",
      "QUESTION_FINISHED",
      "TIE_BREAK_THEME",
    ].includes(game.status)

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe size={22} className="text-[#16a34a]" /> Quizz global
            </h1>
            <p className="text-sm text-[#64748b]">
              Deux joueurs, thèmes alternés, lecture 10s puis réponse 10s,
              Tie-Break en cas d'égalité.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate("categories", null)}
          >
            Retour
          </Button>
        </div>
        {error && <p className="mb-4 text-sm text-[#D62828]">{error}</p>}
        {myActiveGames.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle size={16} /> Vous avez déjà une partie active.
            </p>
            <p className="mt-1 mb-3 text-xs text-amber-700">
              Annulez la partie en attente ou reprenez la partie en cours pour
              pouvoir en créer une autre.
            </p>
            <div className="space-y-2">
              {myActiveGames.map((g) => {
                const isHost = g.playerA?.id === user?.id
                const cancelable = g.status === "WAITING" && isHost
                return (
                  <div
                    key={g.gameId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-2"
                  >
                    <div className="text-sm min-w-0">
                      <p className="font-medium truncate">
                        Partie #{g.gameId}
                        {g.status === "WAITING"
                          ? g.invitedPlayer
                            ? ` — en attente de ${g.invitedPlayer.pseudo}`
                            : " — en attente d'adversaire"
                          : g.playerB
                            ? ` — ${g.playerA?.pseudo} vs ${g.playerB?.pseudo}`
                            : ""}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        Statut : {g.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate("quizGlobal", g.gameId)}
                      >
                        Reprendre
                      </Button>
                      {cancelable && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void cancelMyGame(g.gameId)}
                        >
                          Annuler la partie
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold">Créer une partie</h2>
              <p className="text-sm text-[#64748b]">
                Nombre de questions normales
              </p>
              <div className="flex gap-2">
                {TARGETS.map((n) => (
                  <Button
                    key={n}
                    variant={target === n ? "default" : "outline"}
                    onClick={() => setTarget(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">
                  Montant de la mise — pari (Ar)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={mise}
                    onChange={(e) => setMise(e.target.value)}
                    placeholder="0 = sans pari"
                    className="w-full rounded-lg border border-[#d9e7dd] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                  />
                </div>
                <p className="mt-1 text-xs text-[#64748b]">
                  Solde disponible :{" "}
                  {wallet
                    ? `${Number(wallet.soldeRecharge).toLocaleString("fr-MG")} Ar`
                    : "…"}
                </p>
              </div>
              <Button loading={busy} onClick={() => void createGame()}>
                Créer un salon ouvert
              </Button>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">
                  Joueurs en ligne — envoyez une invitation
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {players.filter((p) => p.enLigne).length === 0 && (
                    <p className="text-sm text-[#64748b]">
                      Aucun joueur en ligne.
                    </p>
                  )}
                  {players
                    .filter((p) => p.enLigne)
                    .map((p) => {
                      const pendingGameId = pendingInvites[p.id]
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-[#e6f4ea] p-2"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                            <UserName user={p} />
                          </span>
                          {pendingGameId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void cancelInvite(p.id, pendingGameId)
                              }
                            >
                              Annuler
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={busy}
                              onClick={() => void sendInvite(p)}
                            >
                              Envoyer
                            </Button>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Users size={16} /> Parties en attente
              </h2>
              {waiting.length === 0 && (
                <p className="text-sm text-[#64748b]">
                  Aucune partie disponible.
                </p>
              )}
              {waiting.map((g) => (
                <div
                  key={g.gameId}
                  className="flex items-center justify-between rounded-xl border border-[#e6f4ea] p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {g.playerA?.pseudo} attend un adversaire
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {g.targetQuestions} questions
                    </p>
                    {Number(g.mise) > 0 && (
                      <p className="text-xs font-semibold text-[#166534]">
                        Mise : {Number(g.mise).toLocaleString("fr-MG")} Ar
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {Number(g.mise) > 0 && (
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="votre mise"
                        value={mise}
                        onChange={(e) => setMise(e.target.value)}
                        className="w-32 rounded-lg border border-[#d9e7dd] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                      />
                    )}
                    <Button
                      size="sm"
                      disabled={busy || g.playerA?.id === user?.id}
                      onClick={() => void joinGame(g.gameId)}
                    >
                      Rejoindre
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const phaseLen = phaseDuration(game) ?? 10

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex gap-6 items-start">
      <div className="flex-1 min-w-0 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe size={20} className="text-[#16a34a]" /> Quizz global
            </h1>
            <p className="text-sm text-[#64748b]">
              {game.playerA?.pseudo ?? "A"} {game.playerA?.score ?? 0} —{" "}
              {game.playerB?.score ?? 0} {game.playerB?.pseudo ?? "en attente"}
              {" · "}Tour {game.currentTurn}/{game.targetQuestions}
              {game.question?.isTieBreak ? " · ⚡ Tie-Break" : ""}
              {Number(game.mise) > 0
                ? ` · 💰 Mise ${Number(game.mise).toLocaleString("fr-MG")} Ar`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="lg:hidden gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle size={16} /> Chat
            </Button>
            <Button variant="outline" onClick={() => setConfirmQuitOpen(true)}>
              Quitter
            </Button>
          </div>
        </div>
        {error && <p className="mb-4 text-sm text-[#D62828]">{error}</p>}

        {game.status === "WAITING" && (
          <Card>
            <CardContent className="space-y-3">
              <p>
                En attente d'un adversaire… Partagez la partie ou attendez qu'un
                joueur rejoigne le salon.
              </p>
              {(() => {
                const left = waitingLeftSeconds(game)
                if (left == null || left <= 0) return null
                return (
                  <p className="text-xs text-[#64748b]">
                    Annulation automatique dans {Math.floor(left / 60)} min{" "}
                    {left % 60} s si personne ne rejoint.
                  </p>
                )
              })()}
              {game.playerA?.id === user?.id && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => void cancelMyGame(game.gameId)}
                  >
                    Annuler la partie
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {game.status === "CANCELLED" && (
          <Card>
            <CardContent className="space-y-3">
              <p>
                Cette partie a été annulée : aucun adversaire ne l'a rejointe
                dans les temps.
              </p>
              <Button onClick={() => onNavigate("categories", null)}>
                Retour au lobby
              </Button>
            </CardContent>
          </Card>
        )}

        {game.status === "THEME_SELECTION" && (
          <Card>
            <CardContent>
              <p className="mb-4 text-sm">
                {myTurn
                  ? "C'est à vous de choisir le thème."
                  : `${
                      game.activeSeat === "A"
                        ? game.playerA?.pseudo
                        : game.playerB?.pseudo
                    } choisit le thème.`}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {game.themes.map((theme) => (
                  <button
                    key={theme.id}
                    disabled={!myTurn || !theme.selectable}
                    onClick={() => void chooseTheme(theme.id)}
                    className="group text-left rounded-xl border border-[#e6f4ea] p-4 transition-all duration-200 hover:border-[#16a34a] hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:border-[#e6f4ea] disabled:hover:shadow-none disabled:hover:translate-y-0"
                  >
                    <p className="font-semibold flex items-center gap-2">
                      <span className="inline-block size-2 rounded-full bg-transparent group-hover:bg-[#16a34a] transition-colors" />
                      {theme.nom}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {theme.remaining} questions disponibles
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {game.status === "QUESTION_READING" && game.question && (
          <Card>
            <CardContent className="text-center space-y-5 py-10">
              {game.question.isTieBreak && tieBreakIntro ? (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF8C1A] via-[#D62828] to-[#8B0000] text-white px-6 py-12 animate-fade-in-scale">
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 35%, rgba(255,215,0,0.95) 0%, transparent 55%)",
                    }}
                  />
                  <div className="absolute -top-6 -right-6 text-[120px] leading-none opacity-20 select-none">
                    ⚡
                  </div>
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="text-5xl animate-tie-break">⚡</div>
                    <p className="text-[11px] font-black tracking-[0.35em] text-white/80">
                      MANCHE DÉCISIVE
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-[0.12em] text-grad-gold">
                      TIE-BREAK
                    </h2>
                    <div className="flex items-center gap-1.5 mt-2">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-2.5 w-2.5 rounded-full bg-[#FFD700] animate-live-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/85">
                      La question décisive arrive…
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-5">
                    <div className="hidden sm:block">
                      <QuizTimer
                        duration={phaseLen}
                        remaining={seconds}
                        variant="circular"
                        size="lg"
                      />
                    </div>
                    <div className="sm:hidden w-full max-w-xs">
                      <QuizTimer
                        duration={phaseLen}
                        remaining={seconds}
                        variant="linear"
                      />
                    </div>
                  </div>
                  {lastThemeChoice?.theme &&
                    lastThemeChoice?.theme === game.question.theme && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#f1faf5] border border-[#bbf7d0] px-4 py-1.5 text-xs font-semibold text-[#166534]">
                        <span className="inline-block size-2 rounded-full bg-[#16a34a] animate-live-pulse" />
                        {lastThemeChoice.seat === "A"
                          ? game.playerA?.pseudo
                          : game.playerB?.pseudo}{" "}
                        a choisi le thème « {game.question.theme} »
                      </div>
                    )}
                  <p className="text-sm font-semibold text-[#16a34a]">
                    🇲🇬 {game.question.theme}
                  </p>
                  <p className="text-2xl font-bold">{game.question.question}</p>
                  <p className="text-sm text-[#64748b]">
                    Les réponses arrivent bientôt…
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {game.status === "ANSWERING" && game.question?.options && (
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#16a34a]">
                  🇲🇬 {game.question.theme}
                </p>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block">
                    <QuizTimer
                      duration={phaseLen}
                      remaining={seconds}
                      variant="circular"
                      size="sm"
                    />
                  </div>
                  <div className="sm:hidden w-36">
                    <QuizTimer
                      duration={phaseLen}
                      remaining={seconds}
                      variant="linear"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold">{game.question.question}</p>
              {(ackStatus === "INCORRECT" ||
                game.myAnswer?.status === "INCORRECT") && (
                <div className="rounded-xl bg-[#fef2f2] text-[#D62828] p-3 text-sm">
                  Mauvaise réponse. Vous êtes bloqué pour cette question.
                  Attendez le prochain tour.
                </div>
              )}
              {ackStatus === "RECORDED" &&
                game.myAnswer?.status !== "INCORRECT" && (
                  <div className="rounded-xl bg-[#f1faf5] text-[#166534] p-3 text-sm">
                    Réponse enregistrée
                  </div>
                )}
              <div className="grid sm:grid-cols-2 gap-3">
                {LETTERS.map((letter) => {
                  const selected =
                    (game.myAnswer?.selectedOption ?? myPick) === letter
                  return (
                    <button
                      key={letter}
                      disabled={locked}
                      onClick={() => void answer(letter)}
                      className={`rounded-xl border p-4 text-left transition-all duration-200 hover:border-[#16a34a] hover:shadow-md hover:-translate-y-0.5 disabled:hover:shadow-none disabled:hover:translate-y-0 ${
                        selected
                          ? "border-[#16a34a] bg-[#f1faf5] shadow-md ring-2 ring-[#16a34a]/30"
                          : "border-[#e6f4ea]"
                      } ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold mr-2">{letter}.</span>
                        <span className="flex-1">
                          {game.question?.options?.[letter]}
                        </span>
                        {selected && (
                          <span className="shrink-0 rounded-full bg-[#16a34a] text-white text-xs font-bold px-2 py-0.5">
                            ✓
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {(game.status === "QUESTION_FINISHED" || game.status === "FINISHED") &&
          game.question && (
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#16a34a]">
                    Bonne réponse : {game.question.correctOption}.{" "}
                    {game.question.correctText}
                  </p>
                  {game.status === "QUESTION_FINISHED" && (
                    <div className="w-28 shrink-0">
                      <QuizTimer
                        duration={phaseLen}
                        remaining={seconds}
                        variant="linear"
                      />
                    </div>
                  )}
                </div>
                {(game.results ?? []).map((r) => {
                  const letter = r.selectedOption
                  const optText = letter
                    ? (game.question
                        ?.options as Record<string, string> | undefined)?.[
                        letter
                      ]
                    : null
                  return (
                    <div
                      key={r.seat}
                      className={`flex items-center justify-between rounded-xl border p-3 ${
                        r.isCorrect
                          ? "border-[#16a34a] bg-[#f1faf5]"
                          : "border-[#fecaca] bg-[#fef2f2]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{r.pseudo}</p>
                        <p className="text-xs text-[#64748b]">
                          {r.selectedOption
                            ? `a choisi ${r.selectedOption}. ${optText ?? ""}`
                            : "n'a pas répondu"}
                        </p>
                      </div>
                      <p className="text-sm font-bold">
                        {r.isCorrect ? "✅ +1" : "❌ +0"}
                      </p>
                    </div>
                  )
                })}
                <p className="font-semibold">
                  Score : {game.playerA?.pseudo} {game.playerA?.score} —{" "}
                  {game.playerB?.score} {game.playerB?.pseudo}
                </p>
                {game.status === "FINISHED" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#f1faf5] border border-[#06A77D]/30 p-4">
                    <p className="text-lg font-bold">
                      {winnerName ? (
                        <>🏆 {winnerName} gagne</>
                      ) : (
                        <>🤝 Égalité</>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate("categories", null)}
                      >
                        Retour
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => void startRematch()}
                        loading={busy}
                      >
                        <Repeat size={15} /> Revanche
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </div>

      <div className="hidden lg:flex w-72 xl:w-80 shrink-0 sticky top-8">
        <ChatPanel
          room="quizGlobal"
          matchId={game.gameId}
          spectators={0}
          className="flex-1 rounded-2xl border border-[#e6f4ea] border-l-0"
        />
      </div>

      <Sheet open={chatOpen} onClose={() => setChatOpen(false)} side="right">
        <SheetHeader>
          <SheetTitle>Chat en direct</SheetTitle>
          <button onClick={() => setChatOpen(false)}>
            <X size={20} />
          </button>
        </SheetHeader>
        <SheetContent>
          <ChatPanel
            room="quizGlobal"
            matchId={game.gameId}
            spectators={0}
            className="h-full"
          />
        </SheetContent>
      </Sheet>

      <Dialog open={blockedDialog} onClose={() => setBlockedDialog(false)}>
        <DialogHeader>
          <DialogTitle>Partie existante</DialogTitle>
        </DialogHeader>
        <DialogContent className="text-sm text-[#334155]">
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle
              className="mt-0.5 shrink-0 text-amber-600"
              size={18}
            />
            <span>
              Vous êtes déjà engagé dans une autre partie. Annulez la partie en
              attente (avant qu'un adversaire ne la rejoigne) ou reprenez la
              partie en cours.
            </span>
          </p>
          <div className="space-y-2">
            {myActiveGames.length === 0 && (
              <p className="text-sm text-[#64748b]">
                Aucune partie active détectée — recharge en cours…
              </p>
            )}
            {myActiveGames.map((g) => {
              const isHost = g.playerA?.id === user?.id
              const cancelable = g.status === "WAITING" && isHost
              return (
                <div
                  key={g.gameId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#e6f4ea] bg-[#f9f9f9] p-2"
                >
                  <div className="text-sm min-w-0">
                    <p className="font-medium truncate">
                      Partie #{g.gameId} — {g.status}
                    </p>
                    <p className="text-xs text-[#64748b] truncate">
                      {g.playerB
                        ? `${g.playerA?.pseudo} vs ${g.playerB.pseudo}`
                        : g.invitedPlayer
                          ? `en attente de ${g.invitedPlayer.pseudo}`
                          : "en attente d'adversaire"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {g.status !== "WAITING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBlockedDialog(false)
                          onNavigate("quizGlobal", g.gameId)
                        }}
                      >
                        Reprendre
                      </Button>
                    )}
                    {cancelable && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void cancelMyGame(g.gameId)}
                      >
                        Annuler la partie
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBlockedDialog(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={confirmQuitOpen} onClose={() => setConfirmQuitOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            {quitInProgress ? "Abandonner le match" : "Quitter la partie"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="text-sm text-[#334155]">
          {quitInProgress ? (
            <>
              <p>
                Voulez-vous vraiment abandonner ce match ? Cette action est
                définitive : votre adversaire en sera informé.
              </p>
              {game?.status === "WAITING" && (
                <p className="text-xs text-[#64748b]">
                  Votre salon ouvert sera annulé.
                </p>
              )}
            </>
          ) : (
            <p>
              La partie est terminée. Voulez-vous quitter cette partie et
              revenir à l'accueil ?
            </p>
          )}
        </DialogContent>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirmQuitOpen(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={confirmQuit}>
            {quitInProgress ? "Abandonner" : "Quitter"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
