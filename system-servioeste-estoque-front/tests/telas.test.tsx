import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { db } from "@/mocks/db"

import { renderizar, usarServidor } from "./renderizar"

usarServidor()

const contagemAberta = () => db.contagens.find((c) => c.situacao === "aberta")!

describe("painel", () => {
  it("mostra os indicadores e a divergência de Queimados", async () => {
    renderizar("/")
    expect(await screen.findByText("Olá, Ana")).toBeInTheDocument()
    expect(screen.getByText("Divergências da última contagem")).toBeInTheDocument()
    expect(await screen.findAllByText(/Máscara PFF2/)).not.toHaveLength(0)
  })
})

describe("papéis e unidades (princípio X)", () => {
  it("contador só vê as abas do estoque e a sua unidade", async () => {
    renderizar("/", "p-carlos")
    const nav = await screen.findByRole("navigation", { name: "Principal" })
    await waitFor(() => expect(within(nav).getByText("Contagens")).toBeInTheDocument())
    expect(within(nav).queryByText("Cotações")).not.toBeInTheDocument()
    expect((await screen.findAllByText("Queimados")).length).toBeGreaterThan(0)
    expect(screen.queryByText("Resende")).not.toBeInTheDocument()
  })
  it("contador que abre uma cotação pela URL vê 'Sem acesso'", async () => {
    renderizar("/cotacoes", "p-carlos")
    expect(await screen.findByText("Sem acesso")).toBeInTheDocument()
  })
})

describe("contagem (princípio VIII)", () => {
  it("zero conta, vazio volta a não contado", async () => {
    const c = contagemAberta()
    const contadosAntes = c.itens.filter((i) => i.quantidade !== null).length
    renderizar(`/contagens/${c.id}`)
    const campo = await screen.findByLabelText("Quantidade de Copo descartável 200 mL")
    const u = userEvent.setup()
    await u.clear(campo)
    await u.type(campo, "0")
    const total = c.itens.length
    const eraContado = c.itens.find((i) => i.produto_id === "pr-cop-001")!.quantidade !== null
    const esperado = eraContado ? contadosAntes : contadosAntes + 1
    expect(screen.getByText(`${esperado}/${total} · ${Math.round((esperado / total) * 100)}%`)).toBeInTheDocument()
    await u.clear(campo)
    expect(campo).toHaveValue("")
    expect(screen.getByText(`${esperado - 1}/${total} · ${Math.round(((esperado - 1) / total) * 100)}%`)).toBeInTheDocument()
  })

  it("envia a fila e finalizar com itens vazios pede confirmação sem virar zero", async () => {
    const c = contagemAberta()
    renderizar(`/contagens/${c.id}`)
    const u = userEvent.setup()
    await u.click(await screen.findByRole("button", { name: /Finalizar contagem/ }))
    expect(await screen.findByText("Finalizar com itens sem contagem?")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Finalizar assim mesmo" }))
    expect(await screen.findByText(/Nenhuma divergência|Divergências para conferir/)).toBeInTheDocument()
    const salvo = db.contagens.find((x) => x.id === c.id)!
    expect(salvo.situacao).toBe("finalizada")
    expect(salvo.itens.some((i) => i.quantidade === null)).toBe(true)
  })
})

describe("cotação", () => {
  it("aprovador não vê o botão de enviar e vê o de aprovar", async () => {
    renderizar("/cotacoes/co-3", "p-roberto")
    expect(await screen.findByRole("button", { name: /Aprovar/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Marcar como recebida/ })).not.toBeInTheDocument()
  })
})
