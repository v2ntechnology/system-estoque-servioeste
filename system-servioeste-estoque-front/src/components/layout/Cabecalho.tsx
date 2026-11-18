import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Título padrão de cada tela (referência `docs/img/design/referencias/lista-de-produtos.png`): título grande,
 * descrição e as ações (busca, filtros, botão principal preto) à direita. `icone` só é mostrado na área do dev.
 */
export function Cabecalho({ icone: Icone, titulo, descricao, acoes, comIcone = false }: {
  icone?: LucideIcon
  titulo: string
  descricao?: string
  acoes?: ReactNode
  comIcone?: boolean
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl tracking-tight sm:text-[28px]">
          {comIcone && Icone && <Icone className="size-5 shrink-0 text-muted-foreground" />} {titulo}
        </h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  )
}
