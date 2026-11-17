import { CircleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { TopBar } from "@/components/layout/TopBar"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { useEu } from "@/features/sessao/api"

/** Moldura das telas (HubShell do Servioeste Hub): barra do topo + painel principal arredondado. */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: eu, isLoading, error, refetch } = useEu()
  let conteudo = children
  if (isLoading) conteudo = <Carregando className="h-full" />
  else if (!eu && error) conteudo = <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
  else if (eu && eu.unidades.length === 0) {
    conteudo = <Vazio icone={CircleAlert} titulo="Nenhuma unidade liberada"
      descricao="Peça ao administrador para liberar as unidades em que você trabalha." />
  }
  return (
    <div className="flex h-dvh flex-col gap-3 bg-background p-3 sm:px-5">
      <TopBar className="px-1 pt-1" />
      <main className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-card">{conteudo}</main>
    </div>
  )
}
