import { CheckSquare2, Square } from "lucide-react"
import type { ReactNode } from "react"

// Renderizador de markdown da área do dev: títulos, parágrafos, listas (com caixas de seleção), tabelas, blocos de
// código, **negrito**, *itálico*, `código` e links. Gera elementos React (nada de innerHTML); só para os arquivos do
// próprio projeto.

function inline(texto: string, chave = ""): ReactNode[] {
  const partes: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)/g
  let ultimo = 0
  let i = 0
  for (const m of texto.matchAll(re)) {
    if (m.index! > ultimo) partes.push(texto.slice(ultimo, m.index))
    const t = m[0]
    const k = `${chave}-${i++}`
    if (t.startsWith("**")) partes.push(<strong key={k} className="font-medium">{t.slice(2, -2)}</strong>)
    else if (t.startsWith("`")) partes.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{t.slice(1, -1)}</code>)
    else if (t.startsWith("[")) {
      const [, rotulo, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!
      partes.push(<a key={k} href={href} className="text-brand underline-offset-4 hover:underline">{rotulo}</a>)
    } else partes.push(<em key={k}>{t.slice(1, -1)}</em>)
    ultimo = m.index! + t.length
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

const celulas = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
const ehLista = (l: string) => /^\s*([-*]|\d+\.) /.test(l)

type Bloco =
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "codigo"; texto: string }
  | { tipo: "tabela"; linhas: string[] }
  | { tipo: "lista"; ordenada: boolean; itens: string[] }
  | { tipo: "paragrafo"; texto: string }

// eslint-disable-next-line react-refresh/only-export-components
export function blocos(md: string): Bloco[] {
  const linhas = md.replace(/<!--[\s\S]*?-->/g, "").split("\n")
  const saida: Bloco[] = []
  let i = 0
  while (i < linhas.length) {
    const l = linhas[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith("```")) {
      const corpo: string[] = []
      i++
      while (i < linhas.length && !linhas[i].startsWith("```")) corpo.push(linhas[i++])
      i++
      saida.push({ tipo: "codigo", texto: corpo.join("\n") })
    } else if (/^#{1,4} /.test(l)) {
      const [, h, t] = /^(#{1,4}) (.+)$/.exec(l)!
      saida.push({ tipo: "titulo", nivel: h.length, texto: t })
      i++
    } else if (l.trim().startsWith("|")) {
      const tab: string[] = []
      while (i < linhas.length && linhas[i].trim().startsWith("|")) tab.push(linhas[i++])
      saida.push({ tipo: "tabela", linhas: tab })
    } else if (ehLista(l)) {
      const itens: string[] = []
      const ordenada = /^\s*\d+\. /.test(l)
      while (i < linhas.length && (ehLista(linhas[i]) || (/^\s{2,}\S/.test(linhas[i]) && itens.length))) {
        if (ehLista(linhas[i])) itens.push(linhas[i].replace(/^\s*([-*]|\d+\.) /, ""))
        else itens[itens.length - 1] += ` ${linhas[i].trim()}`
        i++
      }
      saida.push({ tipo: "lista", ordenada, itens })
    } else {
      const par: string[] = []
      while (i < linhas.length && linhas[i].trim() && !/^(#{1,4} |```|\|)/.test(linhas[i]) && !ehLista(linhas[i])) par.push(linhas[i++].trim())
      saida.push({ tipo: "paragrafo", texto: par.join(" ") })
    }
  }
  return saida
}

const TITULO = ["", "text-2xl font-medium tracking-tight", "mt-6 text-lg font-medium", "mt-4 font-medium", "mt-3 text-sm font-medium"]

export function Markdown({ texto }: { texto: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocos(texto).map((b, i) => {
        if (b.tipo === "titulo") {
          const Tag = `h${b.nivel}` as "h1"
          return <Tag key={i} className={TITULO[b.nivel]}>{inline(b.texto)}</Tag>
        }
        if (b.tipo === "codigo") {
          return <pre key={i} className="overflow-x-auto rounded-xl border-l-2 border-brand bg-muted/60 p-3 font-mono text-xs">{b.texto}</pre>
        }
        if (b.tipo === "tabela") {
          const [cab, , ...corpo] = b.linhas
          return (
            <div key={i} className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">{celulas(cab).map((c, j) => <th key={j} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{inline(c)}</th>)}</tr></thead>
                <tbody>{corpo.map((l, j) => (
                  <tr key={j} className="border-b last:border-0">{celulas(l).map((c, k) => <td key={k} className="px-3 py-2 align-top">{inline(c, `${j}${k}`)}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )
        }
        if (b.tipo === "lista") {
          const Lista = b.ordenada ? "ol" : "ul"
          return (
            <Lista key={i} className={b.ordenada ? "list-decimal space-y-1 pl-5" : "space-y-1 pl-1"}>
              {b.itens.map((it, j) => {
                const caixa = /^\[( |x|X)\] /.exec(it)
                if (caixa) {
                  const feito = caixa[1] !== " "
                  return (
                    <li key={j} className="flex items-start gap-2">
                      {feito ? <CheckSquare2 className="mt-0.5 size-4 shrink-0 text-brand" /> : <Square className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                      <span className={feito ? "text-muted-foreground" : ""}>{inline(it.slice(4), String(j))}</span>
                    </li>
                  )
                }
                return b.ordenada ? <li key={j}>{inline(it, String(j))}</li> : (
                  <li key={j} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" /><span>{inline(it, String(j))}</span></li>
                )
              })}
            </Lista>
          )
        }
        return <p key={i}>{inline(b.texto)}</p>
      })}
    </div>
  )
}

/** Texto de uma linha com a formatação inline do markdown (`código`, **negrito**, links). */
export function Texto({ texto }: { texto: string }) {
  return <>{inline(texto)}</>
}
