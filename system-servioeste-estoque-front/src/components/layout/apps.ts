import { Clock, LayoutGrid, Radar, Recycle, type LucideIcon } from "lucide-react"

/**
 * Aplicativos da Servioeste na barra de apps. Em produção ficam no domínio único (`/<slug>/`); em desenvolvimento,
 * nas portas locais de cada projeto. Lista fixa nesta fase (spec 002): depois vem do Hub (`GET /api/apps`), só com os
 * apps liberados para a pessoa, porque quem decide o acesso é o Hub (constituição, núcleo IV).
 */
export interface AppServioeste {
  slug: string
  nome: string
  url: string
  icone: LucideIcon | null
}

const dev = import.meta.env.DEV
const HUB_URL = import.meta.env.VITE_HUB_URL ?? (dev ? "http://localhost:5174/" : "/")

export const HUB: AppServioeste = { slug: "hub", nome: "Hub · todos os aplicativos", url: HUB_URL, icone: LayoutGrid }

export const APPS: AppServioeste[] = [
  { slug: "estoque", nome: "Estoque", url: "/", icone: null },
  { slug: "radar", nome: "Radar", url: dev ? "http://localhost:5173/" : "/radar/", icone: Radar },
  { slug: "ponto", nome: "Ponto digital", url: dev ? "http://localhost:5175/" : "/ponto/", icone: Clock },
  { slug: "residuos", nome: "Resíduos", url: dev ? "http://localhost:5176/" : "/residuos/", icone: Recycle },
]

export const APP_ATUAL = "estoque"
