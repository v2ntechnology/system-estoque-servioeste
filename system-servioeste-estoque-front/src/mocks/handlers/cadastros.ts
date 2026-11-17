// Pessoa, unidades, categorias, produtos e fornecedores.
import { http } from "msw"

import type { Fornecedor, ProdutoDetalhe, Unidade } from "@/lib/tipos"

import { db, novoId, salvar, verCotacao, verProduto, verUnidade } from "../db"
import { API, erro, rota } from "../util"

export const cadastrosHandlers = [
  http.get(`${API}/eu`, rota(({ eu }) => eu)),

  http.get(`${API}/unidades`, rota(({ eu }) => db.unidades.filter((u) => eu.unidades.includes(u.id)).map((u) => verUnidade(u.id)))),

  http.patch(`${API}/unidades/:id`, rota(async ({ params, request }) => {
    const u = db.unidades.find((x) => x.id === params.id)
    if (!u) return erro(404, "Unidade não encontrada.")
    const corpo = (await request.json()) as Partial<Pick<Unidade, "encerramento" | "frequencia_dias">>
    if (corpo.encerramento !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(corpo.encerramento)) return erro(422, "Horário inválido. Use HH:MM.")
      u.encerramento = corpo.encerramento
    }
    if (corpo.frequencia_dias !== undefined) {
      if (!Number.isInteger(corpo.frequencia_dias) || corpo.frequencia_dias < 1) return erro(422, "A frequência precisa ser de pelo menos 1 dia.")
      u.frequencia_dias = corpo.frequencia_dias
    }
    salvar()
    return verUnidade(u.id)
  }, { acao: "unidades.gerenciar" })),

  http.get(`${API}/categorias`, rota(() => db.categorias)),

  http.get(`${API}/produtos`, rota(({ url }) => {
    const busca = (url.searchParams.get("busca") ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    const categoria = url.searchParams.get("categoria")
    return db.produtos
      .filter((p) => !categoria || p.categoria_id === categoria)
      .filter((p) => !busca || `${p.codigo} ${p.nome}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(busca))
      .map(verProduto)
  }, { lista: true })),

  http.get(`${API}/produtos/:id`, rota(({ params, eu }) => {
    const p = db.produtos.find((x) => x.id === params.id)
    if (!p) return erro(404, "Produto não encontrado.")
    const precos = db.cotacoes
      .filter((c) => c.status === "aprovada" || c.status === "recebida")
      .flatMap((c) => c.itens.filter((i) => i.produto_id === p.id && i.preco != null).map((i) => ({
        fornecedor_id: c.fornecedor_id ?? "", fornecedor: db.fornecedores.find((f) => f.id === c.fornecedor_id)?.nome ?? "—",
        preco: i.preco!, data: c.aprovada_em ?? c.criada_em, cotacao_id: c.id,
      })))
      .sort((a, b) => b.data.localeCompare(a.data))
    const detalhe: ProdutoDetalhe = { ...verProduto(p), lotes: db.lotes.filter((l) => l.produto_id === p.id && eu.unidades.includes(l.unidade_id)), precos }
    return detalhe
  })),

  http.put(`${API}/produtos/:id/minimos`, rota(async ({ params, request }) => {
    const p = db.produtos.find((x) => x.id === params.id)
    if (!p) return erro(404, "Produto não encontrado.")
    const minimos = (await request.json()) as Record<string, number>
    if (Object.values(minimos).some((v) => !Number.isFinite(v) || v < 0)) return erro(422, "O mínimo não pode ser negativo.")
    p.minimos = { ...p.minimos, ...minimos }
    salvar()
    return verProduto(p)
  }, { acao: "catalogo.editar" })),

  http.get(`${API}/fornecedores`, rota(() => db.fornecedores, { lista: true })),

  http.post(`${API}/fornecedores`, rota(async ({ request }) => {
    const corpo = (await request.json()) as Omit<Fornecedor, "id">
    if (!corpo.nome?.trim()) return erro(422, "Informe o nome do fornecedor.")
    const f: Fornecedor = { ...corpo, id: novoId("f"), nome: corpo.nome.trim() }
    db.fornecedores.push(f)
    salvar()
    return f
  }, { acao: "cotacao.montar" })),

  http.get(`${API}/fornecedores/:id/cotacoes`, rota(({ params }) => db.cotacoes.filter((c) => c.fornecedor_id === params.id).map(verCotacao))),
]
