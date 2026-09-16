const base =
  import.meta.env.VITE_BACKEND_URL as string | undefined ||
  "https://quizz-leka-production.up.railway.app"

const BACKEND_URL = base.replace(/\/$/, "")

const GRAPHQL_URL = `${BACKEND_URL}/graphql/`

function resolveWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit.replace(/\/$/, "")
  // En développement, on passe par le proxy same-origin du serveur Vite
  // (`/ws` -> backend, configuré dans vite.config.ts). Une connexion
  // WebSocket directe vers l'hôte distant est bloquée dans l'aperçu
  // (CORS/CSP/mixed-content), ce qui casse le temps réel du lobby.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const scheme = window.location.protocol === "https:" ? "wss" : "ws"
    return `${scheme}://${window.location.host}`
  }
  return BACKEND_URL.replace(/^http/, "ws")
}

const WS_URL = resolveWsUrl()

export { BACKEND_URL, GRAPHQL_URL, WS_URL }

export default {
  BACKEND_URL,

  GRAPHQL_URL,

  WS_URL,
}
