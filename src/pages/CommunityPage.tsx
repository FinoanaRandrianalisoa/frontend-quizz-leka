import { useEffect, useState } from "react"
import { MapPin, MessageSquareText, Send } from "lucide-react"
import { Button, Card, CardContent } from "../components/ui"
import { api } from "../lib/api"
import { useAsync } from "../lib/hooks"
import { relativeTime } from "../lib/format"
import UserName from "../components/UserName"
import usePageTitle from "@/lib/usePageTitle"

export default function CommunityPage({
  onNavigate,
}: {
  onNavigate?: (page: string) => void
}) {
  usePageTitle("Communauté")
  const villes = useAsync(() => api.villes().then((d) => d.villes), [])
  const [message, setMessage] = useState("")
  const [activeCity, setActiveCity] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    contenu: string
    utilisateur: { pseudo: string }
    creeLe: string
  }>>([])

  useEffect(() => {
    if (!villes.data?.length) return
    if (!activeCity) {
      setActiveCity(villes.data[0].slug)
      return
    }

    const cityExists = villes.data.some((ville) => ville.slug === activeCity)
    if (!cityExists) {
      setActiveCity(villes.data[0].slug)
    }
  }, [activeCity, villes.data])

  useEffect(() => {
    if (!activeCity) return
    void api
      .messagesSalon(activeCity, 12)
      .then((d) => setChatMessages(d.messagesSalon ?? []))
      .catch(() => setChatMessages([]))
  }, [activeCity])

  const handleSendCityMessage = async () => {
    const text = message.trim()
    if (!text || !activeCity) return

    try {
      await api.envoyerMessageVille(activeCity, text)
      setMessage("")
      const data = await api.messagesSalon(activeCity, 12)
      setChatMessages(data.messagesSalon ?? [])
    } catch {
      // best effort: the community chat stays usable even if the request fails
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16 md:px-6">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] p-5 text-white shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
          Communauté
        </p>
        <h1 className="mt-2 text-3xl font-black">Discussions de ville</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-[#1f2a1f]">
              <MapPin size={16} className="text-[#16a34a]" />
              <span className="font-semibold">Choisir une ville</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(villes.data ?? []).map((ville) => (
                <button
                  key={ville.id}
                  onClick={() => setActiveCity(ville.slug)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeCity === ville.slug
                      ? "bg-[#16a34a] text-white"
                      : "bg-[#f3faf4] text-[#1f2a1f]"
                  }`}
                >
                  {ville.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfeae0] bg-[#f9fdf9] p-3 md:p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-[#1f2a1f]">
              <MessageSquareText size={16} className="text-[#16a34a]" />
              Salon live :{" "}
              {villes.data?.find((ville) => ville.slug === activeCity)?.nom ??
                "Ville"}
            </div>

            <div className="space-y-3">
              {chatMessages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9e7dd] bg-white p-4 text-sm text-[#64748b]">
                  Aucun message dans ce salon pour le moment.
                </div>
              ) : (
                chatMessages.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-[#edf6ef] bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#1f2a1f]">
                        <UserName user={entry.utilisateur} />
                      </span>
                      <span className="text-[10px] text-[#64748b]">
                        {relativeTime(entry.creeLe)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#334155]">
                      {entry.contenu}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Écrire dans ${villes.data?.find((ville) => ville.slug === activeCity)?.nom ?? "la ville"}…`}
                className="flex-1 rounded-full border border-[#d9e7dd] bg-white px-4 py-2.5 text-sm text-[#1f2a1f] outline-none ring-0 placeholder:text-[#64748b] focus:border-[#16a34a]"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSendCityMessage()
                }}
              />
              <Button
                size="sm"
                className="gap-2"
                onClick={() => void handleSendCityMessage()}
              >
                <Send size={14} /> Envoyer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
