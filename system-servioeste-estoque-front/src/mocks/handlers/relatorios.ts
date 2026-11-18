// Relatório mensal e importação de planilhas.
import { http } from "msw"

import type {
  EscalaSerie, LinhaImportacao, MetricaSerie, PreviaImportacao, RelatorioMensal, ResultadoImportacao, SerieRelatorio, TipoPlanilha,
} from "@/lib/tipos"

import { agoraIso, db, novoId, salvar } from "../db"
import { API, erro, podeVerUnidade, rota } from "../util"

const fimDoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10) // primeiro dia do mês seguinte
}
const mesAnterior = (mes: string) => {
  const [a, m] = mes.split("-").map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`
}

/** Saldo de um produto no fim do mês, voltando do saldo atual pelas movimentações posteriores. */
function saldoNoFim(unidade: string, produto: string, mes: string): number | null {
  const atual = db.saldos[unidade]?.[produto]
  if (atual == null) return null
  const depois = db.movimentacoes.filter((m) => m.unidade_id === unidade && m.produto_id === produto && m.data.slice(0, 10) >= fimDoMes(mes))
  const s = depois.reduce((acc, m) => acc + (m.tipo === "entrada" ? -m.quantidade : m.quantidade), atual)
  return Math.max(0, s)
}

function totaisDoMes(unidade: string, mes: string) {
  const movs = db.movimentacoes.filter((m) => m.unidade_id === unidade && m.data.startsWith(mes))
  const preco = (id: string) => db.produtos.find((p) => p.id === id)?.preco_ref ?? 0
  const entradas = movs.filter((m) => m.tipo === "entrada")
  return {
    movs,
    entradas: entradas.reduce((s, m) => s + m.quantidade, 0),
    saidas: movs.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.quantidade, 0),
    gasto: Math.round(entradas.reduce((s, m) => s + m.quantidade * preco(m.produto_id), 0) * 100) / 100,
  }
}

/** Linhas de exemplo de uma "Declaração de Estoque" (o arquivo não é lido nesta fase: spec 001). */
function linhasDeExemplo(tipo: TipoPlanilha): LinhaImportacao[] {
  const comCodigo = db.produtos.slice(0, 10).map((p, i): LinhaImportacao => ({
    linha: i + 6, codigo: p.codigo, nome: p.nome.toUpperCase(), quantidade: i === 3 ? null : Math.round(10 + ((i * 37) % 90)),
    medida: p.medida, observacao: i === 3 ? "" : i === 5 ? "2 caixas amassadas" : "", produto_id: p.id, situacao: "ok", erro: null,
  }))
  const extras: LinhaImportacao[] = [
    { linha: 16, codigo: null, nome: "SACO BRANCO 100L INFECTANTE", quantidade: 350, medida: "UN", observacao: "", produto_id: null, situacao: "associar", erro: null },
    { linha: 17, codigo: null, nome: "ALCOOL GEL 70 1L", quantidade: 12, medida: "UN", observacao: "", produto_id: null, situacao: "associar", erro: null },
    { linha: 18, codigo: "LIM-099", nome: "DESENGORDURANTE 5L", quantidade: 4, medida: "GL", observacao: "", produto_id: null, situacao: "novo", erro: null },
    { linha: 19, codigo: "ESC-002", nome: "CANETA AZUL", quantidade: null, medida: "UN", observacao: "dez", produto_id: null, situacao: "erro", erro: "Quantidade \"dez\" não é um número (coluna Contagem)." },
  ]
  if (tipo === "cotacao") return [...comCodigo.slice(0, 5), extras[0], extras[1]].map((l) => ({ ...l, observacao: "" }))
  return [...comCodigo, ...extras]
}

const ultimoDia = (mes: string) => {
  const [a, m] = mes.split("-").map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

/** Série de entradas, saídas ou gasto por dia de um mês ou pelos 6 meses até ele (spec 003). */
function serie(unidade: string, metrica: MetricaSerie, escala: EscalaSerie, mes: string): SerieRelatorio {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
  const periodos: string[] = []
  if (escala === "dia") {
    for (let d = 1; d <= ultimoDia(mes); d++) {
      const dia = `${mes}-${String(d).padStart(2, "0")}`
      if (dia > hoje) break
      periodos.push(dia)
    }
  } else {
    let atual = mes
    for (let i = 0; i < 6; i++) { periodos.unshift(atual); atual = mesAnterior(atual) }
  }
  const tipo = metrica === "saidas" ? "saida" : "entrada"
  const preco = (id: string) => db.produtos.find((p) => p.id === id)?.preco_ref ?? 0
  const valor = (m: { quantidade: number; produto_id: string }) => (metrica === "gasto" ? m.quantidade * preco(m.produto_id) : m.quantidade)
  const movs = db.movimentacoes.filter((m) => m.unidade_id === unidade && m.tipo === tipo)
  const chave = (data: string) => (escala === "dia" ? data.slice(0, 10) : data.slice(0, 7))
  const noPeriodo = movs.filter((m) => periodos.includes(chave(m.data)))
  const arred = (v: number) => (metrica === "gasto" ? Math.round(v * 100) / 100 : v)
  const porCategoria = new Map<string, number>()
  for (const m of noPeriodo) {
    const cat = db.produtos.find((p) => p.id === m.produto_id)?.categoria_id ?? "?"
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + valor(m))
  }
  return {
    metrica, escala, unidade_id: unidade,
    pontos: periodos.map((periodo) => ({ periodo, valor: arred(noPeriodo.filter((m) => chave(m.data) === periodo).reduce((s, m) => s + valor(m), 0)) })),
    por_categoria: [...porCategoria.entries()].map(([categoria_id, v]) => ({ categoria_id, valor: arred(v) })).sort((a, b) => b.valor - a.valor),
  }
}

export const relatoriosHandlers = [
  http.get(`${API}/relatorios/serie`, rota(({ eu, url }) => {
    const unidade = url.searchParams.get("unidade") ?? eu.unidades[0]
    const metrica = (url.searchParams.get("metrica") ?? "saidas") as MetricaSerie
    const escala = (url.searchParams.get("escala") ?? "dia") as EscalaSerie
    const mes = url.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7)
    if (!podeVerUnidade(eu, unidade)) return erro(403, "Esta unidade não está liberada para você.")
    if (!["entradas", "saidas", "gasto"].includes(metrica) || !["dia", "mes"].includes(escala)) return erro(422, "Métrica ou escala inválida.")
    return serie(unidade, metrica, escala, mes)
  })),

  http.get(`${API}/relatorios/mensal`, rota(({ eu, url }) => {
    const unidade = url.searchParams.get("unidade") ?? eu.unidades[0]
    const mes = url.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7)
    if (!podeVerUnidade(eu, unidade)) return erro(403, "Esta unidade não está liberada para você.")
    const atual = totaisDoMes(unidade, mes)
    const anterior = totaisDoMes(unidade, mesAnterior(mes))
    const relatorio: RelatorioMensal = {
      unidade_id: unidade, mes,
      linhas: db.produtos.map((p) => {
        const doProduto = atual.movs.filter((m) => m.produto_id === p.id)
        const saldo_final = saldoNoFim(unidade, p.id, mes)
        const saldo_mes_anterior = saldoNoFim(unidade, p.id, mesAnterior(mes))
        return {
          produto_id: p.id, saldo_inicial: saldo_mes_anterior, saldo_final, saldo_mes_anterior,
          entradas: doProduto.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.quantidade, 0),
          saidas: doProduto.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.quantidade, 0),
        }
      }),
      totais: { entradas: atual.entradas, saidas: atual.saidas, gasto: atual.gasto, gasto_mes_anterior: anterior.gasto },
    }
    return relatorio
  })),

  http.post(`${API}/importacao/planilha`, rota(async ({ eu, request }) => {
    const form = await request.formData()
    const arquivo = form.get("arquivo")
    const tipo = (form.get("tipo") as TipoPlanilha) || "declaracao_estoque"
    const unidade = (form.get("unidade_id") as string) || eu.unidades[0]
    if (!(arquivo instanceof File)) return erro(422, "Escolha a planilha (.xlsx).")
    if (!/\.xlsx?$/i.test(arquivo.name)) return erro(422, "O arquivo precisa ser uma planilha do Excel (.xlsx).")
    if (!podeVerUnidade(eu, unidade)) return erro(403, "Esta unidade não está liberada para você.")
    const previa: PreviaImportacao = {
      id: novoId("imp"), arquivo: arquivo.name, tipo, unidade_id: unidade, responsavel: eu.nome,
      data: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }), linhas: linhasDeExemplo(tipo),
    }
    db.importacoes.push(previa)
    salvar()
    return previa
  }, { acao: "importacao.usar" })),

  http.patch(`${API}/importacao/:id/linhas/:linha`, rota(async ({ params, request }) => {
    const previa = db.importacoes.find((p) => p.id === params.id)
    const linha = previa?.linhas.find((l) => l.linha === Number(params.linha))
    if (!previa || !linha) return erro(404, "Linha não encontrada.")
    const { produto_id } = (await request.json()) as { produto_id: string | null }
    if (produto_id && !db.produtos.some((p) => p.id === produto_id)) return erro(422, "Produto não encontrado.")
    linha.produto_id = produto_id
    linha.situacao = produto_id ? "ok" : "associar"
    salvar()
    return previa
  }, { acao: "importacao.usar" })),

  http.post(`${API}/importacao/:id/confirmar`, rota(({ eu, params }) => {
    const previa = db.importacoes.find((p) => p.id === params.id)
    if (!previa) return erro(404, "Importação não encontrada.")
    const pendentes = previa.linhas.filter((l) => l.situacao === "associar").length
    if (pendentes) return erro(422, `Associe ao catálogo os ${pendentes} produto(s) sem código antes de confirmar.`)
    let produtos_criados = 0
    for (const l of previa.linhas.filter((x) => x.situacao === "novo")) {
      const id = `pr-${(l.codigo ?? novoId("x")).toLowerCase()}`
      db.produtos.push({ id, codigo: l.codigo ?? id, nome: l.nome.charAt(0) + l.nome.slice(1).toLowerCase(), categoria_id: "c-limpeza",
        medida: l.medida, embalagem: null, controla_validade: false, preco_ref: 0,
        minimos: Object.fromEntries(db.unidades.map((u) => [u.id, 0])) })
      l.produto_id = id
      produtos_criados++
    }
    const validas = previa.linhas.filter((l) => l.situacao !== "erro" && l.produto_id)
    let contagem_id: string | null = null
    if (previa.tipo === "declaracao_estoque") {
      contagem_id = novoId("ct")
      const itens = db.produtos.map((p) => {
        const l = validas.find((x) => x.produto_id === p.id)
        return { produto_id: p.id, quantidade: l ? l.quantidade : null, observacao: l?.observacao ?? "", foto: null }
      })
      db.contagens.push({ id: contagem_id, unidade_id: previa.unidade_id, data: previa.data, responsavel: `${eu.nome} (importada de ${previa.arquivo})`,
        situacao: "finalizada", itens, lista_divergencias: [], finalizada_em: agoraIso() })
      for (const i of itens) if (i.quantidade !== null) (db.saldos[previa.unidade_id] ??= {})[i.produto_id] = i.quantidade
    }
    let cotacao_id: string | null = null
    if (previa.tipo === "cotacao") {
      cotacao_id = novoId("co")
      const vistos = new Set<string>()
      const itens = validas.filter((l) => l.quantidade && !vistos.has(l.produto_id!) && vistos.add(l.produto_id!))
        .map((l) => ({ produto_id: l.produto_id!, quantidade: l.quantidade!, preco: l.valor ?? null }))
      db.cotacoes.push({ id: cotacao_id, numero: Math.max(0, ...db.cotacoes.map((c) => c.numero)) + 1, titulo: `Importada de ${previa.arquivo}`,
        unidade_id: previa.unidade_id, status: "rascunho", fornecedor_id: null, criada_em: agoraIso(), itens, anexos: [],
        eventos: [{ data: agoraIso(), autor: eu.nome, descricao: `Criou a cotação a partir de ${previa.arquivo}` }],
        aprovada_por: null, aprovada_em: null, observacao: "" })
    }
    db.importacoes = db.importacoes.filter((p) => p.id !== previa.id)
    salvar()
    const r: ResultadoImportacao = { produtos_criados, itens_importados: validas.length, ignorados: previa.linhas.length - validas.length, contagem_id, cotacao_id }
    return r
  }, { acao: "importacao.usar" })),
]
