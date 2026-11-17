import type { StatusCotacao } from "@/lib/tipos"

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Quantidade; `null` (não contado) vira "—", nunca "0" (constituição, princípio VIII). */
export const numero = (v: number | null | undefined) => (v == null ? "—" : nf.format(v))
export const reais = (v: number | null | undefined) => (v == null ? "—" : brl.format(v))

/** "2026-10-26" -> "26/10/2026" */
export const dataBR = (iso?: string | null) => {
  if (!iso) return "—"
  const [a, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${a}`
}

/** Data e hora no fuso de Brasília (núcleo I). */
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })

export const hora = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })

/** "2026-10" -> "outubro de 2026" */
export const mesPorExtenso = (mes: string) =>
  new Date(`${mes}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

/** Data de hoje (Brasília) como "AAAA-MM-DD". */
export const hojeIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

/** Dias entre hoje e a data (positivo = futuro). */
export const diasAte = (iso: string) =>
  Math.round((new Date(`${iso.slice(0, 10)}T12:00:00`).getTime() - new Date(`${hojeIso()}T12:00:00`).getTime()) / 86_400_000)

/** Lê uma quantidade digitada: "" -> null (não contado); "1,5" -> 1.5; inválida -> undefined. */
export function lerQuantidade(texto: string): number | null | undefined {
  const t = texto.trim().replace(",", ".")
  if (t === "") return null
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined
  return Number(t)
}

/** Tom visual de um status: vira a variante do Badge. */
export type Tom = "brand" | "warning" | "destructive" | "outline" | "default"

export const STATUS_COTACAO: Record<StatusCotacao, { rotulo: string; tom: Tom }> = {
  rascunho: { rotulo: "Rascunho", tom: "default" },
  enviada: { rotulo: "Enviada", tom: "warning" },
  aprovada: { rotulo: "Aprovada", tom: "brand" },
  recebida: { rotulo: "Recebida", tom: "outline" },
}

export const ETAPAS_COTACAO: StatusCotacao[] = ["rascunho", "enviada", "aprovada", "recebida"]

/** "Ana Paula Souza" -> "AS" (avatar). */
export const initials = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)![0] : "")).toUpperCase()
}
