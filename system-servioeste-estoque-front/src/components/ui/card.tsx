import { ChevronDown, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Cartão das telas: título com ícone verde (padrão do Hub) e ação à direita. */
export function Card({ titulo, icone: Icone, acao, className, children }: {
  titulo?: ReactNode
  icone?: LucideIcon
  acao?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-2xl border bg-background p-4 sm:p-5", className)}>
      {(titulo || acao) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {Icone && <Icone className="size-4 shrink-0 text-brand" />} {titulo}
          </h2>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

/** Indicador numérico (rótulo, valor grande e detalhe). */
export function Kpi({ rotulo, valor, detalhe, tom }: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  tom?: "brand" | "warning"
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className={cn("mt-1 text-2xl font-medium tabular-nums tracking-tight",
        tom === "brand" && "text-brand", tom === "warning" && "text-warning")}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}

const FAIXA = {
  brand: "border-brand/30 bg-brand/10 [&>svg]:text-brand",
  warning: "border-warning/30 bg-warning/10 [&>svg]:text-warning",
  destructive: "border-destructive/30 bg-destructive/10 [&>svg]:text-destructive",
  default: "bg-muted/50 [&>svg]:text-muted-foreground",
}

/** Faixa de aviso dentro da tela (resultado da conferência, erros, prévia). */
export function Faixa({ tom = "default", icone: Icone, children }: {
  tom?: keyof typeof FAIXA
  icone: LucideIcon
  children: ReactNode
}) {
  return (
    <div role={tom === "destructive" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", FAIXA[tom])}>
      <Icone />
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
    </div>
  )
}

/** Bloco que abre e fecha (opções avançadas, modo teste, log completo). */
export function Recolhivel({ titulo, icone: Icone, inicial = false, children }: {
  titulo: string
  icone?: LucideIcon
  inicial?: boolean
  children: ReactNode
}) {
  const [aberto, setAberto] = useState(inicial)
  return (
    <div className="rounded-xl border">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent">
        {Icone && <Icone className="size-4 text-muted-foreground" />}
        <span className="flex-1 text-left">{titulo}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>
      {aberto && <div className="space-y-4 border-t p-3">{children}</div>}
    </div>
  )
}
