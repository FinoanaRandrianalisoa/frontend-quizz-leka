export class GraphqlError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = "GraphqlError"
    this.code = code
  }
}

import { GRAPHQL_URL } from "@/config/backend"

const REFRESH_MUTATION = `
  mutation($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

let refreshInFlight: Promise<string | null> | null = null

const FETCH_RETRIES = 3

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      return await fetch(url, init)
    } catch (err) {
      lastErr = err
      if (attempt < FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
      }
    }
  }
  throw lastErr
}

async function rawRefresh(): Promise<string | null> {
  const refreshToken =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null
  if (!refreshToken) return null
  let res: Response
  try {
    res = await fetchWithRetry(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: REFRESH_MUTATION,
        variables: { refreshToken },
      }),
    })
  } catch {
    return null
  }
  let json: {
    data?: { refreshToken?: { accessToken?: string refreshToken?: string } }
  }
  try {
    json = await res.json()
  } catch {
    return null
  }
  const tokens = json.data?.refreshToken
  if (!tokens?.accessToken || !tokens?.refreshToken) return null
  localStorage.setItem("access_token", tokens.accessToken)
  localStorage.setItem("refresh_token", tokens.refreshToken)
  return tokens.accessToken
}

function refreshTokens(): Promise<string | null> {
  if (refreshInFlight === null) {
    refreshInFlight = rawRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const access =
    token ??
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("access_token")
      : null)
  if (access) headers.Authorization = `Bearer ${access}`

  const res = await fetchWithRetry(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  })

  let json: {
    data?: T
    errors?: Array<{ message: string extensions?: { code?: string } }>
  }
  try {
    json = await res.json()
  } catch {
    throw new GraphqlError(
      "Le serveur n'a pas renvoyé une réponse valide. Vérifiez que le backend est démarré.",
    )
  }

  if (json.errors?.length) {
    const first = json.errors[0]
    if (
      token === undefined &&
      first.extensions?.code === "PERMISSION_DENIED" &&
      typeof localStorage !== "undefined" &&
      localStorage.getItem("refresh_token")
    ) {
      const fresh = await refreshTokens()
      if (fresh) return gql(query, variables, fresh)
    }
    throw new GraphqlError(
      first.message || "Erreur GraphQL",
      first.extensions?.code,
    )
  }
  if (json.data === undefined || json.data === null) {
    throw new GraphqlError("Réponse GraphQL vide.")
  }
  return json.data
}
