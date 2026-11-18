import { FlaskConical, Plus } from "lucide-react"
import { Link } from "react-router-dom"

import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { cn } from "@/lib/utils"

import { APP_ATUAL, APPS, HUB } from "./apps"

const quadrado = "grid size-10 place-items-center rounded-xl border transition-colors"

/**
 * Barra de apps (moldura do Radar, `IconRail`): um ícone por aplicativo da Servioeste para ir de um ao outro.
 * O app atual fica marcado em verde (constituição, princípio XI).
 */
export function AppRail() {
  return (
    <nav aria-label="Aplicativos da Servioeste" className="flex w-16 shrink-0 flex-col items-center gap-2 border-r py-4">
      <a href={HUB.url} title="Servioeste Hub" aria-label="Servioeste Hub"
        className="mb-4 grid size-10 place-items-center rounded-xl bg-primary">
        <img src="/favicon.svg" alt="" className="size-5" />
      </a>
      <ul className="flex flex-col gap-2">
        {APPS.map((app) => {
          const atual = app.slug === APP_ATUAL
          const Icone = app.icone
          const conteudo = Icone ? <Icone className="size-[18px]" /> : <img src="/favicon.svg" alt="" className="size-[18px]" />
          return (
            <li key={app.slug}>
              {atual ? (
                <Link to="/" title={app.nome} aria-label={app.nome} aria-current="page"
                  className={cn(quadrado, "border-brand bg-brand/10 text-brand")}>{conteudo}</Link>
              ) : (
                <a href={app.url} title={app.nome} aria-label={app.nome}
                  className={cn(quadrado, "bg-background text-muted-foreground hover:border-brand/60 hover:text-brand")}>{conteudo}</a>
              )}
            </li>
          )
        })}
        <li>
          <a href={HUB.url} title={HUB.nome} aria-label={HUB.nome}
            className={cn(quadrado, "border-dashed text-muted-foreground hover:border-brand/60 hover:text-brand")}>
            <Plus className="size-4" />
          </a>
        </li>
      </ul>
      <div className="mt-auto flex flex-col items-center gap-1">
        {import.meta.env.DEV && (
          <Link to="/dev" title="Área de desenvolvimento" aria-label="Área de desenvolvimento"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-brand">
            <FlaskConical className="size-4" />
          </Link>
        )}
        <ThemeToggle />
      </div>
    </nav>
  )
}
