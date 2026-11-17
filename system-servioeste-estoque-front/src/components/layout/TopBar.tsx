import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"

import { NAV } from "@/components/layout/navegacao"
import { UserMenu } from "@/components/layout/UserMenu"
import { Avatar } from "@/components/ui/avatar"
import { Select } from "@/components/ui/select"
import { useEu, useUnidades } from "@/features/sessao/api"
import { hora } from "@/lib/format"
import { papeisPorExtenso } from "@/lib/papeis"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

function useRelogio() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return agora
}

/** Barra do topo (padrão do Hub): a pessoa à esquerda, as abas em pílula no meio; unidade, relógio e menu à direita.
 *  No celular as abas descem para uma linha própria e rolam na horizontal. */
export function TopBar({ className }: { className?: string }) {
  const { data: eu } = useEu()
  const { data: unidades = [] } = useUnidades()
  const { unidade, setUnidade } = useUnidadeAtiva()
  const agora = useRelogio()
  const abas = NAV.filter((n) => !n.papeis || n.papeis.some((p) => eu?.papeis.includes(p)))

  // Unidade guardada que deixou de estar liberada (troca de pessoa) volta para "todas".
  useEffect(() => {
    if (unidade && unidades.length && !unidades.some((u) => u.id === unidade)) setUnidade("")
  }, [unidade, unidades, setUnidade])

  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-3 xl:grid xl:grid-cols-[1fr_auto_1fr]", className)}>
      <div className="flex min-w-0 items-center gap-3 justify-self-start">
        <Avatar name={eu?.nome ?? ""} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{eu?.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{eu ? papeisPorExtenso(eu) : ""}</p>
        </div>
      </div>

      <nav aria-label="Principal"
        className="no-scrollbar order-last flex w-full items-center gap-1 overflow-x-auto rounded-full bg-foreground/5 p-1 text-sm xl:order-none xl:col-start-2 xl:w-auto">
        {abas.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:px-4",
              isActive && "bg-brand font-medium text-brand-foreground hover:text-brand-foreground",
            )}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        {unidades.length > 1 && (
          <Select aria-label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="h-9 w-44">
            <option value="">Todas as unidades</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        )}
        {unidades.length === 1 && <span className="text-sm text-muted-foreground">{unidades[0].nome}</span>}
        <span className="hidden text-sm tabular-nums sm:inline">{hora(agora)}</span>
        <UserMenu />
      </div>
    </header>
  )
}
