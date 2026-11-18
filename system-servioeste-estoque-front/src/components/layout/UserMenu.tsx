import { ArrowLeftToLine, ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react"
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react"

import { Avatar } from "@/components/ui/avatar"
import { useEu } from "@/features/sessao/api"
import { papeisPorExtenso } from "@/lib/papeis"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

import { HUB } from "./apps"

const TEMAS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

/** Opções da demonstração (trocar pessoa, simular sem conexão...). Só existe com os dados simulados ligados. */
const DemoMenu = import.meta.env.DEV && import.meta.env.VITE_MOCK === "true" ? lazy(() => import("@/mocks/DemoMenu")) : null


const itemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"

/** Pessoa no pé da sidebar; abre para cima com tema, demonstração e volta ao Hub (o login e a saída são do Hub). */
export function UserMenu() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const { theme, setTheme } = useTheme()
  const { data: eu } = useEu()

  useEffect(() => {
    if (!aberto) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [aberto])

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Menu da pessoa" aria-expanded={aberto} aria-controls={menuId} onClick={() => setAberto((v) => !v)}
        className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent", aberto && "bg-accent")}>
        <Avatar name={eu?.nome ?? ""} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{eu?.nome}</span>
          <span className="block truncate text-xs text-muted-foreground">{eu ? papeisPorExtenso(eu) : ""}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto && (
        <div id={menuId} className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border bg-popover p-1.5 shadow-lg">
          {eu && (
            <div className="px-3 pb-2 pt-1.5">
              <p className="truncate text-sm font-medium">{eu.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{eu.email} · {papeisPorExtenso(eu)}</p>
            </div>
          )}
          {DemoMenu && <Suspense fallback={null}><DemoMenu aoMudar={() => setAberto(false)} /></Suspense>}

          <div className="my-1.5 border-t" />
          <p className="px-3 pb-1.5 pt-1 text-xs text-muted-foreground">Tema</p>
          <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5" role="radiogroup" aria-label="Tema">
            {TEMAS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)}
                className={cn("flex flex-col items-center gap-1 rounded-lg border py-2 text-xs transition-colors",
                  theme === value ? "border-brand bg-brand/10 text-foreground" : "hover:bg-accent")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="my-1.5 border-t" />
          <a href={HUB.url} className={itemClass}>
            <ArrowLeftToLine className="size-4 text-muted-foreground" /> Voltar ao Hub
          </a>
        </div>
      )}
    </div>
  )
}
