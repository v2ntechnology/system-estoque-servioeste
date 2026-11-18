// Cotações, sugestões e modelos.
import { http } from "msw"

import type { AlteracaoCotacao, ItemCotacao, ModeloCotacao, NovaCotacao, Sugestao, TipoAnexo } from "@/lib/tipos"

import { agoraIso, db, novoId, salvar, verCotacao, verProduto } from "../db"
import type { CotacaoDb } from "../dados"
import { sugerirCompra } from "../regras"
import { API, erro, podeVerUnidade, rota, unidadesVisiveis } from "../util"
import { guardarArquivo } from "./arquivos"
import { registrarMovimentacao } from "./estoque"

function achar(id: string, unidades: string[]): CotacaoDb | null {
  const c = db.cotacoes.find((x) => x.id === id)
  return c && unidades.includes(c.unidade_id) ? c : null
}

function itensValidos(itens: ItemCotacao[]): string | null {
  for (const i of itens) {
    if (!db.produtos.some((p) => p.id === i.produto_id)) return "Há um produto que não está no catálogo."
    if (!Number.isFinite(i.quantidade) || i.quantidade <= 0) return "Toda quantidade precisa ser maior que zero."
    if (i.preco != null && (!Number.isFinite(i.preco) || i.preco < 0)) return "Preço inválido."
  }
  return null
}

const NOME_ANEXO: Record<TipoAnexo, string> = { proposta: "a proposta", nota_fiscal: "a nota fiscal", boleto: "o boleto" }

