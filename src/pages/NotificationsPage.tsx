import { useEffect, useMemo, useState } from "react"
import { Bell, Trophy, Users, MessageCircle, Star, Check } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
} from "../components/ui"
import { api } from "../lib/api"
import { quizGlobalApi } from "../lib/quizGlobalApi"
import { useAsync } from "../lib/hooks"
import { initial, relativeTime } from "../lib/format"
import UserName from "../components/UserName"
import usePageTitle from "@/lib/usePageTitle"

const refreshNotificationEvent = "notifications:refresh"

type NotificationItem = {
  id: number | string
  type?: string
  titre?: string | null
  message?: string | null
  lu?: boolean
  referenceId?: number | null
  creeLe?: string
  expediteur?: {
    pseudo?: string | null
    photoProfil?: string | null
    firstName?: string | null
    villeOrigine?: string | null
  } | null
}

type SenderUser = {
  pseudo?: string | null
  photoProfil?: string | null
  firstName?: string | null
  villeOrigine?: string | null
} | null

const senderDesc = (base: string, user: SenderUser) => {
  if (!user?.pseudo) return base
  const escaped = user.pseudo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return base.replace(new RegExp(`^${escaped}\\s+`, "i"), "")
}

const isRabbitInvitationNotification = (
  item: Pick<NotificationItem, "type" | "titre" | "message">,
) => {
  if (!item) return false
  const titre = (item.titre ?? "").trim().toLowerCase()
  const haystack = `${item.titre ?? ""} ${item.message ?? ""}`.toLowerCase()
  return (
    titre === "invitation course lapin" ||
    (item.type === "defi_recu" && haystack.includes("course lapin"))
  )
}

const isRabbitReadyNotification = (
  item: Pick<NotificationItem, "type" | "titre" | "message">,
) => {
  const titre = (item.titre ?? "").trim().toLowerCase()
  return (
    titre === "tous les joueurs sont prêts" ||
    (item.message ?? "").toLowerCase().includes("compte à rebours")
  )
}

const isQuizGlobalInvitationNotification = (
  item: Pick<NotificationItem, "type" | "titre" | "message">,
) => {
  if (!item) return false
  const titre = (item.titre ?? "").trim().toLowerCase()
  const haystack = `${item.titre ?? ""} ${item.message ?? ""}`.toLowerCase()
  return (
    titre === "invitation quizz global" ||
    titre === "invitation quiz global" ||
    (item.type === "defi_recu" && haystack.includes("quizz global"))
  )
}

