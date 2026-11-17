/** Lê o docs/backlog.md: etapas (`## Etapa ...`) com itens `- [x]` / `- [ ]`. */

export interface Item {
  texto: string
  feito: boolean
}

export interface Etapa {
  nome: string
  proposta: boolean
  itens: Item[]
}

const ETAPA = /^## (.+)$/
const ITEM = /^- \[( |x|X)\] (.+)$/

export function lerBacklog(markdown: string): Etapa[] {
  const etapas: Etapa[] = []
  let atual: Etapa | null = null
  for (const linha of markdown.split("\n")) {
    const e = ETAPA.exec(linha)
    if (e) {
      atual = { nome: e[1].replace(/\s*\(Proposta\)\s*$/, ""), proposta: /\(Proposta\)/.test(e[1]), itens: [] }
      etapas.push(atual)
      continue
    }
    const i = ITEM.exec(linha)
    if (i && atual) atual.itens.push({ texto: i[2].trim(), feito: i[1] !== " " })
    else if (atual && /^\s{2,}\S/.test(linha) && atual.itens.length) atual.itens[atual.itens.length - 1].texto += ` ${linha.trim()}`
  }
  return etapas.filter((e) => e.itens.length)
}

export const contar = (itens: Item[]) => ({ feitos: itens.filter((i) => i.feito).length, total: itens.length })
export const pct = (feitos: number, total: number) => (total ? Math.round((feitos / total) * 100) : 0)
