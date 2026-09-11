import { useMemo, useState } from "react"

import {
  Button,
  Card,
  CardContent,
  Avatar,
  AvatarFallback,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "../components/ui"

import { api, type Theme } from "../lib/api"

import { useAsync } from "../lib/hooks"

import type { NavigateFn } from "../App"

import { initial } from "../lib/format"

import usePageTitle from "@/lib/usePageTitle"

export default function CategoryThemesPage({
  onNavigate,
  category,
}: {
  onNavigate: NavigateFn
  category: string | null
}) {
  usePageTitle(category ?? "Catégorie")

  const themes = useAsync(() => api.themes().then((d) => d.themes), [])

  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)

  const [open, setOpen] = useState(false)

  const [score, setScore] = useState<number>(8)

  const filtered = useMemo(() => {
    if (!category) return [] as Theme[]

    if (category === "Quizz") {
      return (themes.data ?? []).filter(
        (theme) => !/lapin|rabbit/i.test(theme.nom),
      )
    }

    return [] as Theme[]
  }, [themes.data, category])

  const isRabbit = category === "course lapin"

  const isSquid = category === "Squid Game"

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{category ?? "Catégorie"}</h1>
          <p className="text-sm text-[#64748b]">
            Choisissez un thème disponible pour cette catégorie.
          </p>
        </div>
        <Button variant="outline" onClick={() => onNavigate("categories")}>
          Retour
        </Button>
      </div>

      {isRabbit ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md"
            onClick={() => onNavigate("rabbitRace")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar size="md">
                <AvatarFallback>🐰</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1f2a1f]">
                  Course des Lapins
                </p>
                <p className="text-xs text-[#64748b]">
                  Un jeu simple de course pour 2–4 joueurs, lancez le dé et
                  atteignez la case 24.
                </p>
              </div>
              <div className="text-sm text-[#A0A0A0]">Jouer</div>
            </CardContent>
          </Card>
        </div>
      ) : isSquid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md"
            onClick={() => onNavigate("squidGame")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar size="md">
                <AvatarFallback>✊</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1f2a1f]">
                  Pierre, Papier, Ciseaux
                </p>
                <p className="text-xs text-[#64748b]">
                  Défiez un autre joueur en ligne et gagnez la meilleure des
                  manches.
                </p>
              </div>
              <div className="text-sm text-[#A0A0A0]">Jouer</div>
            </CardContent>
          </Card>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9e7dd] bg-[#f9fdf9] p-6 text-center text-[#64748b]">
          Aucun thème disponible pour cette catégorie pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((t: Theme) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md"
              onClick={() => {
                setSelectedTheme(t)
                setOpen(true)
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar size="md">
                  <AvatarFallback>{initial(t.nom)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1f2a1f]">
                    {t.nom}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {t.nombreQuestions} questions
                  </p>
                </div>
                <div className="text-sm text-[#A0A0A0]">Jouer</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>Lancer une partie — {selectedTheme?.nom}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <p className="text-sm text-[#64748b]">
              Choisissez le score cible à atteindre pour gagner.
            </p>
            <input
              type="number"
              min={1}
              value={score}
              onChange={(e) =>
                setScore(Math.max(1, Number(e.target.value || 1)))
              }
              className="w-36 pl-3 pr-2 py-2 rounded-lg border border-[#D9D9D9] bg-white text-sm"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={async () => {
              if (!selectedTheme) return

              try {
                const res = await api.creerPartie(
                  Number(selectedTheme.id),
                  Number(score),
                )

                const id = Number(res.creerPartie.id)

                setOpen(false)

                onNavigate("game", id)
              } catch {
                setOpen(false)

                onNavigate("categories")
              }
            }}
          >
            Créer et lancer
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