export default function NotificationsPage({
  onNavigate,
}: {
  onNavigate?: (p: string, id?: number | null) => void
}) {
  usePageTitle("Notifications")
  const notificationsQuery = useAsync<NotificationItem[]>(
    () => api.mesNotifications().then((d) => d.mesNotifications ?? []),
    [],
  )
  const demandes = useAsync(
    () => api.demandesAmisRecues().then((d) => d.demandesAmisRecues),
    [],
  )
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const notificationsData = notificationsQuery.data ?? []

  useEffect(() => {
    const handleRefresh = () => {
      void notificationsQuery.reload()
    }

    window.addEventListener(
      refreshNotificationEvent,
      handleRefresh as EventListener,
    )
    return () =>
      window.removeEventListener(
        refreshNotificationEvent,
        handleRefresh as EventListener,
      )
  }, [notificationsQuery.reload])

  useEffect(() => {
    setReadIds((current) => {
      const next = new Set(current)
      for (const item of notificationsData) {
        if (item.lu) next.add(String(item.id))
      }
      return next
    })
  }, [notificationsData])

  const notifications = useMemo(() => {
    const items: Array<{
      id: string
      type: "challenge" | "social" | "win" | "achieve"
      icon: typeof Users
      title: string
      desc: string
      time: string
      read: boolean
      color: string
      user: SenderUser
    }> = []

    for (const item of notificationsData) {
      const isRabbitInvite = isRabbitInvitationNotification(item)
      const isChallenge =
        item.type === "defi_recu" ||
        item.type === "defi_accepte" ||
        isRabbitInvite ||
        isRabbitReadyNotification(item)
      items.push({
        id: String(item.id),
        type: isChallenge ? "challenge" : "social",
        icon: isChallenge ? Users : Bell,
        title: item.titre ?? "Notification",
        desc: senderDesc(item.message ?? "", item.expediteur ?? null),
        time: relativeTime(item.creeLe ?? new Date().toISOString()),
        read: readIds.has(String(item.id)) || Boolean(item.lu),
        color: isChallenge ? "#16a34a" : "#0f766e",
        user: item.expediteur ?? null,
      })
    }

    for (const demande of demandes.data ?? []) {
      items.push({
        id: `friend-${demande.id}`,
        type: "challenge",
        icon: Users,
        title: "Demande d'ami",
        desc: "Souhaite vous ajouter à son réseau.",
        time: relativeTime(demande.creeLe),
        read: readIds.has(`friend-${demande.id}`),
        color: "#16a34a",
        user: demande.demandeur,
      })
    }

    if (!items.length) {
      items.push({
        id: "empty",
        type: "achieve",
        icon: Star,
        title: "Tout est calme",
        desc: "Aucune notification récente pour le moment.",
        time: "Maintenant",
        read: true,
        color: "#22c55e",
        user: null,
      })
    }

    return items
  }, [demandes.data, notificationsData, readIds])

  const unread = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    try {
      await api.marquerToutesNotificationsLues()
    } catch {
      // keep UX resilient while the backend refreshes state
    }
    setReadIds(new Set(notifications.map((n) => n.id)))
    window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
  }

  const handleAccept = async (notificationId: string, requestId?: string) => {
    const id = requestId
      ? Number(requestId.replace("friend-", ""))
      : Number(notificationId)
    if (requestId) {
      await api.repondreDemandeAmi(id, true)
    } else {
      await api.marquerNotificationLue(Number(notificationId))
    }
    setReadIds((current) => new Set([...current, notificationId]))
    window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
  }

  const startChallengeFromNotification = async () => {
    try {
      const pendingRps = await api.mesDefisRps()
      const rpsChallenge = pendingRps.mesDefisRps?.[0]
      if (rpsChallenge) {
        const match = await api.accepterDefiRps(rpsChallenge.id)
        const payload = match.accepterDefiRps
        const nextMatch = {
          id: payload.id,
          joueurHoteId: payload.joueurHoteId,
          joueurHotePseudo: payload.joueurHotePseudo,
          joueurInviteId: payload.joueurInviteId,
          joueurInvitePseudo: payload.joueurInvitePseudo,
          scoreHote: payload.scoreHote,
          scoreInvite: payload.scoreInvite,
          scoreCible: payload.scoreCible,
          round: payload.round,
          statut: payload.statut,
          resultatManche: null,
          vainqueurId: null,
        }
        sessionStorage.setItem("squid_rps_match", JSON.stringify(nextMatch))
        onNavigate?.("rpsMatch")
        return
      }

      const pendingPenalty = await api.mesDefisPenalty()
      const penaltyChallenge = pendingPenalty.mesDefisPenalty?.[0]
      if (penaltyChallenge) {
        const match = await api.accepterDefiPenalty(penaltyChallenge.id)
        const payload = match.accepterDefiPenalty
        const nextMatch = {
          id: payload.id,
          joueurHoteId: payload.joueurHoteId,
          joueurHotePseudo: payload.joueurHotePseudo,
          joueurInviteId: payload.joueurInviteId,
          joueurInvitePseudo: payload.joueurInvitePseudo,
          scoreHote: payload.scoreHote,
          scoreInvite: payload.scoreInvite,
          scoreCible: payload.scoreCible,
          round: payload.round,
          statut: payload.statut,
          resultatManche: payload.resultatManche ?? null,
          vainqueurId: payload.vainqueurId ?? null,
        }
        sessionStorage.setItem("squid_penalty_match", JSON.stringify(nextMatch))
        sessionStorage.setItem("squid_penalty_new_match", "true")
        onNavigate?.("penaltyMatch")
        return
      }

      onNavigate?.("squidGame")
    } catch (error) {
      console.error("Erreur lors de l'acceptation du défi:", error)
      onNavigate?.("squidGame")
    }
  }

  const refuseRabbitInvitation = async (
    matchId: number,
    notificationId: string,
  ) => {
    try {
      await api.refuserInvitationCourseLapin(matchId)
    } catch {
      // still leave the lobby flow
    }
    await api
      .marquerNotificationLue(Number(notificationId))
      .catch(() => undefined)
    window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
  }

  const acceptRabbitInvitation = async (
    matchId: number,
    notificationId?: string,
  ) => {
    if (notificationId) {
      await api
        .marquerNotificationLue(Number(notificationId))
        .catch(() => undefined)
    }
    try {
      const match = await api.accepterInvitationCourseLapin(matchId)
      const result = match.accepterInvitationCourseLapin
      const resolvedMatchId = Number(result?.id ?? matchId)
      sessionStorage.setItem("rabbit_match_id", String(resolvedMatchId))
      window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
      onNavigate?.("rabbitRace", resolvedMatchId)
    } catch {
      sessionStorage.setItem("rabbit_match_id", String(matchId))
      window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
      onNavigate?.("rabbitRace", matchId)
    }
  }

  const acceptQuizGlobalInvitation = async (
    gameId: number,
    notificationId?: string,
  ) => {
    if (notificationId) {
      await api
        .marquerNotificationLue(Number(notificationId))
        .catch(() => undefined)
    }
    try {
      const res = await quizGlobalApi.rejoindre(gameId)
      window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
      onNavigate?.("quizGlobal", res.rejoindrePartieQuizGlobal.gameId || gameId)
    } catch {
      window.dispatchEvent(new CustomEvent(refreshNotificationEvent))
      onNavigate?.("quizGlobal", gameId)
    }
  }

  const handleNotificationClick = async (n: {
    id: string
    type: "challenge" | "social" | "win" | "achieve"
    title: string
    desc: string
    read: boolean
  }) => {
    if (!n.read) {
      setReadIds((current) => new Set([...current, n.id]))
    }
    if (n.type !== "challenge") return
    const matchingNotification = notificationsData.find(
      (item) => String(item.id) === n.id,
    )
    const rabbitMatchId = matchingNotification?.referenceId ?? null
    const quizGlobalGameId = matchingNotification?.referenceId ?? null
    if (
      rabbitMatchId &&
      isRabbitInvitationNotification(
        matchingNotification ?? {} as NotificationItem,
      )
    ) {
      return
    }
    if (
      rabbitMatchId &&
      isRabbitReadyNotification(matchingNotification ?? {} as NotificationItem)
    ) {
      sessionStorage.setItem("rabbit_match_id", String(rabbitMatchId))
      onNavigate?.("rabbitRace", Number(rabbitMatchId))
      return
    }
    if (
      quizGlobalGameId &&
      isQuizGlobalInvitationNotification(
        matchingNotification ?? {} as NotificationItem,
      )
    ) {
      return
    }
    await startChallengeFromNotification()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2a1f]">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-[#64748b]">{unread} non lues</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[#64748b]"
          onClick={markAllRead}
        >
          <Check size={14} /> Tout marquer comme lu
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.map((n, i) => {
            const Icon = n.icon
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-4 transition-colors cursor-pointer
                  ${
                    n.read
                      ? "hover:bg-[#f3faf4]"
                      : "bg-[#16a34a]/5 hover:bg-[#16a34a]/10 border-l-2 border-[#16a34a]"
                  }
                  ${
                    i < notifications.length - 1
                      ? "border-b border-[#edf6ef]"
                      : ""
                  }`}
                onClick={() => {
                  void handleNotificationClick(n)
                }}
              >
                {n.user ? (
                  <Avatar size="md" className="shrink-0 shadow-sm">
                    {n.user.photoProfil ? (
                      <AvatarImage
                        src={n.user.photoProfil}
                        alt={n.user.pseudo ?? ""}
                      />
                    ) : (
                      <AvatarFallback>{initial(n.user.pseudo)}</AvatarFallback>
                    )}
                  </Avatar>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: n.color + "20" }}
                  >
                    <Icon size={16} style={{ color: n.color }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1f2a1f]">
                      {n.user ? <UserName user={n.user} /> : n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0" />
                    )}
                  </div>
                  {n.user && (
                    <p className="text-xs font-medium text-[#16a34a] mt-0.5">
                      {n.title}
                    </p>
                  )}
                  <p className="text-sm text-[#64748b] mt-0.5">{n.desc}</p>
                  <p className="text-xs text-[#64748b] mt-1">{n.time}</p>
                </div>
                {n.type === "challenge" &&
                  !n.read &&
                  (() => {
                    const matchingNotification = notificationsData.find(
                      (item) => String(item.id) === n.id,
                    )
                    const rabbitMatchId =
                      matchingNotification?.referenceId ?? null
                    const quizGlobalGameId =
                      matchingNotification?.referenceId ?? null
                    const rabbitInvite = Boolean(
                      rabbitMatchId &&
                        isRabbitInvitationNotification(
                          matchingNotification ?? {} as NotificationItem,
                        ),
                    )
                    const rabbitReady = Boolean(
                      rabbitMatchId &&
                        isRabbitReadyNotification(
                          matchingNotification ?? {} as NotificationItem,
                        ),
                    )
                    const quizGlobalInvite = Boolean(
                      quizGlobalGameId &&
                        isQuizGlobalInvitationNotification(
                          matchingNotification ?? {} as NotificationItem,
                        ),
                    )
                    if (n.id.startsWith("friend-")) {
                      return (
                        <Button
                          size="sm"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleAccept(n.id, n.id)
                          }}
                        >
                          Accepter
                        </Button>
                      )
                    }
                    if (rabbitInvite && rabbitMatchId) {
                      return (
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void acceptRabbitInvitation(
                                Number(rabbitMatchId),
                                n.id,
                              )
                            }}
                          >
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              void refuseRabbitInvitation(
                                Number(rabbitMatchId),
                                n.id,
                              )
                            }}
                          >
                            Refuser
                          </Button>
                        </div>
                      )
                    }
                    if (quizGlobalInvite && quizGlobalGameId) {
                      return (
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void acceptQuizGlobalInvitation(
                                Number(quizGlobalGameId),
                                n.id,
                              )
                            }}
                          >
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              void quizGlobalApi
                                .refuserInvitation(Number(quizGlobalGameId))
                                .catch(() => undefined)
                              void api
                                .marquerNotificationLue(Number(n.id))
                                .catch(() => undefined)
                              window.dispatchEvent(
                                new CustomEvent(refreshNotificationEvent),
                              )
                            }}
                          >
                            Refuser
                          </Button>
                        </div>
                      )
                    }
                    if (rabbitReady && rabbitMatchId) {
                      return (
                        <Button
                          size="sm"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            sessionStorage.setItem(
                              "rabbit_match_id",
                              String(rabbitMatchId),
                            )
                            onNavigate?.("rabbitRace", Number(rabbitMatchId))
                          }}
                        >
                          Lancer
                        </Button>
                      )
                    }
                    return (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await startChallengeFromNotification()
                        }}
                      >
                        Voir le défi
                      </Button>
                    )
                  })()}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
