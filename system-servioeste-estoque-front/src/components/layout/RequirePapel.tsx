import { ShieldOff } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Carregando, Vazio } from "@/components/ui/estados"
import { useEu } from "@/features/sessao/api"
import type { Papel } from "@/lib/tipos"

/** Mostra a tela só para quem tem um dos papéis. A API também recusa: isto é só para a interface não enganar. */
export function RequirePapel({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const { data: eu, isLoading } = useEu()
  if (isLoading) return <AppShell><Carregando /></AppShell>
  if (eu && papeis.some((p) => eu.papeis.includes(p))) return <>{children}</>
  return (
    <AppShell>
      <Vazio icone={ShieldOff} titulo="Sem acesso" descricao="Seu papel não permite abrir esta tela."
        acao={<Link to="/" className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium hover:bg-accent">Voltar ao painel</Link>} />
    </AppShell>
  )
}
