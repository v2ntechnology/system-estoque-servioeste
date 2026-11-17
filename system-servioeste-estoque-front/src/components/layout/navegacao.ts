import type { Papel } from "@/lib/tipos"

/** Abas da barra do topo. `papeis` vazio = todos veem. */
export const NAV: { to: string; label: string; papeis?: Papel[]; end?: boolean }[] = [
  { to: "/", label: "Painel", end: true },
  { to: "/contagens", label: "Contagens" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/movimentacoes", label: "Movimentações" },
  { to: "/cotacoes", label: "Cotações", papeis: ["comprador", "aprovador", "administrador"] },
  { to: "/fornecedores", label: "Fornecedores", papeis: ["comprador", "aprovador", "administrador"] },
  { to: "/relatorios", label: "Relatórios", papeis: ["comprador", "aprovador", "administrador"] },
  { to: "/importacao", label: "Importação", papeis: ["administrador"] },
  { to: "/unidades", label: "Unidades", papeis: ["administrador"] },
]
