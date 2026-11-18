import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { db, mudarDemo } from "@/mocks/db"

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
    const barra = () => screen.getByRole("progressbar", { name: "Itens contados" })
    expect(barra()).toHaveAttribute("aria-valuenow", String(esperado))
    expect(barra()).toHaveAttribute("aria-valuemax", String(total))
    await u.clear(campo)
    expect(campo).toHaveValue("")
    expect(barra()).toHaveAttribute("aria-valuenow", String(esperado - 1))
  })

  it("+ soma 1 a partir do vazio e − nunca transforma vazio em zero", async () => {
    const c = contagemAberta()
    renderizar(`/contagens/${c.id}`)
    const u = userEvent.setup()
    const campo = await screen.findByLabelText("Quantidade de Copo descartável 200 mL")
    await u.clear(campo)
    expect(screen.getByRole("button", { name: "Menos 1 de Copo descartável 200 mL" })).toBeDisabled()
    await u.click(screen.getByRole("button", { name: "Mais 1 de Copo descartável 200 mL" }))
    expect(campo).toHaveValue("1")
    await u.click(screen.getByRole("button", { name: "Menos 1 de Copo descartável 200 mL" }))
    expect(campo).toHaveValue("0")
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

describe("lista de cotações com resumo ao lado (spec 002)", () => {
  it("clicar numa cotação abre o resumo com itens, total e ações", async () => {
    renderizar("/cotacoes", "p-roberto")
    const u = userEvent.setup()
    await u.click(await screen.findByRole("button", { name: /EPI — Queimados/ }))
    const painel = await screen.findByLabelText("Resumo da cotação")
    expect(await within(painel).findByText("Cotação #0003")).toBeInTheDocument()
    expect(within(painel).getByRole("button", { name: /Aprovar/ })).toBeInTheDocument()
    await u.click(within(painel).getByRole("button", { name: "Fechar resumo" }))
    expect(screen.queryByLabelText("Resumo da cotação")).not.toBeInTheDocument()
  })
})

describe("contagens com resumo ao lado (spec 002)", () => {
  it("mostra os indicadores e abre o resumo da contagem com divergências", async () => {
    renderizar("/contagens")
    expect(await screen.findByText("Acurácia do estoque")).toBeInTheDocument()
    const u = userEvent.setup()
    await u.click(await screen.findByRole("tab", { name: /Com divergência/ }))
    const [linha] = await screen.findAllByRole("button", { pressed: false, name: /Queimados/ })
    await u.click(linha)
    const painel = await screen.findByLabelText("Resumo da contagem")
    expect((await within(painel).findAllByText(/Máscara PFF2|Álcool 70%/)).length).toBeGreaterThan(0)
  })
})

describe("gráfico dos indicadores (spec 003)", () => {
  it("clicar em Saídas abre o histórico, com tabela, escala por mês e divisão por categoria", async () => {
    renderizar("/relatorios")
    const u = userEvent.setup()
    await u.click(await screen.findByRole("button", { name: "Saídas: ver gráfico" }))
    const janela = await screen.findByRole("dialog")
    expect(await within(janela).findByRole("img", { name: /Saídas: gráfico de área/ })).toBeInTheDocument()
    expect(within(janela).getByText(/Por categoria/)).toBeInTheDocument()
    await u.click(within(janela).getByRole("radio", { name: "Colunas" }))
    expect(within(janela).getByRole("img", { name: /gráfico de colunas/ })).toBeInTheDocument()
    await u.click(within(janela).getByRole("radio", { name: "Tabela" }))
    expect(within(janela).getByRole("columnheader", { name: "Saídas" })).toBeInTheDocument()
    await u.click(within(janela).getByRole("tab", { name: "Por mês" }))
    expect((await within(janela).findAllByText(/6 meses até/)).length).toBeGreaterThan(0)
    await waitFor(() => expect(within(janela).getAllByRole("row").length).toBe(7)) // cabeçalho + 6 meses
    expect(within(janela).queryByText(/Invalid Date/)).not.toBeInTheDocument()
  })
})

describe("foto do item da contagem (spec 005)", () => {
  const foto = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], "prateleira.jpg", { type: "image/jpeg" })

  it("envia a foto, mostra a miniatura e guarda o id no item sem contar a quantidade", async () => {
    const c = contagemAberta()
    renderizar(`/contagens/${c.id}`)
    const u = userEvent.setup()
    const entrada = await screen.findByLabelText("Foto de Copo descartável 200 mL")
    await u.upload(entrada, foto())
    expect(await screen.findByRole("img", { name: "Foto de Copo descartável 200 mL" })).toBeInTheDocument()
    await waitFor(() => expect(db.contagens.find((x) => x.id === c.id)!.itens.find((i) => i.produto_id === "pr-cop-001")!.foto).toMatch(/^arq-/))
    const item = db.contagens.find((x) => x.id === c.id)!.itens.find((i) => i.produto_id === "pr-cop-001")!
    expect(item.quantidade).toBe(c.itens.find((i) => i.produto_id === "pr-cop-001")!.quantidade)
  })

  it("sem conexão avisa que a foto não foi enviada", async () => {
    const c = contagemAberta()
    renderizar(`/contagens/${c.id}`)
    const u = userEvent.setup()
    const entrada = await screen.findByLabelText("Foto de Copo descartável 200 mL")
    mudarDemo({ semConexao: true })
    await u.upload(entrada, foto())
    expect(await screen.findByText(/a foto não foi enviada/)).toBeInTheDocument()
    mudarDemo({ semConexao: false })
  })
})
