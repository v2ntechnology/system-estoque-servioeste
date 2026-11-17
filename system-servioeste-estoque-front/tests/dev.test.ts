import { describe, expect, it } from "vitest"

import { contar, lerBacklog } from "@/dev/backlog"
import { categoria, semPrefixo } from "@/dev/commits"
import { montarDocumento } from "@/dev/documentos"
import { blocos } from "@/dev/Markdown"

describe("backlog", () => {
  const md = `# Backlog

## Etapa 0 — Base

- [x] Feito
- [ ] A fazer, com texto
  que continua na linha de baixo

## Etapa 1 — Futuro (Proposta)

- [X] Outro feito
`
  it("lê etapas, itens e propostas", () => {
    const etapas = lerBacklog(md)
    expect(etapas.map((e) => e.nome)).toEqual(["Etapa 0 — Base", "Etapa 1 — Futuro"])
    expect(etapas[1].proposta).toBe(true)
    expect(etapas[0].itens[1].texto).toBe("A fazer, com texto que continua na linha de baixo")
    expect(contar(etapas.flatMap((e) => e.itens))).toEqual({ feitos: 2, total: 3 })
  })
})

describe("commits", () => {
  it("classifica pelo prefixo", () => {
    expect(categoria("feat: cria a área do dev")).toBe("nova")
    expect(categoria("fix(api): corrige o parar")).toBe("atualizado")
    expect(categoria("docs: atualiza o manual")).toBe("documentacao")
    expect(categoria("Primeira versão")).toBe("manutencao")
    expect(semPrefixo("refactor!: divide o projeto")).toBe("divide o projeto")
  })
})

describe("documentos", () => {
  it("agrupa pelo caminho e usa o primeiro título", () => {
    const d = montarDocumento("docs/documentacao/usuario/01-visao-geral.md", "texto\n# 1. Visão geral\n")
    expect(d.grupo).toBe("Manual (cliente)")
    expect(d.titulo).toBe("1. Visão geral")
  })
})

describe("markdown", () => {
  it("separa títulos, listas, tabelas e código", () => {
    const b = blocos("# T\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n```\ncódigo\n```\n\nparágrafo")
    expect(b.map((x) => x.tipo)).toEqual(["titulo", "lista", "tabela", "codigo", "paragrafo"])
  })
})
