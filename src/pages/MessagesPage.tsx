import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Check, MapPin, Search, Send } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
} from "../components/ui"
import { api, type Conversation } from "../lib/api"
import { useAsync } from "../lib/hooks"
import { initial, relativeTime } from "../lib/format"
import UserName from "../components/UserName"
import { useAuth } from "../lib/auth"
import usePageTitle from "@/lib/usePageTitle"

type Filter = "tous" | "non_lues" | "groupe"

type Selection = {
  type: "ami" | "groupe"
  id: number
  slug?: string
  villeNom?: string
}

type ChatMessage = {
  id: string
  contenu: string
  creeLe: string
  auteur: {
    id: string
    pseudo?: string
    firstName?: string | null
    lastName?: string | null
    villeOrigine?: string | null
  }
}

const FILTERS: Array<{ id: Filter label: string }> = [
  { id: "tous", label: "Tous" },
  { id: "non_lues", label: "Non lues" },
  { id: "groupe", label: "Groupe de ville" },
]

function matchesSearch(text: string | null | undefined, term: string): boolean {
  if (!term) return true
  return (text ?? "").toLowerCase().includes(term)
}

function PersonAvatar({
  user,
  size = "sm",
  online,
}: {
  user?: { pseudo?: string | null photoProfil?: string | null } | null
  size?: "sm" | "md" | "lg" | "xl"
  online?: boolean
}) {
  return (
    <Avatar size={size} online={online}>
      {user?.photoProfil ? (
        <AvatarImage src={user.photoProfil} alt={user.pseudo ?? ""} />
      ) : (
        <AvatarFallback>{initial(user?.pseudo)}</AvatarFallback>
      )}
    </Avatar>
  )
}

type Auteur = {
  id: string
  pseudo?: string
  firstName?: string | null
  lastName?: string | null
  villeOrigine?: string | null
}

