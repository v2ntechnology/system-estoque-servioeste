// Monta o app inteiro num roteador em memória, com os mesmos handlers do MSW da demonstração.
import { render } from "@testing-library/react"
import { setupServer } from "msw/node"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest"

import { mudarDemo, restaurar } from "@/mocks/db"
import { handlers } from "@/mocks/handlers"
import { Providers } from "@/Providers"
import { rotas } from "@/rotas"

export const servidor = setupServer(...handlers)

export function usarServidor() {
  beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }))
  beforeEach(() => {
    localStorage.clear()
    restaurar()
  })
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())
}

/** Pessoa de exemplo: p-ana (administradora), p-carlos (contador), p-mariana (compradora), p-roberto (aprovador). */
export function renderizar(caminho: string, pessoa = "p-ana") {
  mudarDemo({ pessoa, semConexao: false, fimExpediente: false })
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] })
  return render(<Providers><RouterProvider router={router} /></Providers>)
}
