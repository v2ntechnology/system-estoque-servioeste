// Dados de exemplo da demonstração. Tudo é fictício (constituição, princípio VII): nomes de pessoas, fornecedores,
// telefones e códigos são inventados. As datas são relativas a hoje, para o painel sempre ter algo a mostrar.
// A história (saídas, compras, contagens) é gerada dia a dia com sorteio de semente fixa, então os números batem
// entre si: o saldo de hoje é o resultado das contagens e movimentações listadas.
import type {
  Categoria, Contagem, Cotacao, Eu, Fornecedor, Lote, ModeloCotacao, Movimentacao, PreviaImportacao, Produto,
} from "@/lib/tipos"

import { calcularDivergencias } from "./regras"

export interface UnidadeDb {
  id: string
  nome: string
  encerramento: string
  frequencia_dias: number
}

/** `preco_ref` só existe nos simulados (valor dos relatórios quando não há preço aprovado). */
export type ProdutoDb = Omit<Produto, "saldos" | "consumo_mensal"> & { preco_ref: number }
export type ContagemDb = Omit<Contagem, "contados" | "total" | "divergencias">
export type CotacaoDb = Omit<Cotacao, "total" | "itens_qtd">

export interface Db {
  versao: number
  seq: number
  pessoas: Eu[]
  unidades: UnidadeDb[]
  categorias: Categoria[]
  produtos: ProdutoDb[]
  /** unidade -> produto -> saldo (`null` = nunca contado). */
  saldos: Record<string, Record<string, number | null>>
  lotes: (Lote & { produto_id: string })[]
  contagens: ContagemDb[]
  movimentacoes: Movimentacao[]
  fornecedores: Fornecedor[]
  cotacoes: CotacaoDb[]
  modelos: ModeloCotacao[]
  importacoes: PreviaImportacao[]
}

export const VERSAO_DADOS = 1

// ------------------------------------------------------------------ cadastros fixos

export const PESSOAS: Eu[] = [
  { id: "p-ana", nome: "Ana Paula Souza", email: "ana.souza@exemplo.com.br", papeis: ["administrador"], unidades: ["u-queimados", "u-resende", "u-barra"] },
  { id: "p-carlos", nome: "Carlos Henrique Lima", email: "carlos.lima@exemplo.com.br", papeis: ["contador"], unidades: ["u-queimados"] },
  { id: "p-mariana", nome: "Mariana Costa", email: "mariana.costa@exemplo.com.br", papeis: ["comprador"], unidades: ["u-queimados", "u-resende", "u-barra"] },
  { id: "p-roberto", nome: "Roberto Alves", email: "roberto.alves@exemplo.com.br", papeis: ["aprovador"], unidades: ["u-queimados", "u-resende", "u-barra"] },
]

const UNIDADES: UnidadeDb[] = [
  { id: "u-queimados", nome: "Queimados", encerramento: "17:00", frequencia_dias: 7 },
  { id: "u-resende", nome: "Resende", encerramento: "17:00", frequencia_dias: 15 },
  { id: "u-barra", nome: "Barra do Piraí", encerramento: "16:30", frequencia_dias: 30 },
]

const CATEGORIAS: Categoria[] = [
  { id: "c-sacos", nome: "Sacos" },
  { id: "c-contentores", nome: "Contentores" },
  { id: "c-epi", nome: "EPI" },
  { id: "c-limpeza", nome: "Limpeza" },
  { id: "c-escritorio", nome: "Escritório" },
  { id: "c-copa", nome: "Copa" },
]

type Base = [codigo: string, nome: string, categoria: string, medida: string, embalagem: [string, number] | null,
  validade: boolean, minimo: number, consumo: number, preco: number]

