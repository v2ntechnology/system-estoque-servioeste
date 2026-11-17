import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom"

import { ErroCarga } from "@/components/ui/estados"

/** Erro inesperado de rota: mensagem simples e volta ao painel. */
export function ErrorPage() {
  const e = useRouteError()
  const mensagem = isRouteErrorResponse(e) ? `${e.status} ${e.statusText}` : e instanceof Error ? e.message : undefined
  return (
    <div className="grid h-dvh place-items-center bg-background p-4">
      <div className="text-center">
        <ErroCarga mensagem={mensagem} />
        <Link to="/" className="text-sm text-brand underline-offset-4 hover:underline">Voltar ao painel</Link>
      </div>
    </div>
  )
}
