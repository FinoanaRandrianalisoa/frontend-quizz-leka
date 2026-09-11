const base =
  import.meta.env.VITE_BACKEND_URL as string | undefined ||
  "https://quizz-leka-production.up.railway.app"

const BACKEND_URL = base.replace(/\/$/, "")

const GRAPHQL_URL = `${BACKEND_URL}/graphql/`

const WS_URL =
  import.meta.env.VITE_WS_URL as string | undefined ||
  BACKEND_URL.replace(/^http/, "ws")

export { BACKEND_URL, GRAPHQL_URL, WS_URL }

export default {
  BACKEND_URL,

  GRAPHQL_URL,

  WS_URL,
}