/** [código, nome, categoria, medida, embalagem, controla validade, mínimo, consumo mensal (Queimados), preço] */
const PRODUTOS: Base[] = [
  ["SAC-001", "Saco branco leitoso infectante 100 L", "c-sacos", "UN", ["pacote", 100], false, 400, 500, 0.85],
  ["SAC-002", "Saco branco leitoso infectante 50 L", "c-sacos", "UN", ["pacote", 100], false, 300, 350, 0.6],
  ["SAC-003", "Saco preto 100 L", "c-sacos", "UN", ["pacote", 100], false, 200, 260, 0.45],
  ["SAC-004", "Saco laranja para químicos 50 L", "c-sacos", "UN", ["pacote", 50], false, 50, 40, 1.1],
  ["CON-001", "Contentor 240 L com tampa", "c-contentores", "UN", null, false, 6, 3, 289.9],
  ["CON-002", "Contentor 120 L com tampa", "c-contentores", "UN", null, false, 8, 4, 189.9],
  ["CON-003", "Caixa coletora de perfurocortante 13 L", "c-contentores", "UN", ["caixa", 20], false, 60, 70, 4.9],
  ["EPI-001", "Luva nitrílica descartável (M)", "c-epi", "CX", null, true, 10, 12, 32.5],
  ["EPI-002", "Máscara PFF2", "c-epi", "UN", ["caixa", 20], true, 40, 50, 2.8],
  ["EPI-003", "Avental impermeável", "c-epi", "UN", null, false, 10, 6, 24.9],
  ["EPI-004", "Botina de segurança", "c-epi", "PR", null, false, 4, 2, 89.9],
  ["LIM-001", "Álcool 70% 1 L", "c-limpeza", "UN", ["caixa", 12], true, 24, 30, 8.9],
  ["LIM-002", "Desinfetante hospitalar 5 L", "c-limpeza", "GL", null, true, 6, 8, 39.9],
  ["LIM-003", "Água sanitária 2 L", "c-limpeza", "UN", ["fardo", 6], false, 12, 14, 6.5],
  ["LIM-004", "Detergente neutro 500 mL", "c-limpeza", "UN", ["caixa", 24], false, 24, 20, 2.9],
  ["LIM-005", "Papel higiênico rolo 300 m", "c-limpeza", "RL", ["pacote", 8], false, 48, 64, 3.2],
  ["LIM-006", "Papel toalha interfolhado (pacote 1000 fls)", "c-limpeza", "PCT", null, false, 10, 12, 18.9],
  ["LIM-007", "Sabonete líquido 5 L", "c-limpeza", "GL", null, false, 3, 3, 34.9],
  ["ESC-001", "Papel A4 (resma 500 fls)", "c-escritorio", "RES", ["caixa", 10], false, 10, 8, 27.9],
  ["ESC-002", "Caneta esferográfica azul", "c-escritorio", "UN", ["caixa", 50], false, 20, 15, 1.2],
  ["ESC-003", "Etiqueta adesiva para identificação", "c-escritorio", "FL", null, false, 50, 40, 0.9],
  ["COP-001", "Copo descartável 200 mL", "c-copa", "UN", ["pacote", 100], false, 300, 400, 0.08],
  ["COP-002", "Café torrado e moído 500 g", "c-copa", "PCT", null, true, 6, 10, 18.5],
  ["COP-003", "Açúcar refinado 1 kg", "c-copa", "PCT", null, false, 4, 6, 4.9],
]

/** Tamanho de cada unidade em relação a Queimados (consumo e mínimo). */
const PORTE: Record<string, number> = { "u-queimados": 1, "u-resende": 0.6, "u-barra": 0.4 }

const FORNECEDORES: Fornecedor[] = [
  { id: "f-limpa", nome: "Limpa Bem Distribuidora (exemplo)", contato: "Juliana", telefone: "(21) 90000-0001", categorias: ["c-limpeza", "c-copa"] },
  { id: "f-embala", nome: "Embalagens Vale do Paraíba (exemplo)", contato: "Marcos", telefone: "(24) 90000-0002", categorias: ["c-sacos", "c-contentores"] },
  { id: "f-epi", nome: "Proteção Total EPI (exemplo)", contato: "Fernanda", telefone: "(21) 90000-0003", categorias: ["c-epi"] },
  { id: "f-papel", nome: "Papelaria Central (exemplo)", contato: "Rafael", telefone: "(24) 90000-0004", categorias: ["c-escritorio"] },
]

// ------------------------------------------------------------------ utilitários

