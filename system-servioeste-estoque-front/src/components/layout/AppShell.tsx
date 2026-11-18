import { CircleAlert, Menu, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { AppRail } from "@/components/layout/AppRail"
import { Sidebar } from "@/components/layout/Sidebar"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { useEu, useUnidades } from "@/features/sessao/api"
import { useUnidadeAtiva } from "@/lib/unidade"

/**
 * Moldura das telas (moldura do Radar, spec 002): à esquerda um cartão com a barra de apps e a sidebar; à direita o
 * painel da tela. Até 1024 px a moldura vira uma barra fina com o botão que abre a sidebar em gaveta.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: eu, isLoading, error, refetch } = useEu()
  const { data: unidades = [] } = useUnidades()
  const { unidade, setUnidade } = useUnidadeAtiva()
  const [gaveta, setGaveta] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setGaveta(false), [pathname])
  // Unidade guardada que deixou de estar liberada (troca de pessoa) volta para "todas".
  useEffect(() => {
    if (unidade && unidades.length && !unidades.some((u) => u.id === unidade)) setUnidade("")
  }, [unidade, unidades, setUnidade])

  let conteudo = children
  if (isLoading) conteudo = <Carregando className="h-full" />
  else if (!eu && error) conteudo = <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
  else if (eu && eu.unidades.length === 0) {
    conteudo = <Vazio icone={CircleAlert} titulo="Nenhuma unidade liberada"
      descricao="Peça ao administrador para liberar as unidades em que você trabalha." />
  }
  const nomeUnidade = unidades.find((u) => u.id === unidade)?.nome ?? (unidades.length === 1 ? unidades[0].nome : "Todas as unidades")

  return (
    <div className="flex h-dvh gap-3 bg-background p-2 sm:p-3">
      <aside className="hidden shrink-0 rounded-2xl border bg-card lg:flex">
        <AppRail />
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2 lg:hidden">
          <button type="button" onClick={() => setGaveta(true)} aria-label="Abrir menu"
            className="grid size-9 place-items-center rounded-lg border hover:bg-accent">
            <Menu className="size-4" />
          </button>
          <img src="/favicon.svg" alt="" className="size-5" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">Estoque <span className="font-normal text-muted-foreground">· {nomeUnidade}</span></p>
        </header>
        <main className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-card">{conteudo}</main>
      </div>

      {gaveta && (
        <div className="fixed inset-0 z-50 flex bg-black/50 lg:hidden" onMouseDown={() => setGaveta(false)}>
          <aside role="dialog" aria-modal="true" aria-label="Menu" onMouseDown={(e) => e.stopPropagation()}
            className="relative m-2 flex rounded-2xl border bg-card shadow-xl">
            <AppRail />
            <Sidebar aoNavegar={() => setGaveta(false)} />
            <button type="button" onClick={() => setGaveta(false)} aria-label="Fechar menu"
              className="absolute -right-11 top-2 grid size-9 place-items-center rounded-lg border bg-card">
              <X className="size-4" />
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}
