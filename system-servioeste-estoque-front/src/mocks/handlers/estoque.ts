// Contagens, movimentações e painel.
import { http } from "msw"

import type { AlteracaoItem, Movimentacao, NovaMovimentacao, Painel } from "@/lib/tipos"

import { agoraIso, db, novoId, salvar, verContagem, verCotacao, verUnidade } from "../db"
import { calcularDivergencias, progresso } from "../regras"
import { API, erro, podeVerUnidade, rota, unidadesVisiveis } from "../util"

const hojeIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
const resumo = (c: Parameters<typeof verContagem>[0]) => {
  const { itens: _i, lista_divergencias: _d, ...r } = verContagem(c)
  return r
}

/** Saída ou entrada muda o saldo. Saldo desconhecido (`null`) só passa a ter valor com uma entrada. */
function aplicarMovimentacao(m: Pick<Movimentacao, "tipo" | "unidade_id" | "produto_id" | "quantidade">) {
  const saldos = (db.saldos[m.unidade_id] ??= {})
  const atual = saldos[m.produto_id] ?? null
  if (m.tipo === "entrada") saldos[m.produto_id] = (atual ?? 0) + m.quantidade
  else if (atual !== null) saldos[m.produto_id] = Math.max(0, atual - m.quantidade)
}

export function registrarMovimentacao(m: Omit<Movimentacao, "id" | "data"> & { data?: string }) {
  const nova: Movimentacao = { ...m, id: novoId("m"), data: m.data ?? agoraIso() }
  db.movimentacoes.unshift(nova)
  aplicarMovimentacao(nova)
  return nova
}

