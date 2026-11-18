import { NavLink } from "react-router-dom"

import { UserMenu } from "@/components/layout/UserMenu"
import { Select } from "@/components/ui/select"
import { usePainel } from "@/features/painel/api"
import { useEu, useUnidades } from "@/features/sessao/api"
import type { Painel } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

import { GRUPOS, type Contador } from "./navegacao"

function contar(painel: Painel | undefined, c: Contador): number {
  if (!painel) return 0
  if (c === "abaixo_minimo") return painel.abaixo_minimo.length
  if (c === "cotacoes") return painel.cotacoes_abertas.length
  return painel.contagens.filter((x) => x.atrasada || x.aberta_id).length
}

/** Sidebar do Estoque: marca, unidade ativa, telas agrupadas com contadores e, no pé, a pessoa com o menu. */
export function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { data: eu } = useEu()
  const { data: unidades = [] } = useUnidades()
  const { unidade, setUnidade } = useUnidadeAtiva()
  const { data: painel } = usePainel(unidade)

  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter((i) => !i.papeis || i.papeis.some((p) => eu?.papeis.includes(p))) }))
    .filter((g) => g.itens.length)

  return (
    <div className="flex w-60 min-w-0 flex-col">
      <div className="space-y-3 px-3 pb-3 pt-4">
        <p className="flex items-center gap-2 px-2 text-[15px] font-medium tracking-tight">
          Servioeste <span className="text-muted-foreground">Estoque</span>
        </p>
        {unidades.length > 1 && (
          <Select aria-label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="h-9 w-full">
            <option value="">Todas as unidades</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        )}
        {unidades.length === 1 && <p className="rounded-lg border px-3 py-2 text-sm">{unidades[0].nome}</p>}
      </div>

      <nav aria-label="Principal" className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {grupos.map((g) => (
          <div key={g.titulo ?? "inicio"} className={cn(g.titulo && "border-t pt-4")}>
            {g.titulo && <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.titulo}</p>}
            <ul className="space-y-0.5">
              {g.itens.map((i) => {
                const n = i.contador ? contar(painel, i.contador) : 0
                return (
                  <li key={i.to}>
                    <NavLink to={i.to} end={i.end} onClick={aoNavegar}
                      className={({ isActive }) => cn(
                        "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        isActive && "bg-brand/10 font-medium text-foreground hover:bg-brand/15",
                      )}>
                      {({ isActive }) => (
                        <>
                          <i.icone className={cn("size-4 shrink-0 group-hover:text-brand", isActive && "text-brand")} />
                          <span className="flex-1 truncate">{i.label}</span>
                          {n > 0 && (
                            <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] font-medium tabular-nums text-foreground">{n}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <UserMenu />
      </div>
    </div>
  )
}
