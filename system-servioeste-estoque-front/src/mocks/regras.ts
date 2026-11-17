// Regras de negócio usadas pelos dados simulados (spec 001, research D6 e D7). São funções puras, com teste em
// tests/regras.test.ts, e vão para o back-end (Python) na spec da API com os mesmos casos de teste.
import type { Divergencia, ItemContagem, Movimentacao } from "@/lib/tipos"

/** Divergência: queda maior que 10% e de pelo menos 2 unidades em relação ao esperado. */
export const LIMITE_PERCENTUAL = 0.1
export const LIMITE_ABSOLUTO = 2

/**
 * Compara a contagem nova com a anterior, descontando as movimentações registradas no intervalo.
 * Item não contado (`null`) nunca gera divergência (princípio VIII), nem item sem contagem anterior.
 */
export function calcularDivergencias(
  itens: ItemContagem[],
  anterior: Map<string, number | null>,
  movimentacoes: Pick<Movimentacao, "produto_id" | "tipo" | "quantidade">[],
): Divergencia[] {
  const resultado: Divergencia[] = []
  for (const item of itens) {
    const antes = anterior.get(item.produto_id)
    if (item.quantidade == null || antes == null) continue
    const doProduto = movimentacoes.filter((m) => m.produto_id === item.produto_id)
    const entradas = soma(doProduto.filter((m) => m.tipo === "entrada").map((m) => m.quantidade))
    const saidas = soma(doProduto.filter((m) => m.tipo === "saida").map((m) => m.quantidade))
    const esperado = antes + entradas - saidas
    const falta = esperado - item.quantidade
    if (falta >= LIMITE_ABSOLUTO && falta > esperado * LIMITE_PERCENTUAL) {
      resultado.push({ produto_id: item.produto_id, anterior: antes, entradas, saidas, esperado, contado: item.quantidade })
    }
  }
  return resultado
}

/** Quanto comprar: cobre a falta até o mínimo mais um mês de consumo, arredondado para a embalagem. */
export function sugerirCompra(saldo: number | null, minimo: number, consumoMensal: number, embalagem: number | null): number {
  const bruto = Math.max(0, minimo + consumoMensal - (saldo ?? 0))
  if (bruto === 0) return 0
  const passo = embalagem && embalagem > 1 ? embalagem : 1
  return Math.ceil(bruto / passo) * passo
}

/** Consumo médio mensal: saídas dos últimos `dias` dias convertidas para 30 dias. */
export function consumoMedioMensal(saidas: Pick<Movimentacao, "quantidade" | "data">[], hoje: Date, dias = 90): number {
  const inicio = hoje.getTime() - dias * 86_400_000
  const total = soma(saidas.filter((s) => new Date(s.data).getTime() >= inicio).map((s) => s.quantidade))
  return Math.round((total / dias) * 30)
}

/** Contados e total de uma contagem: vazio não conta, zero conta. */
export function progresso(itens: Pick<ItemContagem, "quantidade">[]) {
  return { contados: itens.filter((i) => i.quantidade !== null).length, total: itens.length }
}

const soma = (v: number[]) => v.reduce((a, b) => a + b, 0)
