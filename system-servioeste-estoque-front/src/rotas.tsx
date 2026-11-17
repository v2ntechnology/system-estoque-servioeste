import { Navigate, type RouteObject } from "react-router-dom"

import { RequirePapel } from "@/components/layout/RequirePapel"
import { CatalogoPage } from "@/pages/CatalogoPage"
import { ContagemPage } from "@/pages/ContagemPage"
import { ContagensPage } from "@/pages/ContagensPage"
import { CotacaoNovaPage } from "@/pages/CotacaoNovaPage"
import { CotacaoPage } from "@/pages/CotacaoPage"
import { CotacaoPdfPage } from "@/pages/CotacaoPdfPage"
import { CotacoesPage } from "@/pages/CotacoesPage"
import { ErrorPage } from "@/pages/ErrorPage"
import { FornecedoresPage } from "@/pages/FornecedoresPage"
import { ImportacaoPage } from "@/pages/ImportacaoPage"
import { MovimentacoesPage } from "@/pages/MovimentacoesPage"
import { PainelPage } from "@/pages/PainelPage"
import { ProdutoPage } from "@/pages/ProdutoPage"
import { RelatoriosPage } from "@/pages/RelatoriosPage"
import { UnidadesPage } from "@/pages/UnidadesPage"
import type { Papel } from "@/lib/tipos"

/**
 * Área do desenvolvedor (/dev): implementação, backlog, histórico, changelog e documentos.
 * Só em desenvolvimento: no build de produção `import.meta.env.DEV` vira `false` e o import some do pacote.
 */
const rotasDev: RouteObject[] = import.meta.env.DEV
  ? [{ path: "/dev/*", lazy: async () => ({ Component: (await import("@/dev/DevApp")).DevApp }), errorElement: <ErrorPage /> }]
  : []

const COMPRAS: Papel[] = ["comprador", "aprovador", "administrador"]
const ADMIN: Papel[] = ["administrador"]
const so = (papeis: Papel[], el: React.ReactNode) => <RequirePapel papeis={papeis}>{el}</RequirePapel>

/** Rotas do sistema. Exportadas para os testes montarem o mesmo app com um roteador em memória. */
export const rotas: RouteObject[] = [
  {
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <PainelPage /> },
      { path: "/contagens", element: <ContagensPage /> },
      { path: "/contagens/:id", element: <ContagemPage /> },
      { path: "/catalogo", element: <CatalogoPage /> },
      { path: "/catalogo/:id", element: <ProdutoPage /> },
      { path: "/movimentacoes", element: <MovimentacoesPage /> },
      { path: "/cotacoes", element: so(COMPRAS, <CotacoesPage />) },
      { path: "/cotacoes/nova", element: so(["comprador", "administrador"], <CotacaoNovaPage />) },
      { path: "/cotacoes/:id", element: so(COMPRAS, <CotacaoPage />) },
      { path: "/cotacoes/:id/pdf", element: so(COMPRAS, <CotacaoPdfPage />) },
      { path: "/fornecedores", element: so(COMPRAS, <FornecedoresPage />) },
      { path: "/relatorios", element: so(COMPRAS, <RelatoriosPage />) },
      { path: "/importacao", element: so(ADMIN, <ImportacaoPage />) },
      { path: "/unidades", element: so(ADMIN, <UnidadesPage />) },
    ],
  },
  ...rotasDev,
  { path: "*", element: <Navigate to="/" replace /> },
]