export const comprasHandlers = [
  http.get(`${API}/cotacoes/sugestoes`, rota(({ eu, url }) => {
    const unidade = url.searchParams.get("unidade") ?? eu.unidades[0]
    if (!podeVerUnidade(eu, unidade)) return erro(403, "Esta unidade não está liberada para você.")
    const sugestoes: Sugestao[] = db.produtos.map((p) => {
      const v = verProduto(p)
      const saldo = v.saldos[unidade]
      return { produto_id: p.id, saldo, minimo: p.minimos[unidade], consumo_mensal: v.consumo_mensal[unidade],
        sugerido: sugerirCompra(saldo, p.minimos[unidade], v.consumo_mensal[unidade], p.embalagem?.quantidade ?? null) }
    }).filter((s) => s.saldo != null && s.saldo < s.minimo && s.sugerido > 0)
    return sugestoes
  })),

  http.get(`${API}/modelos-cotacao`, rota(() => db.modelos)),

  http.post(`${API}/modelos-cotacao`, rota(async ({ request }) => {
    const corpo = (await request.json()) as Omit<ModeloCotacao, "id">
    if (!corpo.nome?.trim()) return erro(422, "Dê um nome ao modelo.")
    if (!corpo.itens?.length) return erro(422, "O modelo precisa de pelo menos um item.")
    const m: ModeloCotacao = { id: novoId("mo"), nome: corpo.nome.trim(), itens: corpo.itens }
    db.modelos.push(m)
    salvar()
    return m
  }, { acao: "cotacao.montar" })),

  http.get(`${API}/cotacoes`, rota(({ eu, url }) => {
    const unidades = unidadesVisiveis(eu, url)
    const status = url.searchParams.get("status")
    return db.cotacoes.filter((c) => unidades.includes(c.unidade_id) && (!status || c.status === status))
      .sort((a, b) => b.numero - a.numero).map(verCotacao)
  }, { lista: true })),

  http.post(`${API}/cotacoes`, rota(async ({ eu, request }) => {
    const corpo = (await request.json()) as NovaCotacao
    if (!podeVerUnidade(eu, corpo.unidade_id)) return erro(403, "Esta unidade não está liberada para você.")
    if (!corpo.titulo?.trim()) return erro(422, "Dê um título à cotação.")
    const problema = itensValidos(corpo.itens ?? [])
    if (problema) return erro(422, problema)
    const c: CotacaoDb = {
      id: novoId("co"), numero: Math.max(0, ...db.cotacoes.map((x) => x.numero)) + 1, titulo: corpo.titulo.trim(),
      unidade_id: corpo.unidade_id, status: "rascunho", fornecedor_id: null, criada_em: agoraIso(), itens: corpo.itens ?? [],
      anexos: [], eventos: [{ data: agoraIso(), autor: eu.nome, descricao: "Criou a cotação" }],
      aprovada_por: null, aprovada_em: null, observacao: "",
    }
    db.cotacoes.push(c)
    salvar()
    return verCotacao(c)
  }, { acao: "cotacao.montar" })),

  http.get(`${API}/cotacoes/:id`, rota(({ eu, params }) => {
    const c = achar(params.id, eu.unidades)
    return c ? verCotacao(c) : erro(404, "Cotação não encontrada.")
  })),

  http.patch(`${API}/cotacoes/:id`, rota(async ({ eu, params, request }) => {
    const c = achar(params.id, eu.unidades)
    if (!c) return erro(404, "Cotação não encontrada.")
    if (c.status === "aprovada" || c.status === "recebida") return erro(409, "Cotação aprovada não pode mais ser alterada.")
    const corpo = (await request.json()) as AlteracaoCotacao
    if (corpo.itens) {
      const problema = itensValidos(corpo.itens)
      if (problema) return erro(422, problema)
      c.itens = corpo.itens
    }
    if (corpo.titulo !== undefined) c.titulo = corpo.titulo.trim() || c.titulo
    if (corpo.fornecedor_id !== undefined) c.fornecedor_id = corpo.fornecedor_id
    if (corpo.observacao !== undefined) c.observacao = corpo.observacao
    salvar()
    return verCotacao(c)
  }, { acao: "cotacao.montar" })),

  http.post(`${API}/cotacoes/:id/enviar`, rota(({ eu, params }) => {
    const c = achar(params.id, eu.unidades)
    if (!c) return erro(404, "Cotação não encontrada.")
    if (c.status !== "rascunho") return erro(409, "Só um rascunho pode ser enviado.")
    if (!c.itens.length) return erro(422, "Inclua pelo menos um item antes de enviar.")
    c.status = "enviada"
    c.eventos.push({ data: agoraIso(), autor: eu.nome, descricao: "Enviou para cotação" })
    salvar()
    return verCotacao(c)
  }, { acao: "cotacao.montar" })),

  http.post(`${API}/cotacoes/:id/aprovar`, rota(({ eu, params }) => {
    const c = achar(params.id, eu.unidades)
    if (!c) return erro(404, "Cotação não encontrada.")
    if (c.status !== "enviada") return erro(409, "Só uma cotação enviada pode ser aprovada.")
    if (!c.fornecedor_id) return erro(422, "Escolha o fornecedor antes de aprovar.")
    if (c.itens.some((i) => i.preco == null)) return erro(422, "Informe o preço de todos os itens antes de aprovar.")
    c.status = "aprovada"
    c.aprovada_por = eu.nome
    c.aprovada_em = agoraIso()
    c.eventos.push({ data: c.aprovada_em, autor: eu.nome, descricao: "Aprovou" })
    salvar()
    return verCotacao(c)
  }, { acao: "cotacao.aprovar" })),

  http.post(`${API}/cotacoes/:id/receber`, rota(({ eu, params }) => {
    const c = achar(params.id, eu.unidades)
    if (!c) return erro(404, "Cotação não encontrada.")
    if (c.status !== "aprovada") return erro(409, "Só uma cotação aprovada pode ser recebida.")
    for (const i of c.itens) {
      registrarMovimentacao({ tipo: "entrada", produto_id: i.produto_id, unidade_id: c.unidade_id, quantidade: i.quantidade,
        origem: "cotacao", referencia: c.id, observacao: `Cotação nº ${c.numero}`, autor: eu.nome })
    }
    c.status = "recebida"
    c.eventos.push({ data: agoraIso(), autor: eu.nome, descricao: "Marcou como recebida e gerou a entrada no estoque" })
    salvar()
    return verCotacao(c)
  }, { acao: "cotacao.montar" })),

  http.post(`${API}/cotacoes/:id/anexos`, rota(async ({ eu, params, request }) => {
    const c = achar(params.id, eu.unidades)
    if (!c) return erro(404, "Cotação não encontrada.")
    const form = await request.formData()
    const tipo = form.get("tipo") as TipoAnexo
    const arquivo = form.get("arquivo")
    if (!(tipo in NOME_ANEXO)) return erro(422, "Tipo de anexo inválido.")
    if (!(arquivo instanceof File)) return erro(422, "Escolha o arquivo.")
    const guardado = await guardarArquivo(arquivo, c.unidade_id, false)
    if (guardado instanceof Response) return guardado
    const nome = guardado.nome
    c.anexos.push({ id: novoId("a"), tipo, nome, enviado_em: agoraIso(), autor: eu.nome, url: guardado.url })
    c.eventos.push({ data: agoraIso(), autor: eu.nome, descricao: `Anexou ${NOME_ANEXO[tipo]} (${nome})` })
    salvar()
    return verCotacao(c)
  })),
]
