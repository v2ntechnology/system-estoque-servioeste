import { Coffee, Container, HardHat, Package, PenLine, ShoppingBag, SprayCan, type LucideIcon } from "lucide-react"

import type { TomMedidor } from "@/components/ui/medidor"
import type { Produto } from "@/lib/tipos"

/** Saldo e mínimo na unidade ativa; com "todas", soma das liberadas (saldo `null` se nenhuma foi contada). */
export function saldoEMinimo(p: Produto, unidades: string[]) {
  const contados = unidades.map((u) => p.saldos[u] ?? null).filter((s): s is number => s !== null)
  return {
    saldo: contados.length ? contados.reduce((a, b) => a + b, 0) : null,
    minimo: unidades.reduce((a, u) => a + (p.minimos[u] ?? 0), 0),
    consumo: unidades.reduce((a, u) => a + (p.consumo_mensal[u] ?? 0), 0),
  }
}

/** "pacote c/ 8" (ou "—" sem embalagem). */
export const textoEmbalagem = (p: Produto) => (p.embalagem ? `${p.embalagem.nome} c/ ${p.embalagem.quantidade}` : "—")

export type Situacao = "boa" | "atencao" | "critica" | "nao_contado"

/**
 * Situação do estoque pelo saldo em relação ao mínimo: abaixo do mínimo = crítica; até 1,5× = atenção; acima = boa.
 * Sem contagem não há situação (princípio VIII: não contado não é zero).
 */
export function situacao(saldo: number | null, minimo: number): Situacao {
  if (saldo === null) return "nao_contado"
  if (saldo < minimo) return "critica"
  if (saldo < minimo * 1.5) return "atencao"
  return "boa"
}

export const SITUACAO: Record<Situacao, { rotulo: string; tom: TomMedidor; ordem: number }> = {
  critica: { rotulo: "Crítica", tom: "destructive", ordem: 0 },
  atencao: { rotulo: "Atenção", tom: "warning", ordem: 1 },
  boa: { rotulo: "Boa", tom: "brand", ordem: 2 },
  nao_contado: { rotulo: "Não contado", tom: "vazio", ordem: 3 },
}

/** Quanto do medidor acende: 2× o mínimo enche o medidor. */
export const nivel = (saldo: number | null, minimo: number) => (saldo === null ? 0 : minimo ? saldo / (minimo * 2) : 1)

/** Ícone no lugar da foto do produto (as fotos ficam para depois: spec 002, fora do escopo). */
const ICONES: Record<string, LucideIcon> = {
  "c-sacos": ShoppingBag, "c-contentores": Container, "c-epi": HardHat, "c-limpeza": SprayCan, "c-escritorio": PenLine,
  "c-copa": Coffee,
}
export const iconeCategoria = (categoriaId: string): LucideIcon => ICONES[categoriaId] ?? Package
