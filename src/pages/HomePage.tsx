import { use, useState } from "react"
import usePageTitle from "@/lib/usePageTitle"
import {
  Play,
  Trophy,
  Globe,
  Landmark,
  Leaf,
  Music,
  Star,
  Zap,
  Swords,
  TrendingUp,
  Eye,
  ChevronRight,
  Gamepad2,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Badge, Button, Card, CardContent, Skeleton } from "../components/ui"
import UserAvatar from "../components/UserAvatar"
import { api } from "../lib/api"
import { quizGlobalApi } from "../lib/quizGlobalApi"
import { useAuth } from "../lib/auth"
import { useAsync } from "../lib/hooks"
import { initial, themeColor, wrPct } from "../lib/format"
import UserName from "../components/UserName"
import type { NavigateFn } from "../App"

const ICONS = [Globe, Landmark, Leaf, Music, Trophy, Star, Gamepad2, Zap]
const RANK_COLORS: Record<number, string> = {
  1: "text-[#fbbf24]",
  2: "text-[#94a3b8]",
  3: "text-[#d97706]",
}

export default function HomePage({ onNavigate }: { onNavigate: NavigateFn }) {
  usePageTitle("Home")
  const { user } = useAuth()
  const stats = useAsync(
    () => api.statsPlateforme().then((d) => d.statsPlateforme),
    [],
  )
  const themes = useAsync(() => api.themes().then((d) => d.themes), [])
  const live = useAsync(
    () => api.partiesEnCours().then((d) => d.partiesEnCours),
    [],
  )
  const available = useAsync(
    () => api.partiesDisponibles().then((d) => d.partiesDisponibles),
    [],
  )
  const rpsRooms = useAsync(
    () => api.partiesRpsDisponibles().then((d) => d.partiesRpsDisponibles),
    [],
  )
  const board = useAsync(() => api.classement(5).then((d) => d.classement), [])
  const profil = useAsync(() => api.profil().then((d) => d.profil), [])
  const feed = useAsync(
    () => api.filActualite().then((d) => d.filActualite),
    [],
  )
  const [loadingPlay, setLoadingPlay] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [joiningQuiz, setJoiningQuiz] = useState<number | null>(null)

  const joinQuizGlobal = async (referenceId: number) => {
    setJoiningQuiz(referenceId)
    try {
      const res = await quizGlobalApi.rejoindre(referenceId)
      onNavigate(
        "quizGlobal",
        res.rejoindrePartieQuizGlobal.gameId || referenceId,
      )
    } catch {
      onNavigate("quizGlobal", referenceId)
    } finally {
      setJoiningQuiz(null)
    }
  }

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm("Supprimer cette partie ?")) return
    setCancelling(matchId)
    try {
      await api.annulerPartie(matchId)
      await available.reload()
      await live.reload()
    } finally {
      setCancelling(null)
    }
  }

  const handleDeleteRpsRoom = async (matchId: string) => {
    if (!window.confirm("Supprimer cette partie pierre, papier, ciseaux ?"))
      return
    setCancelling(Number(matchId))
    try {
      await api.supprimerMatchRps(matchId)
      await rpsRooms.reload()
    } finally {
      setCancelling(null)
    }
  }

  const startPlay = async () => {
    setLoadingPlay(true)
    try {
      const list = themes.data?.length
        ? themes.data
        : (await api.themes()).themes
      if (list[0]) {
        const created = await api.creerPartie(Number(list[0].id))
        onNavigate("game", Number(created.creerPartie.id))
      } else {
        onNavigate("categories")
      }
    } catch {
      onNavigate("categories")
    } finally {
      setLoadingPlay(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 md:px-6 py-6 pb-24 md:pb-8">
      <div className="relative overflow-hidden rounded-[32px] border border-[#dfeee2] bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,#f9fff9_0%,#ffffff_45%,#edfdf2_100%)] p-5 shadow-[0_24px_80px_rgba(15,118,110,0.08)] md:p-8 mb-6">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge
                variant="category"
                className="px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
              >
                <span className="inline-block size-2 rounded-full bg-[#16a34a]" />
                En ligne
              </Badge>
              <span className="text-xs font-medium text-[#64748b]">
                {stats.data?.joueursEnLigne ?? 0} joueurs actifs
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] font-black tracking-[-0.06em] text-[#111827] leading-[0.95] mb-4">
              Bonjour <UserName user={user} />
              <span className="block text-[#15803d]">jouons malin.</span>
            </h1>

            <p className="max-w-xl text-sm md:text-base text-[#475569] leading-7 mb-6">
              Rejoins une partie, défie tes amis et monte dans le classement
              avec une expérience fluide pensée pour les meilleurs moments de
              jeu.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                loading={loadingPlay}
                onClick={startPlay}
                className="bg-[#16a34a] hover:bg-[#15803d] text-white shadow-[0_12px_24px_rgba(22,163,74,0.26)] font-semibold"
              >
                <Play size={18} fill="currentColor" /> Jouer maintenant
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onNavigate("spectator")}
                className="border-[#dfeee2] bg-white/80 text-[#0f172a]"
              >
                <Eye size={18} /> Regarder
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Joueurs",
                value: stats.data?.joueurs ?? 0,
                icon: Users,
              },
              {
                label: "Questions",
                value: stats.data?.questions ?? 0,
                icon: Sparkles,
              },
              {
                label: "Parties live",
                value: stats.data?.partiesEnCours ?? 0,
                icon: ShieldCheck,
              },
              {
                label: "Win rate",
                value: `${wrPct(profil.data?.victoires ?? 0, profil.data?.partiesJouees ?? 0)}%`,
                icon: Trophy,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-[#e2f1e6] bg-white/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#64748b]">
                    {label}
                  </span>
                  <div className="rounded-xl bg-[#ecfdf5] p-2 text-[#15803d]">
                    <Icon size={14} />
                  </div>
                </div>
                <div className="text-2xl font-black tracking-[-0.05em] text-[#111827]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <section className="rounded-[28px] border border-[#c9f1d3] bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_45%,#f0fdf4_100%)] p-4 md:p-5 shadow-[0_24px_40px_rgba(34,197,94,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#22c55e]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Salons RPS
                </h2>
              </div>
              <button
                onClick={() => onNavigate("squidGame")}
                className="text-xs font-semibold text-[#15803d]"
              >
                Ouvrir
              </button>
            </div>

            {rpsRooms.loading && <Skeleton className="h-24 rounded-2xl" />}
            {!rpsRooms.loading && !(rpsRooms.data ?? []).length && (
              <div className="rounded-2xl border border-dashed border-[#9ae6b4] bg-white/70 p-5 text-sm text-[#64748b]">
                Aucun salon RPS en ligne pour le moment. Ouvre le Squid Game
                pour créer le premier salon.
              </div>
            )}

            {!rpsRooms.loading && (rpsRooms.data ?? []).length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {(rpsRooms.data ?? []).slice(0, 4).map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem(
                        "squid_rps_match",
                        JSON.stringify({
                          id: room.id,
                          joueurHoteId: room.joueurHoteId,
                          joueurHotePseudo: room.joueurHotePseudo,
                          joueurInviteId: room.joueurInviteId,
                          joueurInvitePseudo: room.joueurInvitePseudo,
                          scoreHote: room.scoreHote,
                          scoreInvite: room.scoreInvite,
                          scoreCible: room.scoreCible,
                          round: room.round,
                          statut: room.statut,
                        }),
                      )
                      onNavigate("rpsMatch")
                    }}
                    className="rounded-2xl border border-[#bbf7d0] bg-white p-4 text-left shadow-[0_12px_24px_rgba(22,163,74,0.08)] transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#16a34a]">
                          Salon
                        </p>
                        <p className="mt-2 text-base font-bold text-[#0f172a]">
                          {room.joueurHotePseudo} vs{" "}
                          {room.joueurInvitePseudo || "À rejoindre"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#ecfdf5] px-2 py-1 text-xs font-semibold text-[#166534]">
                        {room.scoreHote}-{room.scoreInvite}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#64748b]">
                      <span>Objectif: {room.scoreCible}</span>
                      <span>Manche {room.round}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[#edf1ee] bg-white p-4 md:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#16a34a]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Réussites publiées
                </h2>
              </div>
              <button
                onClick={() => onNavigate("messages")}
                className="text-xs font-semibold text-[#15803d]"
              >
                Voir plus
              </button>
            </div>

            {feed.loading && <Skeleton className="h-24 rounded-2xl" />}
            {!feed.loading && (feed.data ?? []).length === 0 && (
              <p className="rounded-2xl bg-[#f8fafc] border border-[#edf1ee] p-5 text-sm text-[#64748b]">
                Aucune réussite publiée pour le moment.
              </p>
            )}

            <div className="space-y-3">
              {(feed.data ?? [])
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime(),
                )
                .slice(0, 3)
                .map((post) => {
                  const quizRef =
                    post.lienType === "quiz_global"
                      ? post.referenceId
                      : undefined
                  return (
                    <Card
                      key={post.id}
                      className="border-[#edf1ee] bg-[#fdfefd] shadow-none"
                    >
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={post.auteur}
                            size="sm"
                            className="ring-2 ring-[#d9efe2]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0f172a] truncate">
                              <UserName user={post.auteur} />
                            </p>
                            <p className="text-[10px] text-[#64748b]">
                              {post.creeLe
                                ? new Date(post.creeLe).toLocaleDateString(
                                    "fr-MG",
                                  )
                                : "À l'instant"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[#334155] leading-6">
                          {post.texte}
                        </p>
                        {quizRef && (
                          <div className="flex items-center justify-between rounded-xl border border-[#e6f4ea] bg-white p-3">
                            <span className="text-xs font-semibold text-[#166534]">
                              Salon Quizz Global · Rejoignez le duel
                            </span>
                            <Button
                              size="sm"
                              loading={joiningQuiz === quizRef}
                              onClick={() => void joinQuizGlobal(quizRef)}
                            >
                              Joindre
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#edf1ee] bg-white p-4 md:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#ef4444]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Parties en direct
                </h2>
              </div>
              <button
                onClick={() => onNavigate("spectator")}
                className="flex items-center gap-1 text-xs font-semibold text-[#15803d]"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>

            {live.loading && <Skeleton className="h-24 rounded-2xl" />}
            {!live.loading && !live.data?.length && (
              <p className="rounded-2xl bg-[#f8fafc] border border-[#edf1ee] p-5 text-sm text-[#64748b]">
                Aucune partie en cours. Lancez une partie depuis le lobby.
              </p>
            )}

            <div className="space-y-3">
              {(live.data ?? []).slice(0, 5).map((m) => (
                <Card
                  key={m.id}
                  className="cursor-pointer border-[#edf1ee] bg-[#fdfefd] shadow-none hover:border-[#bbf7d0] transition-colors"
                  onClick={() => onNavigate("spectator", Number(m.id))}
                >
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <UserAvatar
                        user={m.joueurHote}
                        size="sm"
                        className="ring-2 ring-[#d9efe2]"
                      />
                      <span className="text-sm font-semibold text-[#0f172a] truncate">
                        <UserName user={m.joueurHote} />
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-2">
                      <Badge
                        variant="live"
                        className="mb-1 text-[9px] px-1.5 py-0.5"
                      >
                        LIVE
                      </Badge>
                      <span className="text-lg font-black tracking-[-0.04em] text-[#0f172a]">
                        {m.scoreHote}-{m.scoreInvite}
                      </span>
                      <span className="text-[10px] text-[#64748b]">
                        {m.theme.nom}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                      <span className="text-sm font-semibold text-[#0f172a] truncate">
                        {m.joueurInvite ? (
                          <UserName user={m.joueurInvite} />
                        ) : (
                          "…"
                        )}
                      </span>
                      <UserAvatar
                        user={m.joueurInvite}
                        size="sm"
                        className="ring-2 ring-[#d9efe2]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Parties en attente supprimées par demande */}

          <section className="rounded-[28px] border border-[#edf1ee] bg-white p-4 md:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#ef4444]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Défis lancés
                </h2>
              </div>
              <button
                onClick={() => onNavigate("spectator")}
                className="flex items-center gap-1 text-xs font-semibold text-[#15803d]"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>

            {available.loading && <Skeleton className="h-24 rounded-2xl" />}
            {!available.loading && !available.data?.length && (
              <p className="rounded-2xl bg-[#f8fafc] border border-[#edf1ee] p-5 text-sm text-[#64748b]">
                Aucun défi lancé pour le moment.
              </p>
            )}

            <div className="space-y-3">
              {(available.data ?? []).slice(0, 5).map((m) => (
                <Card
                  key={m.id}
                  className="cursor-pointer border-[#edf1ee] bg-[#fdfefd] shadow-none hover:border-[#bbf7d0] transition-colors"
                >
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <UserAvatar
                        user={m.joueurHote}
                        size="sm"
                        className="ring-2 ring-[#d9efe2]"
                      />
                      <span className="text-sm font-semibold text-[#0f172a] truncate">
                        <UserName user={m.joueurHote} />
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-2">
                      <span className="text-lg font-black tracking-[-0.04em] text-[#0f172a]">
                        {m.scoreCible}
                      </span>
                      <span className="text-[10px] text-[#64748b]">
                        objectif
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                      <span className="text-sm font-semibold text-[#0f172a] truncate">
                        {m.theme.nom}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate("spectator", Number(m.id))
                          }}
                        >
                          Spectateur
                        </Button>
                        <Button
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const res = await api.rejoindrePartie(
                                Number(m.id),
                              )
                              const id = Number(res.rejoindrePartie.id)
                              const themeName = (
                                m.theme?.nom || ""
                              ).toLowerCase()
                              if (themeName.includes("lapin")) {
                                onNavigate("rabbitRace", id)
                              } else {
                                onNavigate("game", id)
                              }
                            } catch {
                              onNavigate("categories")
                            }
                          }}
                        >
                          Rejoindre
                        </Button>
                        {Number(user?.id) === Number(m.joueurHote?.id) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            loading={cancelling === Number(m.id)}
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleDeleteMatch(Number(m.id))
                            }}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#edf1ee] bg-white p-4 md:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#22c55e]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Parties RPS en ligne
                </h2>
              </div>
            </div>

            {rpsRooms.loading && <Skeleton className="h-24 rounded-2xl" />}
            {!rpsRooms.loading && !(rpsRooms.data ?? []).length && (
              <p className="rounded-2xl bg-[#f8fafc] border border-[#edf1ee] p-5 text-sm text-[#64748b]">
                Aucune partie pierre, papier, ciseaux en cours.
              </p>
            )}

            <div className="space-y-3">
              {(rpsRooms.data ?? []).map((room) => {
                const isHost = Number(user?.id) === Number(room.joueurHoteId)
                return (
                  <Card
                    key={room.id}
                    className="border-[#edf1ee] bg-[#fdfefd] shadow-none"
                  >
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <UserAvatar
                          user={{ pseudo: room.joueurHotePseudo }}
                          size="sm"
                          className="ring-2 ring-[#d9efe2]"
                        />
                        <span className="text-sm font-semibold text-[#0f172a] truncate">
                          {room.joueurHotePseudo}
                        </span>
                      </div>

                      <div className="flex flex-col items-center shrink-0 px-2">
                        <span className="text-lg font-black tracking-[-0.04em] text-[#0f172a]">
                          {room.scoreHote}-{room.scoreInvite}
                        </span>
                        <span className="text-[10px] text-[#64748b]">
                          objectif {room.scoreCible}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className="text-sm font-semibold text-[#0f172a] truncate">
                          vs {room.joueurInvitePseudo || "…"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              sessionStorage.setItem(
                                "squid_rps_match",
                                JSON.stringify({
                                  id: room.id,
                                  joueurHoteId: room.joueurHoteId,
                                  joueurHotePseudo: room.joueurHotePseudo,
                                  joueurInviteId: room.joueurInviteId,
                                  joueurInvitePseudo: room.joueurInvitePseudo,
                                  scoreHote: room.scoreHote,
                                  scoreInvite: room.scoreInvite,
                                  scoreCible: room.scoreCible,
                                  round: room.round,
                                  statut: room.statut,
                                }),
                              )
                              onNavigate("rpsMatch")
                            }}
                          >
                            Spectateur
                          </Button>
                          {isHost && (
                            <Button
                              size="sm"
                              variant="destructive"
                              loading={cancelling === Number(room.id)}
                              onClick={async () => {
                                await handleDeleteRpsRoom(room.id)
                              }}
                            >
                              Supprimer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#edf1ee] bg-white p-4 md:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-2.5 rounded-full bg-[#22c55e]" />
              <h2 className="text-base font-bold text-[#0f172a]">Catégories</h2>
            </div>

            {themes.loading && <Skeleton className="h-32 rounded-2xl" />}
            {!themes.loading && !themes.data?.length && (
              <p className="text-sm text-[#64748b]">
                Aucun thème pour le moment.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(themes.data ?? []).map((cat, i) => {
                const Icon = ICONS[i % ICONS.length]
                const color = themeColor(cat.nom, i)
                return (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate("lobby")}
                    className="group rounded-2xl border border-[#edf1ee] bg-[#fcfffd] p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,118,110,0.08)]"
                  >
                    <div
                      className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl"
                      style={{ background: `${color}18` }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>
                    <p className="text-xs font-bold text-[#0f172a] leading-tight">
                      {cat.nom}
                    </p>
                    <p className="mt-1 text-[10px] text-[#64748b]">
                      {cat.nombreQuestions} questions
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="border-[#edf1ee] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-xl bg-[#ecfdf5] p-2 text-[#15803d]">
                  <Gamepad2 size={16} />
                </div>
                <h3 className="font-bold text-sm text-[#0f172a]">
                  Jouer rapidement
                </h3>
              </div>
              <Button
                className="w-full font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white"
                size="lg"
                onClick={startPlay}
                loading={loadingPlay}
              >
                <Zap size={18} /> Créer une partie
              </Button>
              <p className="mt-2 text-center text-[11px] text-[#64748b]">
                Un adversaire peut rejoindre votre salon en quelques secondes.
              </p>
            </CardContent>
          </Card>

          <div className="rounded-[28px] border border-[#edf1ee] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[#facc15]" />
                <h2 className="text-base font-bold text-[#0f172a]">
                  Top joueurs
                </h2>
              </div>
              <button
                onClick={() => onNavigate("leaderboard")}
                className="flex items-center gap-1 text-xs font-semibold text-[#15803d]"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>

            {!board.data?.length && !board.loading && (
              <p className="p-3 text-sm text-[#64748b]">
                Pas encore de classement.
              </p>
            )}

            <div className="space-y-2">
              {(board.data ?? []).map((p, i) => (
                <div
                  key={p.utilisateur.id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                    p.utilisateur.id === user?.id
                      ? "bg-[#f0fdf4]"
                      : "bg-[#f8fafc]"
                  } ${i < (board.data?.length ?? 0) - 1 ? "" : ""}`}
                >
                  <span
                    className={`w-5 text-center text-sm font-black ${RANK_COLORS[p.rang] ?? "text-[#64748b]"}`}
                  >
                    {p.rang}
                  </span>
                  <UserAvatar
                    user={p.utilisateur}
                    size="sm"
                    className="ring-2 ring-[#d9efe2]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#0f172a] truncate">
                        <UserName user={p.utilisateur} />
                      </p>
                      {p.utilisateur.id === user?.id && (
                        <Badge
                          variant="category"
                          className="text-[9px] px-1.5 py-0"
                        >
                          Vous
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-[#64748b]">
                      {p.victoires}V · {Math.round(p.tauxReussite)}% WR
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#15803d]">
                    {p.parties} parties
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-[#edf1ee] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <CardContent className="p-4 flex flex-col gap-3">
              <h3 className="font-bold text-sm text-[#0f172a]">
                Vos statistiques
              </h3>
              {[
                {
                  label: "Parties jouées",
                  value: String(profil.data?.partiesJouees ?? 0),
                  icon: Swords,
                  color: "#16a34a",
                },
                {
                  label: "Victoires",
                  value: String(profil.data?.victoires ?? 0),
                  icon: Trophy,
                  color: "#facc15",
                },
                {
                  label: "Win rate",
                  value: `${wrPct(profil.data?.victoires ?? 0, profil.data?.partiesJouees ?? 0)}%`,
                  icon: TrendingUp,
                  color: "#22c55e",
                },
                {
                  label: "Gains",
                  value: profil.data?.cumulGains ?? "0",
                  icon: Zap,
                  color: "#0f766e",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div
                    className="size-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}18` }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-xs text-[#64748b] flex-1">{label}</span>
                  <span className="text-xs font-bold text-[#0f172a]">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
