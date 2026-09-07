export class GraphqlError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "GraphqlError";
    this.code = code;
  }
}

const GRAPHQL_URL = import.meta.env.VITE_API_URL || "https://quizz-leka.onrender.com/graphql/";

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const access = token ?? (typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null);
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  let json: { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };
  try {
    json = await res.json();
  } catch {
    throw new GraphqlError("Le serveur n'a pas renvoyé une réponse valide. Vérifiez que le backend est démarré.");
  }

  if (json.errors?.length) {
    const first = json.errors[0];
    throw new GraphqlError(first.message || "Erreur GraphQL", first.extensions?.code);
  }
  if (json.data === undefined || json.data === null) {
    throw new GraphqlError("Réponse GraphQL vide.");
  }
  return json.data;
}
