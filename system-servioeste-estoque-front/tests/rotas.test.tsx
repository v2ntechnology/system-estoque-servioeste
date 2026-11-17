import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { db } from "@/mocks/db"

import { renderizar, usarServidor } from "./renderizar"

usarServidor()

// Abre cada tela como administradora e confere que carregou sem erro.
const ROTAS = [
  "/", "/contagens", "/catalogo", "/catalogo/pr-lim-001", "/movimentacoes", "/cotacoes", "/cotacoes/nova",
  "/cotacoes/co-1", "/cotacoes/co-2/pdf", "/fornecedores", "/relatorios", "/importacao", "/unidades",
]

describe("todas as telas abrem", () => {
  it.each(ROTAS)("%s", async (rota) => {
    renderizar(rota)
    await waitFor(() => expect(screen.queryByText("Carregando…")).not.toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByText("Não foi possível carregar")).not.toBeInTheDocument()
    expect(document.body.textContent?.length).toBeGreaterThan(50)
  })

  it("contagem finalizada abre só leitura", async () => {
    const c = db.contagens.find((x) => x.situacao === "finalizada")!
    renderizar(`/contagens/${c.id}`)
    expect(await screen.findByRole("tab", { name: /Não contados/ })).toBeInTheDocument()
  })
})
