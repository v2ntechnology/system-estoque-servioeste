// "Banco" dos dados simulados: em memória, salvo no localStorage para a demonstração sobreviver a recarregar
// (spec 001, research D2). Também guarda as opções do menu de demonstração (pessoa, sem conexão, fim de expediente).
import type { Contagem, Cotacao, Eu, Produto, Unidade } from "@/lib/tipos"

import { gerarDados, VERSAO_DADOS, type ContagemDb, type CotacaoDb, type Db, type ProdutoDb } from "./dados"
import { consumoMedioMensal, progresso } from "./regras"

const CHAVE_DB = "estoque-mock-db"
const CHAVE_DEMO = "estoque-demo"

export interface Demo {
  pessoa: string
  semConexao: boolean
  fimExpediente: boolean
}

const DEMO_PADRAO: Demo = { pessoa: "p-ana", semConexao: false, fimExpediente: false }

function ler<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* navegador sem storage: a demonstração segue só em memória */
  }
}

function carregar(): Db {
  const salvo = ler<Db>(CHAVE_DB)
  return salvo && salvo.versao === VERSAO_DADOS ? salvo : gerarDados()
}

export let db: Db = carregar()

export const salvar = () => gravar(CHAVE_DB, db)

/** Volta aos dados de exemplo (menu de demonstração e testes). */
export function restaurar(hoje?: Date) {
  db = gerarDados(hoje)
  salvar()
}

export const demo = (): Demo => ({ ...DEMO_PADRAO, ...ler<Partial<Demo>>(CHAVE_DEMO) })
export const mudarDemo = (parcial: Partial<Demo>) => gravar(CHAVE_DEMO, { ...demo(), ...parcial })

export const novoId = (prefixo: string) => `${prefixo}-${db.seq++}`
export const agoraIso = () => new Date().toISOString()

// ------------------------------------------------------------------ visões (como a API vai montar)

export const eu = (): Eu | null => db.pessoas.find((p) => p.id === demo().pessoa) ?? null

const hojeIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
const somarDias = (iso: string, dias: number) => new Date(new Date(`${iso}T12:00:00`).getTime() + dias * 86_400_000).toISOString().slice(0, 10)

/** Encerramento do expediente; com "fim de expediente" ligado na demo, devolve daqui a 4 minutos. */
function encerramento(padrao: string) {
  if (!demo().fimExpediente) return padrao
  const d = new Date(Date.now() + 4 * 60_000)
  return d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
}

export function verUnidade(id: string): Unidade {
  const u = db.unidades.find((x) => x.id === id)!
  const finalizadas = db.contagens.filter((c) => c.unidade_id === id && c.situacao === "finalizada").map((c) => c.data).sort()
  const ultima = finalizadas.at(-1) ?? null
  const proxima = ultima ? somarDias(ultima, u.frequencia_dias) : hojeIso()
  return { ...u, encerramento: encerramento(u.encerramento), ultima_contagem: ultima, proxima_contagem: proxima, atrasada: proxima < hojeIso() }
}

export function verProduto({ preco_ref: _, ...p }: ProdutoDb): Produto {
  const hoje = new Date()
  return {
    ...p,
    saldos: Object.fromEntries(db.unidades.map((u) => [u.id, db.saldos[u.id]?.[p.id] ?? null])),
    consumo_mensal: Object.fromEntries(db.unidades.map((u) => [u.id, consumoMedioMensal(
      db.movimentacoes.filter((m) => m.tipo === "saida" && m.unidade_id === u.id && m.produto_id === p.id), hoje)])),
  }
}

export function verContagem(c: ContagemDb): Contagem {
  return { ...c, ...progresso(c.itens), divergencias: c.lista_divergencias.length }
}

export function verCotacao(c: CotacaoDb): Cotacao {
  const cotados = c.itens.filter((i) => i.preco != null)
  return {
    ...c,
    itens_qtd: c.itens.length,
    total: cotados.length ? cotados.reduce((s, i) => s + i.quantidade * (i.preco ?? 0), 0) : null,
  }
}

export const nomeProduto = (id: string) => db.produtos.find((p) => p.id === id)?.nome ?? id