export const estoqueHandlers = [
  // ---------------------------------------------------------------- contagens
  http.get(`${API}/contagens`, rota(({ eu, url }) => {
    const unidades = unidadesVisiveis(eu, url)
    return db.contagens.filter((c) => unidades.includes(c.unidade_id))
      .sort((a, b) => b.data.localeCompare(a.data) || (a.situacao === "aberta" ? -1 : 1))
      .map(resumo)
  }, { lista: true })),

  http.post(`${API}/contagens`, rota(async ({ eu, request }) => {
    const { unidade_id, data } = (await request.json()) as { unidade_id: string; data?: string }
    if (!podeVerUnidade(eu, unidade_id)) return erro(403, "Esta unidade não está liberada para você.")
    const aberta = db.contagens.find((c) => c.unidade_id === unidade_id && c.situacao === "aberta")
    if (aberta) return erro(409, `Já existe uma contagem aberta nesta unidade (de ${aberta.data.split("-").reverse().join("/")}).`)
    const c = {
      id: novoId("ct"), unidade_id, data: data || hojeIso(), responsavel: eu.nome, situacao: "aberta" as const,
      itens: db.produtos.map((p) => ({ produto_id: p.id, quantidade: null, observacao: "", foto: null })),
      lista_divergencias: [], finalizada_em: null,
    }
    db.contagens.push(c)
    salvar()
    return verContagem(c)
  }, { acao: "contagem.registrar" })),

  http.get(`${API}/contagens/:id`, rota(({ eu, params }) => {
    const c = db.contagens.find((x) => x.id === params.id)
    if (!c || !podeVerUnidade(eu, c.unidade_id)) return erro(404, "Contagem não encontrada.")
    return verContagem(c)
  })),

  // Aceita o lote inteiro guardado no aparelho durante o modo offline.
  http.patch(`${API}/contagens/:id/itens`, rota(async ({ eu, params, request }) => {
    const c = db.contagens.find((x) => x.id === params.id)
    if (!c || !podeVerUnidade(eu, c.unidade_id)) return erro(404, "Contagem não encontrada.")
    if (c.situacao === "finalizada") return erro(409, "Esta contagem já foi finalizada e não pode mais ser alterada.")
    const { itens } = (await request.json()) as { itens: AlteracaoItem[] }
    for (const alt of itens) {
      const item = c.itens.find((i) => i.produto_id === alt.produto_id)
      if (!item) continue
      if (alt.quantidade !== undefined) {
        if (alt.quantidade !== null && (!Number.isFinite(alt.quantidade) || alt.quantidade < 0)) return erro(422, "Quantidade inválida.")
        item.quantidade = alt.quantidade
      }
      if (alt.observacao !== undefined) item.observacao = alt.observacao
      if (alt.foto !== undefined) item.foto = alt.foto
    }
    salvar()
    return verContagem(c)
  }, { acao: "contagem.registrar" })),

  http.post(`${API}/contagens/:id/finalizar`, rota(({ eu, params }) => {
    const c = db.contagens.find((x) => x.id === params.id)
    if (!c || !podeVerUnidade(eu, c.unidade_id)) return erro(404, "Contagem não encontrada.")
    if (c.situacao === "finalizada") return erro(409, "Esta contagem já foi finalizada.")
    if (progresso(c.itens).contados === 0) return erro(422, "Nenhum item contado. Digite ao menos uma quantidade (zero também vale).")
    const anterior = db.contagens.filter((x) => x.unidade_id === c.unidade_id && x.situacao === "finalizada").sort((a, b) => a.data.localeCompare(b.data)).at(-1)
    const mapa = new Map<string, number | null>(anterior?.itens.map((i): [string, number | null] => [i.produto_id, i.quantidade]) ?? [])
    const desde = anterior?.finalizada_em ?? "0000"
    const movs = db.movimentacoes.filter((m) => m.unidade_id === c.unidade_id && m.data > desde)
    c.lista_divergencias = calcularDivergencias(c.itens, mapa, movs)
    // O saldo passa a ser o contado; item não contado mantém o saldo que tinha.
    for (const i of c.itens) if (i.quantidade !== null) (db.saldos[c.unidade_id] ??= {})[i.produto_id] = i.quantidade
    c.situacao = "finalizada"
    c.finalizada_em = agoraIso()
    c.responsavel = c.responsavel || eu.nome
    salvar()
    return verContagem(c)
  }, { acao: "contagem.registrar" })),

  // ---------------------------------------------------------------- movimentações
  http.get(`${API}/movimentacoes`, rota(({ eu, url }) => {
    const unidades = unidadesVisiveis(eu, url)
    const tipo = url.searchParams.get("tipo")
    const produto = url.searchParams.get("produto")
    return db.movimentacoes
      .filter((m) => unidades.includes(m.unidade_id) && (!tipo || m.tipo === tipo) && (!produto || m.produto_id === produto))
      .slice(0, 300)
  }, { lista: true })),

  http.post(`${API}/movimentacoes`, rota(async ({ eu, request }) => {
    const corpo = (await request.json()) as NovaMovimentacao
    if (!podeVerUnidade(eu, corpo.unidade_id)) return erro(403, "Esta unidade não está liberada para você.")
    if (!db.produtos.some((p) => p.id === corpo.produto_id)) return erro(422, "Escolha um produto do catálogo.")
    if (!Number.isFinite(corpo.quantidade) || corpo.quantidade <= 0) return erro(422, "A quantidade precisa ser maior que zero.")
    const m = registrarMovimentacao({ ...corpo, origem: "manual", referencia: null, autor: eu.nome })
    salvar()
    return m
  }, { acao: "movimentacao.registrar" })),

  // ---------------------------------------------------------------- painel
  http.get(`${API}/painel`, rota(({ eu, url }) => {
    const unidades = unidadesVisiveis(eu, url)
    const hoje = hojeIso()
    const painel: Painel = {
      abaixo_minimo: unidades.flatMap((u) => db.produtos
        .filter((p) => { const s = db.saldos[u]?.[p.id]; return s != null && s < p.minimos[u] })
        .map((p) => ({ produto_id: p.id, unidade_id: u, saldo: db.saldos[u][p.id]!, minimo: p.minimos[u] }))),
      contagens: unidades.map((u) => {
        const v = verUnidade(u)
        return { unidade_id: u, proxima: v.proxima_contagem, atrasada: v.atrasada, aberta_id: db.contagens.find((c) => c.unidade_id === u && c.situacao === "aberta")?.id ?? null }
      }),
      cotacoes_abertas: db.cotacoes.filter((c) => unidades.includes(c.unidade_id) && c.status !== "recebida").map(verCotacao),
      divergencias: unidades.flatMap((u) => {
        const ultima = db.contagens.filter((c) => c.unidade_id === u && c.situacao === "finalizada").sort((a, b) => a.data.localeCompare(b.data)).at(-1)
        return ultima ? ultima.lista_divergencias.map((d) => ({ ...d, unidade_id: u, contagem_id: ultima.id })) : []
      }),
      anterior: unidades.reduce((acc, u) => {
        const [penultima] = db.contagens.filter((c) => c.unidade_id === u && c.situacao === "finalizada").sort((a, b) => b.data.localeCompare(a.data)).slice(1, 2)
        if (!penultima) return acc
        const abaixo = penultima.itens.filter((i) => i.quantidade !== null && i.quantidade < (db.produtos.find((p) => p.id === i.produto_id)?.minimos[u] ?? 0)).length
        return { abaixo_minimo: acc.abaixo_minimo + abaixo, divergencias: acc.divergencias + penultima.lista_divergencias.length }
      }, { abaixo_minimo: 0, divergencias: 0 }),
      validade: db.lotes.filter((l) => unidades.includes(l.unidade_id))
        .map((l) => ({ ...l, dias: Math.round((new Date(`${l.validade}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86_400_000) }))
        .filter((l) => l.dias <= 30).sort((a, b) => a.dias - b.dias),
    }
    return painel
  })),
]
