/** Lê as specs do Spec Kit (specs/NNN-nome/) a partir dos documentos: etapa do fluxo e tarefas por fase do tasks.md. */
import type { Documento } from "./documentos"

export interface Tarefa {
  id: string
  texto: string
  feita: boolean
}

export interface Fase {
  nome: string
  tarefas: Tarefa[]
}

export interface Spec {
  pasta: string
  titulo: string
  situacao: string | null
  etapas: { especificacao: boolean; plano: boolean; tarefas: boolean; analise: boolean; validacao: boolean }
  fases: Fase[]
}

const TAREFA = /^- \[( |x|X)\] (T\d+)\s+(.+)$/

export function lerTarefas(markdown: string): Fase[] {
  const fases: Fase[] = []
  let atual: Fase | null = null
  for (const linha of markdown.split("\n")) {
    const f = /^## (.+)$/.exec(linha)
    if (f) {
      atual = { nome: f[1].trim(), tarefas: [] }
      fases.push(atual)
      continue
    }
    const t = TAREFA.exec(linha)
    if (t && atual) atual.tarefas.push({ id: t[2], texto: t[3].replace(/\[(P|US\d+)\]\s*/g, "").trim(), feita: t[1] !== " " })
  }
  return fases.filter((x) => x.tarefas.length)
}

export function montarSpecs(documentos: Documento[]): Spec[] {
  const pastas = [...new Set(documentos.map((d) => /^specs\/(\d{3}-[^/]+)\//.exec(d.caminho)?.[1]).filter(Boolean))] as string[]
  return pastas.sort().map((pasta) => {
    const doc = (nome: string) => documentos.find((d) => d.caminho === `specs/${pasta}/${nome}`)
    const spec = doc("spec.md")
    const tasks = doc("tasks.md")
    return {
      pasta,
      titulo: spec?.titulo.replace(/^Especificação:\s*/, "") ?? pasta,
      situacao: /\*\*Situação\*\*:\s*(.+)/.exec(spec?.conteudo ?? "")?.[1]?.trim() ?? null,
      etapas: {
        especificacao: !!spec, plano: !!doc("plan.md"), tarefas: !!tasks,
        analise: !!tasks && /analyze|análise/i.test(tasks.conteudo), validacao: !!doc("quickstart.md"),
      },
      fases: tasks ? lerTarefas(tasks.conteudo) : [],
    }
  })
}
