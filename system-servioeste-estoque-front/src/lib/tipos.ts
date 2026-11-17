// Contrato da API /api/v1 (spec 001). Hoje quem responde são os dados simulados (src/mocks); quando o back-end existir,
// estes tipos passam a ser gerados do openapi.yaml dele, como no Ponto. Campos em português sem acento.

export type Papel = "contador" | "comprador" | "aprovador" | "administrador"

/** Pessoa da sessão. A identidade vem do Hub; papéis e unidades são do Estoque. */
export interface Eu {
  id: string
  nome: string
  email: string
  papeis: Papel[]
  /** Ids das unidades liberadas. */
  unidades: string[]
}

export interface Unidade {
  id: string
  nome: string
  /** "HH:MM", fim do expediente (aviso de contagem pendente). */
  encerramento: string
  /** Dias entre contagens. */
  frequencia_dias: number
  ultima_contagem: string | null
  proxima_contagem: string
  atrasada: boolean
}

export interface Categoria {
  id: string
  nome: string
}

export interface Lote {
  id: string
  unidade_id: string
  numero: string
  validade: string
  quantidade: number
}

export interface Produto {
  id: string
  codigo: string
  nome: string
  categoria_id: string
  /** Unidade de medida da contagem (UN, RL, CX, L, KG...). */
  medida: string
  /** Ex.: { nome: "pacote", quantidade: 8 } = 1 pacote tem 8 unidades. */
  embalagem: { nome: string; quantidade: number } | null
  controla_validade: boolean
  /** Saldo por unidade (id da unidade -> quantidade). `null` = nunca contado nessa unidade. */
  saldos: Record<string, number | null>
  /** Estoque mínimo por unidade. */
  minimos: Record<string, number>
  /** Consumo médio mensal por unidade. */
  consumo_mensal: Record<string, number>
}

export interface ProdutoDetalhe extends Produto {
  lotes: Lote[]
  precos: PrecoAprovado[]
}

export interface PrecoAprovado {
  fornecedor_id: string
  fornecedor: string
  preco: number
  data: string
  cotacao_id: string
}

// ------------------------------------------------------------------ contagens

export type SituacaoContagem = "aberta" | "finalizada"

export interface ItemContagem {
  produto_id: string
  /** `null` = não contado. Zero só quando digitado (constituição, princípio VIII). */
  quantidade: number | null
  observacao: string
  /** Nome da foto anexada (nos simulados não há arquivo de verdade). */
  foto: string | null
}

export interface Divergencia {
  produto_id: string
  anterior: number
  entradas: number
  saidas: number
  esperado: number
  contado: number
}

export interface ContagemResumo {
  id: string
  unidade_id: string
  data: string
  responsavel: string
  situacao: SituacaoContagem
  contados: number
  total: number
  divergencias: number
  finalizada_em: string | null
}

export interface Contagem extends ContagemResumo {
  itens: ItemContagem[]
  lista_divergencias: Divergencia[]
}

export interface AlteracaoItem {
  produto_id: string
  quantidade?: number | null
  observacao?: string
  foto?: string | null
}

// ------------------------------------------------------------------ movimentações

export type TipoMovimentacao = "entrada" | "saida"
export type OrigemMovimentacao = "manual" | "cotacao" | "importacao"

export interface Movimentacao {
  id: string
  tipo: TipoMovimentacao
  produto_id: string
  unidade_id: string
  quantidade: number
  data: string
  origem: OrigemMovimentacao
  /** Id da cotação, quando a origem é uma cotação recebida. */
  referencia: string | null
  observacao: string
  autor: string
}

export interface NovaMovimentacao {
  tipo: TipoMovimentacao
  produto_id: string
  unidade_id: string
  quantidade: number
  observacao: string
}

// ------------------------------------------------------------------ cotações

export type StatusCotacao = "rascunho" | "enviada" | "aprovada" | "recebida"
export type TipoAnexo = "proposta" | "nota_fiscal" | "boleto"

export interface ItemCotacao {
  produto_id: string
  quantidade: number
  /** Preço unitário proposto/aprovado; `null` enquanto não cotado. */
  preco: number | null
}

export interface Anexo {
  id: string
  tipo: TipoAnexo
  nome: string
  enviado_em: string
  autor: string
}

export interface EventoCotacao {
  data: string
  autor: string
  descricao: string
}

export interface CotacaoResumo {
  id: string
  numero: number
  titulo: string
  unidade_id: string
  status: StatusCotacao
  fornecedor_id: string | null
  criada_em: string
  total: number | null
  itens_qtd: number
}

export interface Cotacao extends CotacaoResumo {
  itens: ItemCotacao[]
  anexos: Anexo[]
  eventos: EventoCotacao[]
  aprovada_por: string | null
  aprovada_em: string | null
  observacao: string
}

export interface NovaCotacao {
  titulo: string
  unidade_id: string
  itens: ItemCotacao[]
}

export interface AlteracaoCotacao {
  titulo?: string
  fornecedor_id?: string | null
  observacao?: string
  itens?: ItemCotacao[]
}

export interface Sugestao {
  produto_id: string
  saldo: number | null
  minimo: number
  consumo_mensal: number
  sugerido: number
}

export interface ModeloCotacao {
  id: string
  nome: string
  itens: { produto_id: string; quantidade: number }[]
}

export interface Fornecedor {
  id: string
  nome: string
  contato: string
  telefone: string
  categorias: string[]
}

// ------------------------------------------------------------------ painel e relatórios

export interface Painel {
  abaixo_minimo: { produto_id: string; unidade_id: string; saldo: number; minimo: number }[]
  contagens: { unidade_id: string; proxima: string; atrasada: boolean; aberta_id: string | null }[]
  cotacoes_abertas: CotacaoResumo[]
  divergencias: (Divergencia & { unidade_id: string; contagem_id: string })[]
  validade: (Lote & { produto_id: string; dias: number })[]
}

export interface LinhaRelatorio {
  produto_id: string
  saldo_inicial: number | null
  entradas: number
  saidas: number
  saldo_final: number | null
  saldo_mes_anterior: number | null
}

export interface RelatorioMensal {
  unidade_id: string
  mes: string // "AAAA-MM"
  linhas: LinhaRelatorio[]
  totais: { entradas: number; saidas: number; gasto: number; gasto_mes_anterior: number }
}

// ------------------------------------------------------------------ importação

export type TipoPlanilha = "declaracao_estoque" | "cotacao"

export interface LinhaImportacao {
  linha: number
  codigo: string | null
  nome: string
  quantidade: number | null
  medida: string
  observacao: string
  /** Produto do catálogo associado (pelo código ou manualmente). */
  produto_id: string | null
  situacao: "ok" | "novo" | "associar" | "erro"
  erro: string | null
}

export interface PreviaImportacao {
  id: string
  arquivo: string
  tipo: TipoPlanilha
  unidade_id: string
  responsavel: string
  data: string
  linhas: LinhaImportacao[]
}

export interface ResultadoImportacao {
  produtos_criados: number
  itens_importados: number
  ignorados: number
  contagem_id: string | null
}