async function fetchMessages(sel: Selection): Promise<ChatMessage[]> {
  const toChat = (
    raw: Array<{
      id: string
      contenu: string
      creeLe?: string
      expediteur?: Partial<Auteur> | null
      utilisateur?: Partial<Auteur> | null
    }>,
  ) =>
    raw
      .filter((m) => Boolean(m?.contenu))
      .map((m) => ({
        id: String(m.id),
        contenu: m.contenu,
        creeLe: m.creeLe ?? "",
        auteur: {
          id: String(m.expediteur?.id ?? m.utilisateur?.id ?? "?"),
          pseudo: m.expediteur?.pseudo ?? m.utilisateur?.pseudo,
          firstName: m.expediteur?.firstName ?? m.utilisateur?.firstName,
          lastName: m.expediteur?.lastName ?? m.utilisateur?.lastName,
          villeOrigine:
            m.expediteur?.villeOrigine ?? m.utilisateur?.villeOrigine,
        },
      }))
      .sort(
        (a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime(),
      )

  if (sel.type === "ami") {
    const data = await api.messagesAmi(sel.id, 30)
    return toChat(data.messagesAmi ?? [])
  }
  const data = await api.messagesSalon(sel.slug!, 30)
  return toChat(data.messagesSalon ?? [])
}

export default function MessagesPage() {
  usePageTitle("Messages")
  const { user } = useAuth()
  const friends = useAsync(() => api.mesAmis().then((d) => d.mesAmis), [])
  const [convos, setConvos] = useState<Conversation[]>([])
  const [convosLoading, setConvosLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("tous")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Selection | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [draft, setDraft] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)

  const loadConvos = async () => {
    try {
      const data = await api.discussions()
      setConvos(data.discussions ?? [])
      setConvosLoading(false)
    } catch {
      setConvosLoading(false)
    }
  }

  useEffect(() => {
    void loadConvos()
    const interval = window.setInterval(() => void loadConvos(), 10000)
    return () => window.clearInterval(interval)
  }, [])

  const term = search.trim().toLowerCase()

  const onlineFriends = useMemo(() => {
    return (friends.data ?? []).filter(
      (f) =>
        f.enLigne &&
        (matchesSearch(f.pseudo, term) ||
          matchesSearch(f.firstName, term) ||
          matchesSearch(f.villeOrigine, term)),
    )
  }, [friends.data, term])

  const filteredConvos = useMemo(() => {
    let list = convos
    if (filter === "non_lues")
      list = list.filter((c) => c.type === "ami" && c.nonLus > 0)
    else if (filter === "groupe") list = list.filter((c) => c.type === "groupe")
    return list.filter(
      (c) =>
        matchesSearch(c.adversaire?.pseudo, term) ||
        matchesSearch(c.adversaire?.firstName, term) ||
        matchesSearch(c.adversaire?.villeOrigine, term) ||
        matchesSearch(c.ville?.nom, term),
    )
  }, [convos, filter, term])

  const totalNonLues = useMemo(
    () =>
      convos
        .filter((c) => c.type === "ami")
        .reduce((sum, c) => sum + (c.nonLus || 0), 0),
    [convos],
  )

  const openConversation = (conv: Conversation) => {
    if (conv.type === "ami" && conv.adversaire) {
      setSelected({
        type: "ami",
        id: Number(conv.adversaire.id),
        villeNom: conv.adversaire.villeOrigine ?? undefined,
      })
    } else if (conv.type === "groupe" && conv.ville) {
      setSelected({
        type: "groupe",
        id: 0,
        slug: conv.ville.slug,
        villeNom: conv.ville.nom,
      })
    }
  }

  const markReadIfAmi = (s: Selection) => {
    if (s.type !== "ami") return
    void (async () => {
      try {
        await api.marquerMessagesLus(s.id)
        window.dispatchEvent(new CustomEvent("messagesRead"))
        void loadConvos()
      } catch {
        // ignore
      }
    })()
  }

  useEffect(() => {
    if (!selected) {
      setMessages([])
      return
    }
    setMessagesLoading(true)
    fetchMessages(selected)
      .then((msgs) => {
        setMessages(msgs)
        markReadIfAmi(selected)
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false))
  }, [selected])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, selected])

  const sendMessage = async () => {
    const text = draft.trim()
    if (!selected || !text) return
    try {
      if (selected.type === "ami")
        await api.envoyerMessageAmi(selected.id, text)
      else await api.envoyerMessageVille(selected.slug!, text)
      setDraft("")
      const msgs = await fetchMessages(selected)
      setMessages(msgs)
      void loadConvos()
    } catch {
      // keep the chat usable on failure
    }
  }

  const selectedConvo = useMemo<Conversation | null>(() => {
    if (!selected) return null
    return (
      convos.find(
        (c) =>
          (c.type === "ami" &&
            c.adversaire &&
            Number(c.adversaire.id) === selected.id) ||
          (c.type === "groupe" && c.ville?.slug === selected.slug),
      ) ?? null
    )
  }, [convos, selected])

  const selectedTitle =
    selected?.type === "groupe" ? (
      (selected.villeNom ?? "Groupe de ville")
    ) : selectedConvo?.adversaire ? (
      <UserName user={selectedConvo.adversaire} />
    ) : null

  const filterButtons = (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f3faf4] p-1">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setFilter(id)}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
            filter === id
              ? "bg-white text-[#15803d] shadow-sm"
              : "text-[#64748b] hover:text-[#1f2a1f]"
          }`}
        >
          {label}
          {id === "non_lues" && totalNonLues > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-bold text-white">
              {totalNonLues > 9 ? "9+" : totalNonLues}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-16 md:px-6">
      <div className="mb-5 rounded-3xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] p-5 text-white shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
          Messages
        </p>
        <h1 className="mt-2 text-3xl font-black">Messagerie</h1>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm md:h-[calc(100vh-190px)] md:min-h-[560px]">
        <div className="flex min-h-[560px] flex-col md:h-full md:flex-row">
          {/* ── Panneau liste ── */}
          <aside
            className={`${
              selected ? "hidden md:flex" : "flex"
            } w-full flex-col md:w-[340px] md:flex-shrink-0 md:border-r md:border-[#dfeae0]`}
          >
            <div className="space-y-3 border-b border-[#dfeae0] bg-[#f9fdf9] p-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un ami…"
                  className="w-full rounded-full border border-[#d9e7dd] bg-white pl-9 pr-3 py-2 text-sm text-[#1f2a1f] outline-none placeholder:text-[#64748b] focus:border-[#16a34a]"
                />
              </div>

              {filter !== "groupe" && (
                <div>
                  <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                    En ligne ({onlineFriends.length})
                  </p>
                  {onlineFriends.length === 0 ? (
                    <p className="px-1 text-xs text-[#64748b]">
                      Aucun ami connecté pour le moment.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {onlineFriends.map((friend) => (
                        <button
                          key={friend.id}
                          onClick={() => {
                            const conv: Conversation = {
                              type: "ami",
                              identifiant: `ami:${friend.id}`,
                              adversaire: friend,
                              dernierMessage: "",
                              dernierMessageHorodatage: "",
                              nonLus: 0,
                            }
                            openConversation(conv)
                          }}
                          className="flex items-center gap-2.5 rounded-xl border border-[#edf6ef] bg-white p-2 text-left transition hover:bg-[#f3faf4]"
                        >
                          <PersonAvatar user={friend} online />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#1f2a1f]">
                              <UserName user={friend} />
                            </p>
                            <p className="truncate text-[11px] text-[#64748b]">
                              {friend.villeOrigine || "Ville non renseignée"}
                            </p>
                          </div>
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-[#22c55e]"
                            title="En ligne"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-b border-[#dfeae0] bg-white p-3">
              {filterButtons}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {convosLoading && (
                <p className="px-2 py-3 text-sm text-[#64748b]">
                  Chargement des discussions…
                </p>
              )}

              {!convosLoading && filteredConvos.length === 0 && (
                <div className="m-2 rounded-2xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-4 text-sm text-[#64748b]">
                  {filter === "non_lues"
                    ? "Aucun message non lu."
                    : filter === "groupe"
                      ? "Aucun groupe de ville disponible."
                      : "Aucune discussion pour le moment."}
                </div>
              )}

              <div className="space-y-1">
                {filteredConvos.map((conv) => {
                  const active =
                    conv.type === "ami" &&
                    conv.adversaire &&
                    selected?.type === "ami" &&
                    Number(conv.adversaire.id) === selected.id
                  return (
                    <button
                      key={conv.identifiant}
                      onClick={() => openConversation(conv)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                        active
                          ? "border-[#16a34a] bg-[#f3faf4]"
                          : conv.nonLus > 0
                            ? "border-[#e2e8f0] bg-[#fbfdff]"
                            : "border-transparent bg-white hover:bg-[#f3faf4]"
                      }`}
                    >
                      {conv.type === "groupe" ? (
                        <Avatar size="sm" className="bg-[#16a34a]/10">
                          <AvatarFallback>
                            <MapPin size={16} className="text-[#16a34a]" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <PersonAvatar
                          user={conv.adversaire}
                          online={conv.adversaire?.enLigne}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            conv.nonLus > 0
                              ? "font-bold text-[#1f2a1f]"
                              : "font-semibold text-[#1f2a1f]"
                          }`}
                        >
                          {conv.type === "groupe" ? (
                            (conv.ville?.nom ?? "Groupe de ville")
                          ) : conv.adversaire ? (
                            <UserName user={conv.adversaire} />
                          ) : (
                            "Ami"
                          )}
                        </p>
                        <p
                          className={`truncate text-xs ${
                            conv.nonLus > 0
                              ? "font-semibold text-[#1f2a1f]"
                              : "text-[#64748b]"
                          }`}
                        >
                          {conv.dernierMessage
                            ? `${
                                user &&
                                conv.dernierExpediteur &&
                                Number(conv.dernierExpediteur.id) ===
                                  Number(user.id)
                                  ? "Vous : "
                                  : ""
                              }${conv.dernierMessage}`
                            : "Nouvelle discussion"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {conv.dernierMessageHorodatage && (
                          <span className="text-[10px] text-[#64748b]">
                            {relativeTime(conv.dernierMessageHorodatage)}
                          </span>
                        )}
                        {conv.nonLus > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#16a34a] px-1.5 text-[10px] font-bold text-white">
                            {conv.nonLus > 9 ? "9+" : conv.nonLus}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* ── Panneau conversation ── */}
          <section
            className={`${
              selected ? "flex" : "hidden md:flex"
            } min-h-0 flex-1 flex-col bg-[#eef5ef]`}
          >
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <Avatar size="lg" className="bg-[#16a34a]/10">
                  <AvatarFallback>
                    <Check size={24} className="text-[#16a34a]" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold text-[#1f2a1f]">
                  Votre messagerie
                </p>
                <p className="max-w-xs text-xs text-[#64748b]">
                  Choisissez une discussion à gauche pour afficher les messages.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-[#dfeae0] bg-white px-3 py-2.5">
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Retour"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9e7dd] text-[#64748b] hover:bg-[#f3faf4] md:hidden"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  {selected.type === "groupe" ? (
                    <Avatar size="sm" className="bg-[#16a34a]/10">
                      <AvatarFallback>
                        <MapPin size={16} className="text-[#16a34a]" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <PersonAvatar
                      user={selectedConvo?.adversaire}
                      online={selectedConvo?.adversaire?.enLigne}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1f2a1f]">
                      {selected.type === "groupe" ? (
                        (selected.villeNom ?? "Groupe de ville")
                      ) : selectedConvo?.adversaire ? (
                        <UserName user={selectedConvo.adversaire} />
                      ) : (
                        "Conversation"
                      )}
                    </p>
                    <p className="text-[10px] text-[#64748b]">
                      {selected.type === "groupe"
                        ? "Salon de discussion de ville"
                        : selectedConvo?.adversaire?.enLigne
                          ? "En ligne"
                          : "Hors ligne"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4">
                  {messagesLoading && (
                    <p className="text-center text-xs text-[#64748b]">
                      Chargement…
                    </p>
                  )}
                  {!messagesLoading && messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#d9e7dd] bg-white/80 p-4 text-sm text-[#64748b]">
                      Aucun message pour le moment. Écrivez le premier !
                    </div>
                  )}
                  {messages.map((message) => {
                    const isMine =
                      String(message.auteur.id) === String(user?.id)
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                            isMine
                              ? "bg-[#16a34a] text-white"
                              : "bg-white text-[#1f2a1f]"
                          }`}
                        >
                          {!isMine && (
                            <p
                              className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                isMine ? "text-white/70" : "text-[#64748b]"
                              }`}
                            >
                              <UserName user={message.auteur} />
                            </p>
                          )}
                          <p className="text-sm leading-relaxed">
                            {message.contenu}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isMine ? "text-white/70" : "text-[#64748b]"
                            }`}
                          >
                            {relativeTime(message.creeLe)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-[#dfeae0] bg-white p-3">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    placeholder={
                      selected.type === "groupe"
                        ? `Écrire dans ${selected.villeNom ?? "le groupe"}…`
                        : "Écrire un message…"
                    }
                    className="flex-1 rounded-full border border-[#d9e7dd] bg-[#f9fdf9] px-4 py-2.5 text-sm text-[#1f2a1f] outline-none placeholder:text-[#64748b] focus:border-[#16a34a]"
                  />
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim()}
                  >
                    <Send size={14} /> Envoyer
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}