/** Sorteio com semente (mulberry32): mesma semente, mesmos dados. */
function sorteio(semente: number) {
  let a = semente
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIA = 86_400_000
const isoDia = (d: Date) => d.toISOString().slice(0, 10)
/** Horário fixo do dia (meio da tarde em Brasília) para os registros simulados. */
const isoHora = (d: Date, h = 15) => `${isoDia(d)}T${String(h).padStart(2, "0")}:00:00-03:00`

export const idProduto = (codigo: string) => `pr-${codigo.toLowerCase()}`

// ------------------------------------------------------------------ geração

export function gerarDados(hoje = new Date()): Db {
  const r = sorteio(20261117)
  const base = new Date(`${isoDia(hoje)}T12:00:00`)
  const diaAtras = (n: number) => new Date(base.getTime() - n * DIA)
  let seq = 1
  const id = (p: string) => `${p}-${seq++}`

  const produtos: ProdutoDb[] = PRODUTOS.map(([codigo, nome, categoria_id, medida, emb, controla_validade, minimo, , preco_ref]) => ({
    id: idProduto(codigo), codigo, nome, categoria_id, medida, controla_validade, preco_ref,
    embalagem: emb ? { nome: emb[0], quantidade: emb[1] } : null,
    minimos: Object.fromEntries(UNIDADES.map((u) => [u.id, Math.max(1, Math.round(minimo * PORTE[u.id]))])),
  }))

  const movimentacoes: Movimentacao[] = []
  const contagens: ContagemDb[] = []
  const saldos: Db["saldos"] = {}

  // Dias (atrás) em que cada unidade contou. Resende ficou sem contar (atrasada); Barra tem uma contagem aberta hoje.
  const DIAS_CONTAGEM: Record<string, number[]> = {
    "u-queimados": [119, 112, 105, 98, 91, 84, 77, 70, 63, 56, 49, 42, 35, 28, 21, 14, 7],
    "u-resende": [110, 95, 80, 65, 50, 35, 21],
    "u-barra": [115, 85, 55, 25],
  }
  const RESPONSAVEL: Record<string, string> = { "u-queimados": "Carlos Henrique Lima", "u-resende": "Ana Paula Souza", "u-barra": "Ana Paula Souza" }

  for (const u of UNIDADES) {
    const saldo: Record<string, number> = {}
    let anterior = new Map<string, number | null>()
    let movsDesdeAnterior: Movimentacao[] = []
    for (const p of produtos) saldo[p.id] = Math.round(p.minimos[u.id] * (1.6 + r()))

    for (let dias = 120; dias >= 0; dias--) {
      const dia = diaAtras(dias)
      for (const [i, p] of produtos.entries()) {
        const consumo = PRODUTOS[i][7] * PORTE[u.id]
        // Saída em dias úteis, com variação.
        if (dia.getDay() !== 0 && dia.getDay() !== 6 && r() < 0.45) {
          const q = Math.max(1, Math.round((consumo / 10) * (0.5 + r())))
          if (saldo[p.id] >= q) {
            saldo[p.id] -= q
            const m: Movimentacao = { id: id("m"), tipo: "saida", produto_id: p.id, unidade_id: u.id, quantidade: q, data: isoHora(dia, 9 + Math.floor(r() * 8)), origem: "manual", referencia: null, observacao: "", autor: RESPONSAVEL[u.id] }
            movimentacoes.push(m)
            movsDesdeAnterior.push(m)
          }
        }
        // Reposição quando cai abaixo do mínimo (há uns dias, para alguns itens ficarem abaixo hoje).
        if (dias > 12 && saldo[p.id] < p.minimos[u.id] && r() < 0.5) {
          const passo = p.embalagem?.quantidade ?? 1
          const q = Math.ceil((p.minimos[u.id] + consumo) / passo) * passo
          saldo[p.id] += q
          const m: Movimentacao = { id: id("m"), tipo: "entrada", produto_id: p.id, unidade_id: u.id, quantidade: q, data: isoHora(dia, 10), origem: "manual", referencia: null, observacao: "Reposição", autor: "Mariana Costa" }
          movimentacoes.push(m)
          movsDesdeAnterior.push(m)
        }
      }
      if (DIAS_CONTAGEM[u.id].includes(dias)) {
        const ultima = dias === DIAS_CONTAGEM[u.id].at(-1)
        const itens = produtos.map((p) => {
          let quantidade: number | null = saldo[p.id]
          // Na última contagem de Queimados, dois itens sumiram sem saída registrada (divergência para a demo).
          if (ultima && u.id === "u-queimados" && (p.codigo === "EPI-002" || p.codigo === "LIM-001")) {
            quantidade = Math.max(0, Math.round(saldo[p.id] * 0.4))
            saldo[p.id] = quantidade
          }
          // Na última contagem de Barra do Piraí, alguns itens ficaram sem contar.
          if (ultima && u.id === "u-barra" && p.categoria_id === "c-copa") quantidade = null
          return { produto_id: p.id, quantidade, observacao: "", foto: null }
        })
        const lista_divergencias = calcularDivergencias(itens, anterior, movsDesdeAnterior)
        if (lista_divergencias.length) itens.forEach((it) => { if (lista_divergencias.some((d) => d.produto_id === it.produto_id)) it.observacao = "Conferir: faltou na prateleira." })
        contagens.push({ id: id("ct"), unidade_id: u.id, data: isoDia(dia), responsavel: RESPONSAVEL[u.id], situacao: "finalizada", itens, lista_divergencias, finalizada_em: isoHora(dia, 16) })
        anterior = new Map(itens.map((it) => [it.produto_id, it.quantidade ?? anterior.get(it.produto_id) ?? null]))
        movsDesdeAnterior = []
      }
    }
    saldos[u.id] = { ...saldo }
  }

  // Contagem aberta hoje em Barra do Piraí, com metade dos itens já contados.
  contagens.push({
    id: id("ct"), unidade_id: "u-barra", data: isoDia(base), responsavel: "Ana Paula Souza", situacao: "aberta",
    itens: produtos.map((p, i) => ({ produto_id: p.id, quantidade: i % 2 === 0 ? saldos["u-barra"][p.id] : null, observacao: "", foto: null })),
    lista_divergencias: [], finalizada_em: null,
  })

  // Lotes dos produtos com validade (alguns vencendo em menos de 30 dias).
  const lotes: Db["lotes"] = []
  for (const u of UNIDADES) {
    for (const p of produtos.filter((x) => x.controla_validade)) {
      const vence = Math.round(10 + r() * 200)
      lotes.push({ id: id("l"), produto_id: p.id, unidade_id: u.id, numero: `L${String(Math.floor(r() * 90000) + 10000)}`, validade: isoDia(new Date(base.getTime() + vence * DIA)), quantidade: saldos[u.id][p.id] ?? 0 })
    }
  }

  // Cotações: uma recebida (gera preços aprovados), uma aprovada, uma enviada com proposta e um rascunho.
  const preco = (codigo: string) => PRODUTOS.find((p) => p[0] === codigo)![8]
  const item = (codigo: string, quantidade: number, comPreco = true) => ({ produto_id: idProduto(codigo), quantidade, preco: comPreco ? preco(codigo) : null })
  const cotacoes: CotacaoDb[] = [
    {
      id: "co-1", numero: 1, titulo: "Material de limpeza — setembro", unidade_id: "u-queimados", status: "recebida", fornecedor_id: "f-limpa",
      criada_em: isoHora(diaAtras(60), 9), itens: [item("LIM-001", 36), item("LIM-002", 10), item("LIM-003", 18), item("LIM-005", 96)],
      anexos: [
        { id: "a-1", tipo: "proposta", nome: "proposta-limpa-bem.pdf", enviado_em: isoHora(diaAtras(58), 11), autor: "Mariana Costa" },
        { id: "a-2", tipo: "nota_fiscal", nome: "nf-004512.pdf", enviado_em: isoHora(diaAtras(50), 14), autor: "Mariana Costa" },
        { id: "a-3", tipo: "boleto", nome: "boleto-004512.pdf", enviado_em: isoHora(diaAtras(50), 14), autor: "Mariana Costa" },
      ],
      eventos: [
        { data: isoHora(diaAtras(60), 9), autor: "Mariana Costa", descricao: "Criou a cotação" },
        { data: isoHora(diaAtras(59), 10), autor: "Mariana Costa", descricao: "Enviou para cotação" },
        { data: isoHora(diaAtras(56), 16), autor: "Roberto Alves", descricao: "Aprovou" },
        { data: isoHora(diaAtras(50), 14), autor: "Mariana Costa", descricao: "Marcou como recebida e gerou a entrada no estoque" },
      ],
      aprovada_por: "Roberto Alves", aprovada_em: isoHora(diaAtras(56), 16), observacao: "",
    },
    {
      id: "co-2", numero: 2, titulo: "Sacos infectantes — Resende", unidade_id: "u-resende", status: "aprovada", fornecedor_id: "f-embala",
      criada_em: isoHora(diaAtras(9), 9), itens: [item("SAC-001", 500), item("SAC-002", 300), item("CON-003", 40)],
      anexos: [{ id: "a-4", tipo: "proposta", nome: "proposta-embalagens-vale.pdf", enviado_em: isoHora(diaAtras(6), 10), autor: "Mariana Costa" }],
      eventos: [
        { data: isoHora(diaAtras(9), 9), autor: "Mariana Costa", descricao: "Criou a cotação" },
        { data: isoHora(diaAtras(8), 11), autor: "Mariana Costa", descricao: "Enviou para cotação" },
        { data: isoHora(diaAtras(3), 15), autor: "Roberto Alves", descricao: "Aprovou" },
      ],
      aprovada_por: "Roberto Alves", aprovada_em: isoHora(diaAtras(3), 15), observacao: "Entrega combinada para a próxima semana.",
    },
    {
      id: "co-3", numero: 3, titulo: "EPI — Queimados", unidade_id: "u-queimados", status: "enviada", fornecedor_id: "f-epi",
      criada_em: isoHora(diaAtras(4), 10), itens: [item("EPI-001", 20), item("EPI-002", 100), item("EPI-003", 10)],
      anexos: [{ id: "a-5", tipo: "proposta", nome: "proposta-protecao-total.pdf", enviado_em: isoHora(diaAtras(2), 9), autor: "Mariana Costa" }],
      eventos: [
        { data: isoHora(diaAtras(4), 10), autor: "Mariana Costa", descricao: "Criou a cotação" },
        { data: isoHora(diaAtras(4), 11), autor: "Mariana Costa", descricao: "Enviou para cotação" },
      ],
      aprovada_por: null, aprovada_em: null, observacao: "",
    },
    {
      id: "co-4", numero: 4, titulo: "Escritório — Barra do Piraí", unidade_id: "u-barra", status: "rascunho", fornecedor_id: null,
      criada_em: isoHora(diaAtras(1), 14), itens: [item("ESC-001", 10, false), item("ESC-002", 50, false)],
      anexos: [], eventos: [{ data: isoHora(diaAtras(1), 14), autor: "Mariana Costa", descricao: "Criou a cotação" }],
      aprovada_por: null, aprovada_em: null, observacao: "",
    },
  ]
  // A cotação recebida virou entrada em Queimados.
  for (const it of cotacoes[0].itens) {
    movimentacoes.push({ id: id("m"), tipo: "entrada", produto_id: it.produto_id, unidade_id: "u-queimados", quantidade: it.quantidade, data: isoHora(diaAtras(50), 14), origem: "cotacao", referencia: "co-1", observacao: "Cotação nº 1", autor: "Mariana Costa" })
  }

  const modelos: ModeloCotacao[] = [
    { id: "mo-limpeza", nome: "Material de limpeza", itens: [["LIM-001", 24], ["LIM-002", 6], ["LIM-003", 12], ["LIM-004", 24], ["LIM-005", 64], ["LIM-006", 10]].map(([c, q]) => ({ produto_id: idProduto(c as string), quantidade: q as number })) },
    { id: "mo-sacos", nome: "Sacos e coletores", itens: [["SAC-001", 500], ["SAC-002", 300], ["SAC-003", 200], ["CON-003", 40]].map(([c, q]) => ({ produto_id: idProduto(c as string), quantidade: q as number })) },
    { id: "mo-copa", nome: "Copa", itens: [["COP-001", 500], ["COP-002", 10], ["COP-003", 6]].map(([c, q]) => ({ produto_id: idProduto(c as string), quantidade: q as number })) },
  ]

  movimentacoes.sort((a, b) => b.data.localeCompare(a.data))
  return {
    versao: VERSAO_DADOS, seq, pessoas: PESSOAS, unidades: UNIDADES, categorias: CATEGORIAS, produtos, saldos, lotes,
    contagens, movimentacoes, fornecedores: FORNECEDORES, cotacoes, modelos, importacoes: [],
  }
}
