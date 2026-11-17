// Documentos do projeto lidos direto dos arquivos (só na área do dev; este módulo nunca entra no build, porque só é
// importado pela rota /dev, que não existe fora do modo de desenvolvimento). Caminhos a partir da raiz do projeto.
const arquivos = import.meta.glob(
  ["../../../docs/**/*.md", "../../../specs/**/*.md", "../../../.specify/memory/constitution.md", "../../../README.md"],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>

export interface Documento {
  caminho: string
  grupo: string
  titulo: string
  conteudo: string
}

const GRUPOS: [RegExp, string][] = [
  [/^docs\/documentacao\/usuario\//, "Manual (cliente)"],
  [/^docs\/documentacao\/tecnico\//, "Técnico (dev)"],
  [/^docs\//, "Planejamento"],
  [/^specs\//, "Specs"],
  [/^\.specify\//, "Constituição"],
]

export function montarDocumento(caminho: string, conteudo: string): Documento {
  const grupo = GRUPOS.find(([re]) => re.test(caminho))?.[1] ?? "Projeto"
  const titulo = conteudo.split("\n").find((l) => l.startsWith("# "))?.slice(2).trim() ?? caminho.split("/").pop()!
  return { caminho, grupo, titulo, conteudo }
}

/** Ordem dos grupos na tela: primeiro o que o cliente lê, depois o técnico, o planejamento e o processo. */
export const ORDEM_GRUPOS = [...GRUPOS.map(([, g]) => g), "Projeto"]

export const documentos: Documento[] = Object.entries(arquivos)
  .map(([chave, conteudo]) => montarDocumento(chave.replace(/^(\.\.\/)+/, ""), conteudo))
  .sort((a, b) => ORDEM_GRUPOS.indexOf(a.grupo) - ORDEM_GRUPOS.indexOf(b.grupo) || a.caminho.localeCompare(b.caminho))

export const documento = (caminho: string) => documentos.find((d) => d.caminho === caminho)
