// Fotos e anexos nos simulados (spec 005): ficam só na memória do navegador. Recarregar a página apaga os arquivos
// (as fotos de antes aparecem como "foto indisponível"); na API eles ficam guardados no servidor.
import { http, HttpResponse } from "msw"

import type { Arquivo } from "@/lib/tipos"

import { novoId, salvar } from "../db"
import { API, erro, podeVerUnidade, rota } from "../util"

const guardados = new Map<string, { arquivo: Arquivo; conteudo: Blob; unidade: string }>()

export const urlDoArquivo = (id: string | null | undefined) => (id ? `/api/v1/arquivos/${id}` : null)

/** Guarda o arquivo e devolve a visão (mesmo formato da API). */
export async function guardarArquivo(f: File, unidade: string, soImagem: boolean): Promise<Arquivo | Response> {
  const tipo = f.type || "application/octet-stream"
  const aceito = soImagem ? tipo.startsWith("image/") : tipo.startsWith("image/") || tipo === "application/pdf"
  if (!aceito) return erro(422, soImagem ? "Tipo de arquivo não aceito. Envie uma foto (JPEG, PNG, WebP ou HEIC)."
    : "Tipo de arquivo não aceito. Envie uma foto (JPEG, PNG, WebP ou HEIC) ou PDF.")
  if (f.size > 10 * 1024 * 1024) return erro(413, "O arquivo passa de 10 MB.")
  const id = novoId("arq")
  const arquivo: Arquivo = { id, nome: f.name, tipo, tamanho: f.size, url: urlDoArquivo(id)! }
  guardados.set(id, { arquivo, conteudo: f, unidade })
  salvar()
  return arquivo
}

export const arquivosHandlers = [
  http.post(`${API}/arquivos`, rota(async ({ eu, request }) => {
    const form = await request.formData()
    const f = form.get("arquivo")
    const unidade = String(form.get("unidade_id") ?? "")
    if (!podeVerUnidade(eu, unidade)) return erro(403, "Esta unidade não está liberada para você.")
    if (!(f instanceof File)) return erro(422, "Escolha a foto.")
    return guardarArquivo(f, unidade, true)
  }, { acao: "contagem.registrar" })),

  http.get(`${API}/arquivos/:id`, rota(({ eu, params }) => {
    const g = guardados.get(params.id)
    if (!g || !podeVerUnidade(eu, g.unidade)) return erro(404, "Arquivo não encontrado.")
    return new HttpResponse(g.conteudo, { headers: { "Content-Type": g.arquivo.tipo } })
  })),
]
