export function relativeTime(iso?: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "Hier"
  if (d < 7) return `Il y a ${d}j`
  return date.toLocaleDateString("fr-MG")
}

export function formatPoints(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString("fr-MG", { maximumFractionDigits: 2 })
}

export function initial(name?: string | null): string {
  return (name || "?").trim().charAt(0).toUpperCase()
}

export function nameParts(
  user?: {
    pseudo?: string | null
    firstName?: string | null
    villeOrigine?: string | null
  } | null,
): {
  prenom: string
  ville: string
} {
  const prenom = (user?.firstName || user?.pseudo || "Joueur").trim()
  const ville = (user?.villeOrigine || "").trim()
  return { prenom, ville }
}

export function displayName(
  user?: {
    pseudo?: string | null
    firstName?: string | null
    villeOrigine?: string | null
  } | null,
): string {
  const { prenom, ville } = nameParts(user)
  return ville ? `${prenom} de ${ville}` : prenom
}

const THEME_COLORS = [
  "#FF6B35",
  "#004E89",
  "#06A77D",
  "#F59E0B",
  "#9B59B6",
  "#E74C3C",
  "#3498DB",
  "#E91E63",
]

export function themeColor(name: string, index = 0): string {
  let h = 0
  for (let i = 0; i < name.length; i++)
    h = (h + name.charCodeAt(i) * (i + 1)) % THEME_COLORS.length
  return THEME_COLORS[(h + index) % THEME_COLORS.length]
}

export function wrPct(victoires: number, parties: number): number {
  if (!parties) return 0
  return Math.round((victoires / parties) * 100)
}
