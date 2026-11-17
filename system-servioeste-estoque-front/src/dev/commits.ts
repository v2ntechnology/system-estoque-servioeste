import { useQuery } from "@tanstack/react-query"

/** Commits do repositório (servidos pelo plugin dev-tools/plugin.ts em /__dev/commits). */

export interface Arquivo {
  status: string // A, M, D, R...
  caminho: string
  anterior: string | null
}

export interface Commit {
  hash: string
  curto: string
  data: string
  autor: string
  mensagem: string
  arquivos: Arquivo[]
}

export type Categoria = "nova" | "atualizado" | "documentacao" | "manutencao"

export const NOME_CATEGORIA: Record<Categoria, string> = {
  nova: "Nova funcionalidade",
  atualizado: "Atualização",
  documentacao: "Documentação",
  manutencao: "Manutenção",
}

const POR_TIPO: Record<string, Categoria> = {
  feat: "nova", fix: "atualizado", refactor: "atualizado", perf: "atualizado", style: "atualizado",
  docs: "documentacao", chore: "manutencao", build: "manutencao", ci: "manutencao", test: "manutencao",
}

/** Prefixo dos commits (`feat: ...`) → categoria; sem prefixo conhecido = manutenção. */
export function categoria(mensagem: string): Categoria {
  const tipo = /^(\w+)(\([^)]*\))?!?:/.exec(mensagem)?.[1]?.toLowerCase()
  return (tipo && POR_TIPO[tipo]) || "manutencao"
}

export const semPrefixo = (m: string) => m.replace(/^\w+(\([^)]*\))?!?:\s*/, "")

export function useCommits() {
  return useQuery({
    queryKey: ["dev", "commits"],
    queryFn: async (): Promise<Commit[]> => {
      const r = await fetch("/__dev/commits")
      if (!r.ok) throw new Error(`Não foi possível ler o git log (${r.status})`)
      return r.json()
    },
  })
}
