import { ArrowLeftToLine, FlaskConical, Menu, Monitor, Moon, Sun } from "lucide-react"
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { useEu } from "@/features/sessao/api"
import { papeisPorExtenso } from "@/lib/papeis"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const TEMAS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

/** Opções da demonstração (trocar pessoa, simular sem conexão...). Só existe com os dados simulados ligados. */
const DemoMenu = import.meta.env.DEV && import.meta.env.VITE_MOCK === "true" ? lazy(() => import("@/mocks/DemoMenu")) : null

/** Endereço do Hub (o login e a saída são dele: constituição, núcleo IV). */
const HUB_URL = import.meta.env.VITE_HUB_URL ?? "/"

const itemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"

/** Menu hambúrguer da barra do topo (padrão do Hub): tema, área do dev e volta ao Hub. */
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
      <button type="button" aria-label="Menu" aria-expanded={aberto} aria-controls={menuId} onClick={() => setAberto((v) => !v)}
        className={cn("grid size-9 place-items-center rounded-full border transition-colors hover:bg-accent", aberto && "bg-accent")}>
        <Menu className="size-4" />
      </button>

      {aberto && (
        <div id={menuId} className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border bg-popover p-1.5 shadow-lg">
          {eu && (
            <div className="px-3 pb-2 pt-1.5">
              <p className="truncate text-sm font-medium">{eu.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{eu.email} · {papeisPorExtenso(eu)}</p>
            </div>
          )}
          {import.meta.env.DEV && (
            <Link to="/dev" className={itemClass} onClick={() => setAberto(false)}>
              <FlaskConical className="size-4 text-brand" /> Área de desenvolvimento
            </Link>
          )}
          {DemoMenu && <Suspense fallback={null}><DemoMenu aoMudar={() => setAberto(false)} /></Suspense>}

          <div className="my-1.5 border-t" />
          <p className="px-3 pb-1.5 pt-1 text-xs text-muted-foreground">Tema</p>
          <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5" role="radiogroup" aria-label="Tema">
            {TEMAS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)}
                className={cn("flex flex-col items-center gap-1 rounded-lg border py-2 text-xs transition-colors",
                  theme === value ? "border-brand bg-brand text-brand-foreground" : "hover:bg-accent")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="my-1.5 border-t" />
          <a href={HUB_URL} className={itemClass}>
            <ArrowLeftToLine className="size-4 text-muted-foreground" /> Voltar ao Hub
          </a>
        </div>
      )}
    </div>
  )
}
