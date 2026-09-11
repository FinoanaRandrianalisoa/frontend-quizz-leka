import { useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, CardContent, Badge } from "../components/ui"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth"
import usePageTitle from "@/lib/usePageTitle"

const DIRECTIONS = ["gauche", "centre", "droite"] as const
type Direction = typeof DIRECTIONS[number]

type PlayerList = {
  id: string
  pseudo: string
}

type MatchState = {
  id: string
  joueurHoteId: string
  joueurHotePseudo: string
  joueurInviteId: string
  joueurInvitePseudo: string
  scoreHote: number
  scoreInvite: number
  scoreCible: number
  round: number
  statut: string
  resultatManche?: string | null
  vainqueurId?: string | null
}

export default function PenaltyKickPage({
  onNavigate,
}: {
  onNavigate?: (p: string, id?: number | null) => void
}) {
  usePageTitle("Tir au but")
  const { user } = useAuth()
  const [players, setPlayers] = useState<PlayerList[]>([])
  const [selected, setSelected] = useState<PlayerList | null>(null)
  const [targetScore, setTargetScore] = useState<number>(5)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchState | null>(null)
  const [activeMatches, setActiveMatches] = useState<MatchState[]>([])
  const [spectatorMatches, setSpectatorMatches] = useState<MatchState[]>([])
  const [currentDirection, setCurrentDirection] = useState<Direction | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roundLocked, setRoundLocked] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await api.utilisateurs()
        setPlayers((res.utilisateurs ?? []).filter((p) => p.id !== user?.id))
      } catch {
        setPlayers([])
      }
    }
    void fetchPlayers()
  }, [user?.id])

  useEffect(() => {
    const loadActiveMatches = async () => {
      try {
        const res = await api.mesMatchsPenalty()
        setActiveMatches(res.mesMatchsPenalty ?? [])
      } catch {
        setActiveMatches([])
      }
    }
    void loadActiveMatches()
  }, [user?.id])

  const loadSpectatorMatches = async () => {
    try {
      const res = await api.partiesPenaltyDisponibles()
      const available = (res.partiesPenaltyDisponibles ?? [])
        .filter((item) => item.statut === "en_cours")
        .map((item) => ({
          id: item.id,
          joueurHoteId: item.joueurHoteId,
          joueurHotePseudo: item.joueurHotePseudo,
          joueurInviteId: item.joueurInviteId,
          joueurInvitePseudo: item.joueurInvitePseudo,
          scoreHote: Number(item.scoreHote ?? 0),
          scoreInvite: Number(item.scoreInvite ?? 0),
          scoreCible: Number(item.scoreCible ?? 5),
          round: Number(item.round ?? 1),
          statut: item.statut,
          resultatManche: item.resultatManche ?? null,
          vainqueurId: item.vainqueurId ?? null,
        }))
      setSpectatorMatches(available)
    } catch {
      setSpectatorMatches([])
    }
  }

  useEffect(() => {
    void loadSpectatorMatches()
    const interval = setInterval(() => void loadSpectatorMatches(), 5000)
    return () => clearInterval(interval)
  }, [user?.id])

  // WebSocket pour écouter les acceptations de défi (hôte)
  useEffect(() => {
    if (!user?.id) return

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log("WebSocket notifications connecté")
    }

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)

        if (payload?.type === "penalty.challenge_accepted") {
          const hoteId = String(payload.hote_id)
          if (hoteId === String(user.id)) {
            // L'hôte reçoit la notification que son défi a été accepté
            const nextMatch = {
              id: payload.match_id,
              joueurHoteId: payload.hote_id,
              joueurHotePseudo: user.pseudo || "Hôte",
              joueurInviteId: payload.invite_id,
              joueurInvitePseudo: payload.invite_pseudo,
              scoreHote: 0,
              scoreInvite: 0,
              scoreCible: 5,
              round: 1,
              statut: "en_cours",
              resultatManche: null,
              vainqueurId: null,
            }
            setMatch(nextMatch)
            sessionStorage.setItem(
              "squid_penalty_match",
              JSON.stringify(nextMatch),
            )
            sessionStorage.setItem("squid_penalty_new_match", "true")
            if (onNavigate) onNavigate("penaltyMatch")
          }
        }
      } catch {
        // ignore malformed payload
      }
    }

    return () => {
      try {
        ws.close()
      } catch {
        // ignore close errors
      }
    }
  }, [user?.id, user?.pseudo, onNavigate])

  const handleChallenge = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.defierJoueurPenalty(selected.id, targetScore)
      setChallengeId(result.defierJoueurPenalty.id)
    } catch (err: any) {
      setError(err?.message ?? "Impossible d'envoyer le défi.")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptChallenge = async (challengeId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.accepterDefiPenalty(challengeId)
      const nextMatch = {
        id: result.accepterDefiPenalty.id,
        joueurHoteId: result.accepterDefiPenalty.joueurHoteId,
        joueurHotePseudo: result.accepterDefiPenalty.joueurHotePseudo,
        joueurInviteId: result.accepterDefiPenalty.joueurInviteId,
        joueurInvitePseudo: result.accepterDefiPenalty.joueurInvitePseudo,
        scoreHote: result.accepterDefiPenalty.scoreHote,
        scoreInvite: result.accepterDefiPenalty.scoreInvite,
        scoreCible: result.accepterDefiPenalty.scoreCible,
        round: result.accepterDefiPenalty.round,
        statut: result.accepterDefiPenalty.statut,
        resultatManche: result.accepterDefiPenalty.resultatManche ?? null,
        vainqueurId: result.accepterDefiPenalty.vainqueurId ?? null,
      }
      setMatch(nextMatch)
      sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch))
      sessionStorage.setItem("squid_penalty_new_match", "true")
      if (onNavigate) onNavigate("penaltyMatch")
    } catch (err: any) {
      setError(err?.message ?? "Impossible d'accepter le défi.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinMatch = (matchId: string) => {
    const matchToJoin = activeMatches.find((m) => m.id === matchId)
    if (matchToJoin) {
      setMatch(matchToJoin)
      sessionStorage.setItem("squid_penalty_match", JSON.stringify(matchToJoin))
      if (onNavigate) onNavigate("penaltyMatch")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => onNavigate?.("categories")}
            className="text-white/60 hover:text-white text-sm mb-4 flex items-center gap-1"
          >
            <span>←</span>
            <span>Retour aux catégories</span>
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">⚽ Tir au but</h1>
          <p className="text-white/60">
            Défiez d'autres joueurs à un duel de tir au but !
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[#e7d8a9] bg-[#fff9eb]">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[#8a5b00] mb-4">
                Créer un défi
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#8a5b00] mb-2">
                  Score cible
                </label>
                <select
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#e7d8a9] bg-white px-3 py-2 text-sm"
                >
                  <option value={3}>3 buts</option>
                  <option value={5}>5 buts</option>
                  <option value={7}>7 buts</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#8a5b00] mb-2">
                  Choisir un adversaire
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelected(player)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selected?.id === player.id
                          ? "border-[#FF6B35] bg-[#FF6B35]/10"
                          : "border-[#e7d8a9] bg-white hover:border-[#FF6B35]"
                      }`}
                    >
                      {player.pseudo}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleChallenge}
                disabled={!selected || loading}
                className="w-full bg-gradient-to-r from-[#FF6B35] to-[#FFD700] text-white font-bold"
              >
                {loading ? "Envoi..." : "🎯 Lancer le défi"}
              </Button>

              {challengeId && (
                <div className="mt-4 p-3 rounded-lg bg-[#4CAF50]/10 border border-[#4CAF50]/30 text-center">
                  <p className="text-sm font-medium text-[#4CAF50]">
                    ✓ Défi envoyé ! En attente de réponse...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#e7d8a9] bg-[#fff9eb]">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[#8a5b00] mb-4">
                Mes matchs en cours
              </h2>

              {activeMatches.length === 0 ? (
                <p className="text-sm text-[#64748b]">Aucun match en cours</p>
              ) : (
                <div className="space-y-2">
                  {activeMatches.map((activeMatch) => (
                    <button
                      key={activeMatch.id}
                      type="button"
                      onClick={() => handleJoinMatch(activeMatch.id)}
                      className="w-full text-left rounded-lg border border-[#e7d8a9] bg-white p-3 hover:border-[#FF6B35]"
                    >
                      <div className="font-medium text-[#1f2a1f]">
                        {activeMatch.joueurHotePseudo} vs{" "}
                        {activeMatch.joueurInvitePseudo}
                      </div>
                      <div className="text-xs text-[#64748b]">
                        Score: {activeMatch.scoreHote} -{" "}
                        {activeMatch.scoreInvite} · Cible:{" "}
                        {activeMatch.scoreCible}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {spectatorMatches.length > 0 && (
          <Card className="mt-6 border-[#e7d8a9] bg-[#fff9eb]">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[#8a5b00] mb-4">
                Matchs en direct (Spectateur)
              </h2>
              <div className="space-y-2">
                {spectatorMatches.map((spectatorMatch) => (
                  <button
                    key={spectatorMatch.id}
                    type="button"
                    onClick={() => {
                      setMatch(spectatorMatch)
                      sessionStorage.setItem(
                        "squid_penalty_match",
                        JSON.stringify(spectatorMatch),
                      )
                      if (onNavigate) onNavigate("penaltyMatch")
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-[#e7d8a9] bg-[#fffbf0] p-3 text-left hover:border-[#FF6B35]"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="live">LIVE</Badge>
                      <div>
                        <div className="font-medium text-[#1f2a1f]">
                          {spectatorMatch.joueurHotePseudo} vs{" "}
                          {spectatorMatch.joueurInvitePseudo}
                        </div>
                        <div className="text-xs text-[#64748b]">
                          Score {spectatorMatch.scoreHote} -{" "}
                          {spectatorMatch.scoreInvite}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#FF6B35]">
                      Regarder
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
