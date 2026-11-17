import { ArrowUpRight, FlaskConical } from "lucide-react"
import type { ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"

import { Brand } from "@/components/layout/Brand"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { cn } from "@/lib/utils"

const ABAS = [
  { to: "/dev", label: "Visão geral", end: true },
  { to: "/dev/implementacao", label: "Implementação" },
  { to: "/dev/backlog", label: "Backlog" },
  { to: "/dev/historico", label: "Histórico" },
  { to: "/dev/changelog", label: "Changelog" },
  { to: "/dev/documentos", label: "Documentos" },
]

/** Moldura da área do desenvolvedor (padrão do Ponto): mesmo visual do sistema, com a marca "Desenvolvimento". */
export function DevShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col gap-3 bg-background p-3 sm:px-5">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 md:grid md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3">
          <Brand />
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand/60 px-2 py-0.5 text-xs text-brand">
            <FlaskConical className="size-3" /> Desenvolvimento
          </span>
        </div>
        <nav aria-label="Área do desenvolvedor"
          className="no-scrollbar order-last flex w-full items-center gap-1 overflow-x-auto rounded-full bg-foreground/5 p-1 text-sm md:order-none md:col-start-2 md:w-auto">
          {ABAS.map((a) => (
            <NavLink key={a.to} to={a.to} end={a.end}
              className={({ isActive }) => cn("whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:px-4",
                isActive && "bg-brand font-medium text-brand-foreground hover:text-brand-foreground")}>
              {a.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 justify-self-end">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Ir para o sistema <ArrowUpRight className="size-4" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-card">{children}</main>
    </div>
  )
}

export { Barra } from "@/components/ui/barra"
