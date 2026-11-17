// Cliente da API do Estoque (base: Ponto e Hub). Sem login próprio: a identidade vem do Hub (constituição, núcleo IV),
// então não há token no JavaScript. Hoje as respostas vêm dos dados simulados (src/mocks) quando VITE_MOCK=true.

export class ApiError extends Error {
  status: number

  constructor(status: number, detail?: string) {
    super(detail ?? `Erro ${status}`)
    this.status = status
  }
}

export const BASE = "/api/v1"

/** Monta a URL a partir da origem da página (funciona no navegador e nos testes). */
const url = (path: string) => new URL(`${BASE}${path}`, window.location.origin).toString()

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(url(path), {
      credentials: "same-origin",
      ...init,
      headers: init.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init.headers },
    })
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Confira a internet e tente de novo.")
  }
  if (!res.ok) {
    let detail: string | undefined
    try {
      detail = ((await res.json()) as { detail?: string }).detail
    } catch {
      /* resposta sem JSON */
    }
    throw new ApiError(res.status, detail)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const comCorpo = (method: string) => <T>(path: string, body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) })

export const post = comCorpo("POST")
export const patch = comCorpo("PATCH")
export const put = comCorpo("PUT")

/** Monta "?a=1&b=2" ignorando valores vazios. */
export function query(params: Record<string, string | number | boolean | null | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}
