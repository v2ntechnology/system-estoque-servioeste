// Utilitários dos handlers simulados: erros no formato da API, espera, cenários de tela, sessão e permissões.
import { delay, HttpResponse } from "msw"

import { pode, type Acao } from "@/lib/papeis"
import type { Eu } from "@/lib/tipos"

import { demo, eu } from "./db"

/** Todas as rotas da API, em qualquer origem (navegador e testes). */
export const API = "*/api/v1"

export const erro = (status: number, detail: string) => HttpResponse.json({ detail }, { status })

/** Lê ?cenario=vazio|erro da página aberta, para mostrar listas vazias e falhas de carga na demonstração. */
export function cenario(): "vazio" | "erro" | null {
  try {
    const c = new URL(window.location.href).searchParams.get("cenario")
    return c === "vazio" || c === "erro" ? c : null
  } catch {
    return null
  }
}

type Contexto = { eu: Eu; url: URL; params: Record<string, string>; request: Request }
type Opcoes = { acao?: Acao; lista?: boolean }

/**
 * Envolve um handler com o que a API fará em toda rota: sem conexão simulada, pequena espera, pessoa da sessão
 * (vinda do Hub) e permissão do papel. `lista: true` aplica ?cenario=vazio|erro.
 */
export function rota(fn: (ctx: Contexto) => Response | Promise<Response> | unknown, opcoes: Opcoes = {}) {
  return async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    if (demo().semConexao) return HttpResponse.error()
    if (import.meta.env.MODE !== "test") await delay(250)
    const pessoa = eu()
    if (!pessoa) return erro(401, "Sessão do Hub não encontrada. Entre pelo Hub de novo.")
    if (opcoes.acao && !pode(pessoa, opcoes.acao)) return erro(403, "Seu papel não permite esta ação.")
    if (opcoes.lista) {
      const c = cenario()
      if (c === "erro") return erro(500, "Falha simulada ao carregar (cenario=erro).")
      if (c === "vazio") return HttpResponse.json([])
    }
    const r = await fn({ eu: pessoa, url: new URL(request.url), params: params as Record<string, string>, request })
    return r instanceof Response ? r : HttpResponse.json(r as Parameters<typeof HttpResponse.json>[0])
  }
}

/** Unidades que a pessoa pode ver, opcionalmente filtradas por ?unidade=. */
export function unidadesVisiveis(pessoa: Eu, url: URL): string[] {
  const filtro = url.searchParams.get("unidade")
  return filtro ? pessoa.unidades.filter((u) => u === filtro) : pessoa.unidades
}

export const podeVerUnidade = (pessoa: Eu, unidade: string) => pessoa.unidades.includes(unidade)
