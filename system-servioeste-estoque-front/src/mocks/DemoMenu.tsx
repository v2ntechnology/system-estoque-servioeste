// Opções do menu só para a demonstração (dados simulados). Carregado por UserMenu só com VITE_MOCK=true em dev.
import { useQueryClient } from "@tanstack/react-query"
import { AlarmClock, RotateCcw, UserRound, WifiOff } from "lucide-react"
import { useState } from "react"

import { NOME_PAPEL } from "@/lib/papeis"
import { cn } from "@/lib/utils"

import { db, demo, mudarDemo, restaurar } from "./db"

const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"

export default function DemoMenu({ aoMudar }: { aoMudar: () => void }) {
  const qc = useQueryClient()
  const [estado, setEstado] = useState(demo)
  // "Sem conexão" não recarrega nada: o que já está na tela continua, como num celular que perdeu o sinal.
  const atualizar = (parcial: Parameters<typeof mudarDemo>[0]) => {
    mudarDemo(parcial)
    setEstado(demo())
    if (parcial.pessoa) qc.invalidateQueries()
    if (parcial.fimExpediente !== undefined) qc.invalidateQueries({ queryKey: ["unidades"] })
  }

  return (
    <div className="mt-1.5 border-t pt-1.5">
      <p className="px-3 pb-1 pt-1 text-xs text-muted-foreground">Demonstração · ver como</p>
      {db.pessoas.map((p) => (
        <button key={p.id} type="button" className={cn(item, estado.pessoa === p.id && "bg-brand/10 font-medium text-brand")}
          onClick={() => { atualizar({ pessoa: p.id }); aoMudar() }}>
          <UserRound className="size-4" />
          <span className="min-w-0 flex-1 truncate">{p.nome.split(" ")[0]} <span className="text-xs text-muted-foreground">· {p.papeis.map((x) => NOME_PAPEL[x]).join(", ")}</span></span>
        </button>
      ))}
      <label className={cn(item, "cursor-pointer")}>
        <WifiOff className="size-4 text-warning" />
        <span className="flex-1">Simular sem conexão</span>
        <input type="checkbox" className="accent-[var(--brand)]" checked={estado.semConexao} onChange={(e) => atualizar({ semConexao: e.target.checked })} />
      </label>
      <label className={cn(item, "cursor-pointer")}>
        <AlarmClock className="size-4 text-warning" />
        <span className="flex-1">Simular fim do expediente</span>
        <input type="checkbox" className="accent-[var(--brand)]" checked={estado.fimExpediente} onChange={(e) => atualizar({ fimExpediente: e.target.checked })} />
      </label>
      <button type="button" className={item} onClick={() => { restaurar(); qc.invalidateQueries(); aoMudar() }}>
        <RotateCcw className="size-4 text-muted-foreground" /> Restaurar dados de exemplo
      </button>
    </div>
  )
}
