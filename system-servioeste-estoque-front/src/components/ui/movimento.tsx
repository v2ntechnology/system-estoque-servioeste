import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

import { numero } from "@/lib/format"
import type { TipoMovimentacao } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/** Cor de entrada (verde) e saída (vermelho), iguais em todo o sistema (constituição, princípio XI). */
const COR_MOVIMENTO: Record<TipoMovimentacao, string> = {
  entrada: "text-brand",
  saida: "text-destructive",
}

/** Selo "↙ Entrada" (verde) ou "↗ Saída" (vermelho). */
export function SeloMovimento({ tipo, className }: { tipo: TipoMovimentacao; className?: string }) {
  const entrada = tipo === "entrada"
  const Seta = entrada ? ArrowDownLeft : ArrowUpRight
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
      entrada ? "bg-brand/10 text-brand" : "bg-destructive/10 text-destructive", className)}>
      <Seta className="size-3" /> {entrada ? "Entrada" : "Saída"}
    </span>
  )
}

/** Quantidade com sinal e cor: "+12" verde, "−3" vermelho; zero fica cinza. */
export function QtdMovimento({ tipo, quantidade, sufixo, className }: {
  tipo: TipoMovimentacao
  quantidade: number
  sufixo?: string
  className?: string
}) {
  if (!quantidade) return <span className={cn("tabular-nums text-muted-foreground", className)}>0</span>
  return (
    <span className={cn("font-medium tabular-nums", COR_MOVIMENTO[tipo], className)}>
      {tipo === "entrada" ? "+" : "−"}{numero(quantidade)}{sufixo ? ` ${sufixo}` : ""}
    </span>
  )
}
