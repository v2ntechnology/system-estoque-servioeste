import { CheckCircle2, Circle, FileText, GitBranch, GitCommitHorizontal, History, LayoutDashboard, ListChecks, ScrollText } from "lucide-react"
import { useState } from "react"

import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Tabs } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { contar, lerBacklog } from "./backlog"
import { categoria, NOME_CATEGORIA, semPrefixo, useCommits, type Categoria, type Commit } from "./commits"
import { Barra, DevShell } from "./DevShell"
import { documento, documentos } from "./documentos"
import { Markdown, Texto } from "./Markdown"
import { montarSpecs } from "./specs"

const etapasDoBacklog = () => lerBacklog(documento("docs/backlog.md")?.conteudo ?? "")
const dia = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

// ---------------------------------------------------------------- Visão geral
export function VisaoGeralPage() {
  const etapas = etapasDoBacklog()
  const total = contar(etapas.flatMap((e) => e.itens))
  const proxima = etapas.flatMap((e) => e.itens.filter((i) => !i.feito).map((i) => ({ ...i, etapa: e.nome }))).slice(0, 5)
  const { data: commits = [] } = useCommits()

  return (
    <DevShell>
      <Cabecalho icone={LayoutDashboard} titulo="Visão geral"
        descricao="Andamento do projeto lido de docs/backlog.md e do git. Só existe no modo de desenvolvimento." />
      <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border bg-background p-5">
          <h2 className="text-sm font-medium">Andamento geral</h2>
          <Barra feitos={total.feitos} total={total.total} />
          <ul className="space-y-3">
            {etapas.map((e) => {
              const c = contar(e.itens)
              return (
                <li key={e.nome} className="space-y-1">
                  <p className="flex items-center gap-2 text-sm">{e.nome}{e.proposta && <Badge>Proposta</Badge>}</p>
                  <Barra feitos={c.feitos} total={c.total} />
                </li>
              )
            })}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-3 text-sm font-medium">Próximos itens</h2>
            {proxima.length === 0 ? <p className="text-sm text-muted-foreground">Tudo feito no backlog.</p> : (
              <ul className="space-y-2 text-sm">
                {proxima.map((i) => (
                  <li key={i.texto} className="flex gap-2"><Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span><Texto texto={i.texto} /><span className="block text-xs text-muted-foreground">{i.etapa}</span></span></li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-3 text-sm font-medium">Últimos commits</h2>
            <ul className="space-y-2 text-sm">
              {commits.slice(0, 6).map((c) => (
                <li key={c.hash} className="flex items-start gap-2">
                  <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span className="min-w-0">{semPrefixo(c.mensagem)}
                    <span className="block text-xs text-muted-foreground">{dia.format(new Date(c.data))} · {c.autor} · <code>{c.curto}</code></span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </DevShell>
  )
}

// ---------------------------------------------------------------- Backlog
export function BacklogPage() {
  const etapas = etapasDoBacklog()
  return (
    <DevShell>
      <Cabecalho icone={ListChecks} titulo="Backlog"
        descricao="Quadro de cada etapa de docs/backlog.md. Para mudar, edite o arquivo (ou use /encerrar-dia)." />
      <div className="space-y-6 p-5 sm:p-6">
        {etapas.map((e) => {
          const c = contar(e.itens)
          return (
            <section key={e.nome} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-medium">{e.nome}</h2>
                {e.proposta && <Badge>Proposta</Badge>}
                <Barra feitos={c.feitos} total={c.total} className="min-w-48 flex-1" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {([["A fazer", false], ["Feito", true]] as const).map(([rotulo, feito]) => {
                  const itens = e.itens.filter((i) => i.feito === feito)
                  return (
                    <div key={rotulo} className="rounded-2xl border bg-background p-3">
                      <p className="mb-2 px-1 text-xs uppercase tracking-wide text-muted-foreground">{rotulo} · {itens.length}</p>
                      <ul className="space-y-1.5">
                        {itens.map((i) => (
                          <li key={i.texto} className={cn("flex gap-2 rounded-xl border p-2.5 text-sm", feito && "text-muted-foreground")}>
                            {feito ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                            <span><Texto texto={i.texto} /></span>
                          </li>
                        ))}
                        {itens.length === 0 && <li className="px-1 text-sm text-muted-foreground">—</li>}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </DevShell>
  )
}

// ---------------------------------------------------------------- Histórico
const STATUS_ARQUIVO: Record<string, { nome: string; cor: string }> = {
  A: { nome: "Adicionado", cor: "text-brand" },
  M: { nome: "Modificado", cor: "text-muted-foreground" },
  D: { nome: "Apagado", cor: "text-destructive" },
  R: { nome: "Renomeado", cor: "text-muted-foreground" },
}

function CartaoCommit({ c }: { c: Commit }) {
  const cat = categoria(c.mensagem)
  return (
    <li className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={cat === "nova" ? "brand" : "outline"}>{NOME_CATEGORIA[cat]}</Badge>
        <span className="font-medium">{semPrefixo(c.mensagem)}</span>
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">{hora.format(new Date(c.data))} · {c.autor} · <code>{c.curto}</code></p>
      {c.arquivos.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{c.arquivos.length} arquivo(s)</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {c.arquivos.map((a, i) => {
              const s = STATUS_ARQUIVO[a.status] ?? { nome: a.status, cor: "" }
              return <li key={i} className={cn("break-all", s.cor)}><span className="font-medium">{s.nome}:</span> {a.anterior ? `${a.anterior} → ${a.caminho}` : a.caminho}</li>
            })}
          </ul>
        </details>
      )}
    </li>
  )
}

export function HistoricoPage() {
  const { data = [], isLoading, error, refetch } = useCommits()
  const [filtro, setFiltro] = useState<"todos" | Categoria>("todos")
  const lista = data.filter((c) => filtro === "todos" || categoria(c.mensagem) === filtro)
  const porDia = new Map<string, Commit[]>()
  for (const c of lista) {
    const d = dia.format(new Date(c.data))
    porDia.set(d, [...(porDia.get(d) ?? []), c])
  }
  const n = (f: Categoria) => data.filter((c) => categoria(c.mensagem) === f).length

  return (
    <DevShell>
      <Cabecalho icone={History} titulo="Histórico"
        descricao="Lido do git: feat = nova funcionalidade; fix, refactor, perf e style = atualização; docs = documentação; o resto = manutenção." />
      <div className="space-y-5 p-5 sm:p-6">
        <Tabs value={filtro} onChange={setFiltro} abas={[
          { value: "todos", label: "Todos", count: data.length },
          ...(Object.keys(NOME_CATEGORIA) as Categoria[]).map((k) => ({ value: k, label: NOME_CATEGORIA[k], count: n(k) })),
        ]} />
        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : lista.length === 0 ? <Vazio icone={History} titulo="Nada neste filtro" />
          : [...porDia.entries()].map(([d, commits]) => (
            <section key={d} aria-label={d} className="space-y-2">
              <h2 className="text-sm font-medium capitalize text-muted-foreground">{d}</h2>
              <ul className="space-y-2">{commits.map((c) => <CartaoCommit key={c.hash} c={c} />)}</ul>
            </section>
          ))}
      </div>
    </DevShell>
  )
}

// ---------------------------------------------------------------- Changelog
export function ChangelogPage() {
  const doc = documento("docs/changelog.md")
  return (
    <DevShell>
      <Cabecalho icone={ScrollText} titulo="Changelog" descricao="docs/changelog.md, atualizado a cada encerramento do dia." />
      <div className="mx-auto max-w-4xl p-5 sm:p-6">
        {doc ? <Markdown texto={doc.conteudo.replace(/^# .+\n/, "")} /> : <Vazio icone={ScrollText} titulo="Sem changelog" />}
      </div>
    </DevShell>
  )
}

// ---------------------------------------------------------------- Documentos
export function DocumentosPage() {
  const [atual, setAtual] = useState(documentos[0]?.caminho ?? "")
  const doc = documento(atual)
  const grupos = [...new Set(documentos.map((d) => d.grupo))]
  return (
    <DevShell>
      <Cabecalho icone={FileText} titulo="Documentos" descricao="docs/, specs/, constituição e README, lidos dos arquivos." />
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Documentos" className="space-y-4">
          {grupos.map((g) => (
            <div key={g}>
              <p className="mb-1 px-2 text-xs uppercase tracking-wide text-muted-foreground">{g}</p>
              <ul>
                {documentos.filter((d) => d.grupo === g).map((d) => (
                  <li key={d.caminho}>
                    <button type="button" onClick={() => setAtual(d.caminho)} title={d.caminho}
                      className={cn("w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
                        d.caminho === atual && "bg-brand/10 font-medium text-brand")}>
                      {d.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <article className="min-w-0 rounded-2xl border bg-background p-5 sm:p-6">
          {doc ? <><p className="mb-4 font-mono text-xs text-muted-foreground">{doc.caminho}</p><Markdown texto={doc.conteudo} /></>
            : <Vazio icone={FileText} titulo="Nenhum documento" />}
        </article>
      </div>
    </DevShell>
  )
}

// ---------------------------------------------------------------- Implementação (specs do Spec Kit)
const ETAPAS = [
  ["especificacao", "Especificação"], ["plano", "Plano"], ["tarefas", "Tarefas"], ["validacao", "Roteiro de validação"],
] as const

export function ImplementacaoPage() {
  const specs = montarSpecs(documentos)
  return (
    <DevShell>
      <Cabecalho icone={GitBranch} titulo="Implementação"
        descricao="Cada spec de specs/: etapa no Spec Kit e tarefas do tasks.md por fase. Marcar [X] no tasks.md move a tarefa para feita." />
      <div className="space-y-6 p-5 sm:p-6">
        {specs.length === 0 && <Vazio icone={GitBranch} titulo="Nenhuma spec ainda" descricao="Comece com /speckit-specify." />}
        {specs.map((s) => {
          const todas = s.fases.flatMap((f) => f.tarefas)
          const feitas = todas.filter((t) => t.feita).length
          return (
            <section key={s.pasta} className="space-y-4 rounded-2xl border bg-background p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-medium">{s.pasta.slice(0, 3)} · {s.titulo}</h2>
                {s.situacao && <Badge variant="brand">{s.situacao}</Badge>}
                <Barra feitos={feitas} total={todas.length} className="min-w-48 flex-1" />
              </div>
              <ol className="flex flex-wrap gap-2 text-xs">
                {ETAPAS.map(([k, nome]) => (
                  <li key={k} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1", s.etapas[k] ? "border-brand/40 text-brand" : "text-muted-foreground")}>
                    {s.etapas[k] ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />} {nome}
                  </li>
                ))}
              </ol>
              <div className="grid gap-3 lg:grid-cols-2">
                {s.fases.map((f) => {
                  const c = f.tarefas.filter((t) => t.feita).length
                  return (
                    <div key={f.nome} className="rounded-xl border p-3">
                      <p className="mb-1 text-sm font-medium">{f.nome}</p>
                      <Barra feitos={c} total={f.tarefas.length} className="mb-2" />
                      <ul className="space-y-1">
                        {f.tarefas.map((t) => (
                          <li key={t.id} className={cn("flex gap-2 text-sm", t.feita && "text-muted-foreground")}>
                            {t.feita ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                            <span><code className="text-xs">{t.id}</code> <Texto texto={t.texto} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </DevShell>
  )
}
