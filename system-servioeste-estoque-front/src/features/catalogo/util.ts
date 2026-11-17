import type { Produto } from "@/lib/tipos"

/** Saldo e mínimo na unidade ativa; com "todas", soma das liberadas (saldo `null` se nenhuma foi contada). */
export function saldoEMinimo(p: Produto, unidades: string[]) {
  const contados = unidades.map((u) => p.saldos[u] ?? null).filter((s): s is number => s !== null)
  return {
    saldo: contados.length ? contados.reduce((a, b) => a + b, 0) : null,
    minimo: unidades.reduce((a, u) => a + (p.minimos[u] ?? 0), 0),
  }
}

/** "pacote c/ 8" (ou "—" sem embalagem). */
export const textoEmbalagem = (p: Produto) => (p.embalagem ? `${p.embalagem.nome} c/ ${p.embalagem.quantidade}` : "—")
