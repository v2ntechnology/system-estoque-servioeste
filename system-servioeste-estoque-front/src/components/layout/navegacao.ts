import {
  ArrowLeftRight, ChartColumn, ClipboardList, FileSpreadsheet, LayoutDashboard, Package, ShoppingCart, Store, Truck,
  type LucideIcon,
} from "lucide-react"

import type { Papel } from "@/lib/tipos"

/** Contador ao lado do item, vindo do painel. */
export type Contador = "abaixo_minimo" | "contagens" | "cotacoes"

export interface ItemNav {
  to: string
  label: string
  icone: LucideIcon
  /** Vazio = todos os papéis veem. */
  papeis?: Papel[]
  contador?: Contador
  end?: boolean
}

const COMPRAS: Papel[] = ["comprador", "aprovador", "administrador"]
const ADMIN: Papel[] = ["administrador"]

/** Grupos da sidebar (referência: `docs/img/design/referencias/lista-de-produtos.png`). */
export const GRUPOS: { titulo: string | null; itens: ItemNav[] }[] = [
  { titulo: null, itens: [{ to: "/", label: "Painel", icone: LayoutDashboard, end: true }] },
  {
    titulo: "Estoque",
    itens: [
      { to: "/contagens", label: "Contagens", icone: ClipboardList, contador: "contagens" },
      { to: "/catalogo", label: "Catálogo", icone: Package, contador: "abaixo_minimo" },
      { to: "/movimentacoes", label: "Movimentações", icone: ArrowLeftRight },
    ],
  },
  {
    titulo: "Compras",
    itens: [
      { to: "/cotacoes", label: "Cotações", icone: ShoppingCart, papeis: COMPRAS, contador: "cotacoes" },
      { to: "/fornecedores", label: "Fornecedores", icone: Truck, papeis: COMPRAS },
    ],
  },
  { titulo: "Análise", itens: [{ to: "/relatorios", label: "Relatórios", icone: ChartColumn, papeis: COMPRAS }] },
  {
    titulo: "Administração",
    itens: [
      { to: "/importacao", label: "Importação", icone: FileSpreadsheet, papeis: ADMIN },
      { to: "/unidades", label: "Unidades", icone: Store, papeis: ADMIN },
    ],
  },
]
