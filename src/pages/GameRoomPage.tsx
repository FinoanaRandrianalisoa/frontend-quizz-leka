import { use, useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, X, ArrowLeft, Volume2, VolumeX } from "lucide-react"
import GameHeader from "../components/game/GameHeader"
import QuizTimer from "../components/game/QuizTimer"
import QuestionCard from "../components/game/QuestionCard"
import AnswerOption from "../components/game/AnswerOption"
import ScoreFeedback from "../components/game/ScoreFeedback"
import ChatPanel from "../components/chat/ChatPanel"
import {
  Button,
  Badge,
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  Skeleton,
} from "../components/ui"
import { api, type Match } from "../lib/api"
import { useAuth } from "../lib/auth"
import { errMsg } from "../lib/hooks"
import UserName from "../components/UserName"
import type { NavigateFn } from "../App"
import usePageTitle from "@/lib/usePageTitle"

type AState = "default" | "selected" | "correct" | "incorrect" | "disabled"

export default function GameRoomPage({
  onNavigate,
  matchId,
}: {
  onNavigate: NavigateFn
  matchId: number | null
}) {
  usePageTitle("Game Room")
  const { user } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [feedbackShow, setFeedbackShow] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [quitOpen, setQuitOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    if (!matchId) return
    try {
      const data = await api.matchParId(matchId)
      const m = data.matchParId
      setMatch(m)
      if (m?.statut === "termine" || m?.statut === "annule") {
        onNavigate("results", matchId)
      }
    } catch (err) {
      setError(errMsg(err))
    }
  }, [matchId, onNavigate])

  useEffect(() => {
    void load()
    poll.current = setInterval(() => void load(), 2500)
    return () => {
      if (poll.current) clearInterval(poll.current)
    }
  }, [load])

  useEffect(() => {
    setSelected(null)
    setAnswered(false)
    setLastCorrect(null)
    setTimerKey((k) => k + 1)
  }, [match?.tourEnCours?.id])

  const tour = match?.tourEnCours
  const q = tour?.question
  const isHote = user?.id === match?.joueurHote.id
  const isSpectator = Boolean(
    user &&
      user.id !== match?.joueurHote.id &&
      user.id !== match?.joueurInvite?.id,
  )

  const getState = (choixId: string): AState => {
    if (isSpectator) return "disabled"
    if (!answered) return selected === choixId ? "selected" : "default"
    if (lastCorrect && selected === choixId) return "correct"
    if (!lastCorrect && selected === choixId) return "incorrect"
    return "disabled"
  }

  const selectAnswer = async (choixId: string) => {
    if (answered || !tour) return
    setSelected(choixId)
    setAnswered(true)
    try {
      const check = await api.reponseCorrecte(Number(choixId))
      setLastCorrect(check.reponseCorrecte)
      setFeedbackShow(true)
      await api.soumettreReponse(Number(tour.id), Number(choixId))
      setTimeout(async () => {
        setFeedbackShow(false)
        await load()
      }, 1600)
    } catch (err) {
      setError(errMsg(err))
      setAnswered(false)
    }
  }

  const handleExpire = useCallback(() => {
    if (!answered) {
      setAnswered(true)
      setLastCorrect(false)
      setFeedbackShow(true)
    }
  }, [answered])

  if (!matchId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-[#A0A0A0]">Aucune partie sélectionnée.</p>
        <Button onClick={() => onNavigate("categories")}>
          Retour aux catégories
        </Button>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="h-full flex items-center justify-center">
        {error ? (
          <p className="text-[#D62828]">{error}</p>
        ) : (
          <Skeleton className="w-64 h-32 rounded-2xl" />
        )}
      </div>
    )
  }

  const waiting = match.statut === "en_attente"

  return (
    <div
      className="flex flex-col bg-[#F9F9F9] overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <ScoreFeedback points={1} show={feedbackShow} correct={!!lastCorrect} />
      <div className="shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#002244] border-b border-white/10">
          <button
            onClick={() => setQuitOpen(true)}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Quitter</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-[11px] text-white/40 font-medium">
              {match.theme.nom} · objectif {match.scoreCible}
            </span>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="text-white/60 hover:text-white"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
        <GameHeader
          player1={{
            name: match.joueurHote.pseudo,
            score: match.scoreHote,
            isCurrentUser: isHote,
          }}
          player2={{
            name: match.joueurInvite?.pseudo ?? "En attente",
            score: match.scoreInvite,
          }}
          spectators={0}
          round={match.tourActuel || 1}
          totalRounds={match.scoreCible}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto p-3 md:p-5 lg:p-8 gap-4">
          {error && <p className="text-sm text-[#D62828]">{error}</p>}
          {waiting && (
            <div className="max-w-xl bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
              <p className="font-bold text-[#2D3142] mb-1">
                En attente d'un adversaire
              </p>
              <p className="text-sm text-[#A0A0A0]">
                Partagez le lobby : un autre joueur peut rejoindre cette partie.
              </p>
            </div>
          )}

          {!waiting && q && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  {answered ? (
                    <Badge
                      variant={lastCorrect ? "won" : "lost"}
                      className="text-xs font-bold px-3 py-1"
                    >
                      {lastCorrect
                        ? "✓ Bonne réponse !"
                        : selected
                          ? "✗ Mauvaise réponse"
                          : "⏱ Temps écoulé !"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="playing"
                      className="text-xs font-bold px-3 py-1"
                    >
                      {isSpectator ? "Spectateur" : "À votre tour"}
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => setChatOpen(true)}
                  className="md:hidden flex items-center gap-1.5 text-xs text-[#A0A0A0] bg-white border rounded-xl px-3 py-1.5"
                >
                  <MessageCircle size={13} /> Chat
                </button>
              </div>

              {isSpectator ? (
                <div className="space-y-4 w-full">
                  <div className="rounded-2xl bg-[#FFF8F3] p-3 border border-[#FFE8DA] text-sm text-[#A3541A] text-center font-semibold">
                    Spectateur — vous ne pouvez pas répondre
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A0A0A0]">
                            Question {match.tourEnCours?.numero ?? 1}
                          </p>
                          <p className="text-xs text-[#A0A0A0]">
                            {q.theme.nom}
                          </p>
                        </div>
                        <div className="text-sm font-semibold">
                          <UserName user={match.joueurHote} /> ·{" "}
                          {match.scoreHote}
                        </div>
                      </div>
                      <QuestionCard
                        index={tour?.numero ?? 1}
                        total={match.scoreCible}
                        category={q.theme.nom}
                        question={q.texte}
                      />
                      <div className="grid grid-cols-2 gap-2.5 mt-3">
                        {q.choix.map((opt, i) => (
                          <AnswerOption
                            key={opt.id}
                            letter={
                              ["A", "B", "C", "D"][i] as "A" | "B" | "C" | "D"
                            }
                            label={opt.texte}
                            state={getState(opt.id)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A0A0A0]">
                            Question {match.tourEnCours?.numero ?? 1}
                          </p>
                          <p className="text-xs text-[#A0A0A0]">
                            {q.theme.nom}
                          </p>
                        </div>
                        <div className="text-sm font-semibold">
                          {match.joueurInvite
                            ? match.joueurInvite.pseudo
                            : "En attente"}{" "}
                          · {match.scoreInvite ?? 0}
                        </div>
                      </div>
                      <QuestionCard
                        index={tour?.numero ?? 1}
                        total={match.scoreCible}
                        category={q.theme.nom}
                        question={q.texte}
                      />
                      <div className="grid grid-cols-2 gap-2.5 mt-3">
                        {q.choix.map((opt, i) => (
                          <AnswerOption
                            key={opt.id}
                            letter={
                              ["A", "B", "C", "D"][i] as "A" | "B" | "C" | "D"
                            }
                            label={opt.texte}
                            state={getState(opt.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:block shrink-0 mt-1">
                      <QuizTimer
                        key={timerKey}
                        duration={5}
                        variant="circular"
                        size="md"
                        running={!answered}
                        onExpire={handleExpire}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="sm:hidden mb-3">
                        <QuizTimer
                          key={timerKey + 100}
                          duration={5}
                          variant="linear"
                          running={!answered}
                          onExpire={handleExpire}
                        />
                      </div>
                      <QuestionCard
                        index={tour?.numero ?? 1}
                        total={match.scoreCible}
                        category={q.theme.nom}
                        question={q.texte}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 md:gap-3 max-w-2xl">
                    {q.choix.map((opt, i) => (
                      <AnswerOption
                        key={opt.id}
                        letter={
                          ["A", "B", "C", "D"][i] as "A" | "B" | "C" | "D"
                        }
                        label={opt.texte}
                        state={getState(opt.id)}
                        onClick={
                          isSpectator ? undefined : () => selectAnswer(opt.id)
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {!waiting && !q && match.statut === "en_cours" && (
            <p className="text-sm text-[#A0A0A0]">Chargement de la question…</p>
          )}
        </div>
        <div className="hidden md:flex w-72 lg:w-80 xl:w-96 shrink-0 border-l border-[#E8E8E8]">
          <ChatPanel spectators={0} className="flex-1" />
        </div>
      </div>

      <Sheet open={chatOpen} onClose={() => setChatOpen(false)} side="right">
        <SheetHeader>
          <SheetTitle>Chat en direct</SheetTitle>
          <button onClick={() => setChatOpen(false)}>
            <X size={20} />
          </button>
        </SheetHeader>
        <SheetContent>
          <ChatPanel spectators={0} className="h-full" />
        </SheetContent>
      </Sheet>

      <Dialog open={quitOpen} onClose={() => setQuitOpen(false)}>
        <DialogHeader>
          <DialogTitle>Quitter la partie ?</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-[#A0A0A0]">
            Vous quitterez l'écran de jeu. La partie reste en base tant qu'elle
            n'est pas terminée.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setQuitOpen(false)}>
            Continuer
          </Button>
          <Button
            variant="destructive"
            onClick={() => onNavigate("categories")}
          >
            Quitter
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
