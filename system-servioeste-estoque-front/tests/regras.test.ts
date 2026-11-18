import { describe, expect, it } from "vitest"

import { aplicarFila, juntar, minutosAte } from "@/features/contagens/fila"
import { lerQuantidade, numero } from "@/lib/format"
import { calcularDivergencias, consumoMedioMensal, progresso, sugerirCompra } from "@/mocks/regras"

const item = (produto_id: string, quantidade: number | null) => ({ produto_id, quantidade, observacao: "", foto: null })

describe("não contado não é zero (princípio VIII)", () => {
  it("campo vazio vira null e zero digitado vira 0", () => {
    expect(lerQuantidade("")).toBeNull()
    expect(lerQuantidade("  ")).toBeNull()
    expect(lerQuantidade("0")).toBe(0)
    expect(lerQuantidade("1,5")).toBe(1.5)
    expect(lerQuantidade("dez")).toBeUndefined()
    expect(lerQuantidade("-3")).toBeUndefined()
  })
  it("null aparece como traço, nunca como 0", () => {
    expect(numero(null)).toBe("—")
    expect(numero(0)).toBe("0")
  })
  it("progresso conta o zero e ignora o vazio", () => {
    expect(progresso([item("a", 0), item("b", null), item("c", 4)])).toEqual({ contados: 2, total: 3 })
  })
})

describe("divergência", () => {
  const anterior = new Map<string, number | null>([["a", 40], ["b", 40], ["c", 40], ["d", null]])
  const movs = [{ produto_id: "b", tipo: "saida" as const, quantidade: 30 }, { produto_id: "c", tipo: "entrada" as const, quantidade: 10 }]

  it("aponta queda sem saída registrada", () => {
    const d = calcularDivergencias([item("a", 10)], anterior, movs)
    expect(d).toEqual([{ produto_id: "a", anterior: 40, entradas: 0, saidas: 0, esperado: 40, contado: 10 }])
  })
  it("desconta saídas e soma entradas", () => {
    expect(calcularDivergencias([item("b", 10), item("c", 49)], anterior, movs)).toEqual([])
  })
  it("ignora item não contado e item sem contagem anterior", () => {
    expect(calcularDivergencias([item("a", null), item("d", 0), item("novo", 0)], anterior, movs)).toEqual([])
  })
  it("tolera diferença pequena (até 10% ou menos de 2 unidades)", () => {
    expect(calcularDivergencias([item("a", 37)], anterior, [])).toEqual([])
    expect(calcularDivergencias([item("a", 35)], anterior, [])).toHaveLength(1)
  })
})

describe("sugestão de compra", () => {
  it("cobre o mínimo mais um mês de consumo, na embalagem", () => {
    expect(sugerirCompra(10, 40, 30, null)).toBe(60)
    expect(sugerirCompra(10, 40, 30, 8)).toBe(64)
    expect(sugerirCompra(100, 40, 30, null)).toBe(0)
    expect(sugerirCompra(null, 4, 2, null)).toBe(6)
  })
  it("consumo mensal das saídas dos últimos 90 dias", () => {
    const hoje = new Date("2026-11-17T12:00:00Z")
    const saidas = [{ quantidade: 90, data: "2026-10-01T12:00:00Z" }, { quantidade: 1000, data: "2026-01-01T12:00:00Z" }]
    expect(consumoMedioMensal(saidas, hoje)).toBe(30)
  })
})

describe("fila da contagem no aparelho", () => {
  it("guarda o último valor de cada campo por produto", () => {
    let fila = juntar([], { produto_id: "a", quantidade: 5 })
    fila = juntar(fila, { produto_id: "a", observacao: "amassado" })
    fila = juntar(fila, { produto_id: "a", quantidade: null })
    expect(fila).toEqual([{ produto_id: "a", quantidade: null, observacao: "amassado" }])
  })
  it("aplica a fila por cima do que veio do servidor", () => {
    const itens = aplicarFila([item("a", 3), item("b", null)], [{ produto_id: "b", quantidade: 0 }])
    expect(itens.map((i) => i.quantidade)).toEqual([3, 0])
  })
  it("calcula os minutos até o encerramento", () => {
    const agora = new Date("2026-11-17T19:55:00Z") // 16:55 em Brasília
    expect(minutosAte("17:00", agora)).toBe(5)
    expect(minutosAte("16:30", agora)).toBe(-25)
  })
})

describe("situação do estoque no catálogo (spec 002)", async () => {
  const { situacao, nivel } = await import("@/features/catalogo/util")
  it("abaixo do mínimo é crítica, até 1,5× é atenção, acima é boa", () => {
    expect(situacao(5, 10)).toBe("critica")
    expect(situacao(10, 10)).toBe("atencao")
    expect(situacao(15, 10)).toBe("boa")
  })
  it("sem contagem não tem situação nem medidor aceso", () => {
    expect(situacao(null, 10)).toBe("nao_contado")
    expect(nivel(null, 10)).toBe(0)
  })
})
