import { AlertTriangle, CalendarClock, Check, ChevronRight, ClipboardList, MessageSquare, Play, Search, X } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Avatar } from "@/components/ui/avatar"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { MiniaturaFoto } from "@/components/ui/miniatura"
import { Barra } from "@/components/ui/barra"
import { Button } from "@/components/ui/button"
import { Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useMapaProdutos } from "@/features/catalogo/api"
import { useAbrirContagem, useContagem, useContagens } from "@/features/contagens/api"
import { useNomeUnidade, usePode, useUnidades } from "@/features/sessao/api"
import { dataBR, dataHora, diasAte, numero } from "@/lib/format"
import type { ContagemResumo, Unidade } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

type Filtro = "todas" | "aberta" | "finalizada" | "com_divergencia"

const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")

/**
 * Contagens (spec 002, referências de contagem cíclica): indicadores de andamento, um cartão por unidade com o
 * calendário e as últimas contagens, e o histórico com o resumo da contagem escolhida ao lado (`?contagem=`).
 */
export function ContagensPage() {
  const { unidade } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const { data = [], isLoading, error, refetch } = useContagens(unidade)
  const nomeUnidade = useNomeUnidade()
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [busca, setBusca] = useState("")
  const [params, setParams] = useSearchParams()
  const selecionada = params.get("contagem")
  const visiveis = unidades.filter((u) => !unidade || u.id === unidade)
  const escolher = (id: string | null) => setParams(id ? { contagem: id } : {}, { replace: true })

  // Indicadores: última contagem finalizada de cada unidade.
  const ultimas = visiveis.map((u) => data.find((c) => c.unidade_id === u.id && c.situacao === "finalizada")).filter(Boolean) as ContagemResumo[]
  const abertas = data.filter((c) => c.situacao === "aberta")
  const divergencias = ultimas.reduce((a, c) => a + c.divergencias, 0)
  const contadosUltimas = ultimas.reduce((a, c) => a + c.contados, 0)
  const acuracia = contadosUltimas ? Math.round(((contadosUltimas - divergencias) / contadosUltimas) * 100) : null

  const termo = busca.trim().toLowerCase()
  const lista = data
    .filter((c) => filtro === "todas" || (filtro === "com_divergencia" ? c.divergencias > 0 : c.situacao === filtro))
    .filter((c) => !termo || `${c.responsavel} ${nomeUnidade(c.unidade_id)} ${dataBR(c.data)}`.toLowerCase().includes(termo))

  return (
    <AppShell>
      <div className="flex h-full min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <Cabecalho titulo="Contagens" descricao="Declaração de estoque de cada unidade. Campo vazio é “não contado”; zero só quando digitado."
            acoes={
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar responsável ou data"
                  aria-label="Buscar contagem" className="h-9 pl-9" />
              </div>
            } />

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-3 sm:p-5">
            {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} /> : (
              <>
                <section aria-label="Indicadores das contagens" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi rotulo="Unidades em dia" valor={`${visiveis.filter((u) => !u.atrasada).length}/${visiveis.length}`}
                    detalhe={visiveis.some((u) => u.atrasada) ? `${visiveis.filter((u) => u.atrasada).length} atrasada(s)` : "todas no calendário"} />
                  <Kpi rotulo="Em andamento" valor={abertas.length}
                    detalhe={abertas.length ? `${abertas.reduce((a, c) => a + c.contados, 0)} de ${abertas.reduce((a, c) => a + c.total, 0)} itens contados` : "nenhuma contagem aberta"} />
                  <Kpi rotulo="Divergências" valor={divergencias} detalhe="nas últimas contagens" />
                  <Kpi rotulo="Acurácia do estoque" valor={acuracia === null ? "—" : `${acuracia}%`}
                    detalhe="itens contados sem divergência" />
                </section>

                <section aria-label="Calendário por unidade" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visiveis.map((u) => <CartaoUnidade key={u.id} u={u} contagens={data.filter((c) => c.unidade_id === u.id)} />)}
                </section>

                <section aria-label="Histórico de contagens" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg tracking-tight">Histórico</h2>
                    <Tabs value={filtro} onChange={setFiltro} abas={[
                      { value: "todas", label: "Todas", count: data.length },
                      { value: "aberta", label: "Em andamento", count: abertas.length },
                      { value: "finalizada", label: "Finalizadas", count: data.length - abertas.length },
                      { value: "com_divergencia", label: "Com divergência", count: data.filter((c) => c.divergencias > 0).length },
                    ]} />
                  </div>
                  {lista.length === 0 ? <Vazio icone={ClipboardList} titulo="Nenhuma contagem neste filtro" /> : (
                    <div aria-label="Contagens" className="space-y-5 text-sm">
                      {porMes(lista).map(([mes, contagens]) => (
                        <div key={mes}>
                          <p className="mb-1 px-3 text-xs capitalize text-muted-foreground">{mes} · {contagens.length}</p>
                          <ul className="divide-y divide-border/60">
                            {contagens.map((c) => (
                              <li key={c.id}>
                                <LinhaContagem c={c} unidade={nomeUnidade(c.unidade_id)} selecionada={c.id === selecionada}
                                  onClick={() => escolher(c.id === selecionada ? null : c.id)} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        {selecionada && <PainelContagem id={selecionada} onFechar={() => escolher(null)} />}
      </div>
    </AppShell>
  )
}

/** Agrupa por mês ("novembro de 2026"), mantendo a ordem da lista. */
function porMes(lista: ContagemResumo[]): [string, ContagemResumo[]][] {
  const grupos = new Map<string, ContagemResumo[]>()
  for (const c of lista) {
    const mes = new Date(`${c.data}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    grupos.set(mes, [...(grupos.get(mes) ?? []), c])
  }
  return [...grupos.entries()]
}

/**
 * Linha do histórico no estilo da lista de pedidos (referência da spec 002): leve, sem barra para o que já está
 * completo, a pessoa com avatar e só o necessário em destaque.
 */
function LinhaContagem({ c, unidade, selecionada, onClick }: { c: ContagemResumo; unidade: string; selecionada: boolean; onClick: () => void }) {
  const completa = c.contados === c.total
  return (
    <button type="button" onClick={onClick} aria-pressed={selecionada}
      className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/40 md:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1.3fr)_9rem_5rem_7.5rem_1rem]",
        selecionada && "bg-brand/10 hover:bg-brand/15")}>
      <span className="hidden tabular-nums md:block">
        {dataBR(c.data).slice(0, 5)} <span className="text-xs capitalize text-muted-foreground">{diaDaSemana(c.data)}</span>
      </span>
      <span className="min-w-0 truncate">
        {unidade}
        <span className="block text-xs text-muted-foreground md:hidden">{dataBR(c.data)} · {c.responsavel}</span>
      </span>
      <span className="hidden min-w-0 items-center gap-2 text-muted-foreground md:flex">
        <Avatar name={c.responsavel} className="size-6 text-[10px]" />
        <span className="truncate">{c.responsavel}</span>
      </span>
      <span className="hidden text-muted-foreground md:block">
        {completa ? <span className="inline-flex items-center gap-1.5"><Check className="size-3.5" /> {c.total} itens</span> : (
          <span className="flex items-center gap-2 tabular-nums">
            <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${Math.round((c.contados / c.total) * 100)}%` }} />
            </span>
            {c.contados}/{c.total}
          </span>
        )}
      </span>
      <span className="hidden md:block">
        {c.divergencias ? <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-destructive">{c.divergencias}</span>
          : <span className="text-muted-foreground/60">—</span>}
      </span>
      <span className="row-start-1 justify-self-end md:row-auto md:justify-self-start">
        {c.situacao === "aberta" ? <Badge variant="brand">Em andamento</Badge> : <span className="text-xs text-muted-foreground">Finalizada</span>}
      </span>
      <ChevronRight className="hidden size-4 text-muted-foreground/60 md:block" aria-hidden />
    </button>
  )
}

/** Uma unidade: situação no calendário, últimas contagens (ponto vermelho = teve divergência) e o botão de contar. */
function CartaoUnidade({ u, contagens }: { u: Unidade; contagens: ContagemResumo[] }) {
  const podeContar = usePode("contagem.registrar")
  const abrir = useAbrirContagem()
  const avisar = useToast()
  const navigate = useNavigate()
  const aberta = contagens.find((c) => c.situacao === "aberta")
  const finalizadas = contagens.filter((c) => c.situacao === "finalizada").slice(0, 8).reverse()
  const dias = diasAte(u.proxima_contagem)
  const prazo = aberta ? "Contagem em andamento"
    : dias < 0 ? `Atrasada há ${-dias} dia(s)` : dias === 0 ? "Contar hoje" : `Próxima em ${dias} dia(s)`

  const abrirContagem = () => abrir.mutate({ unidade_id: u.id }, {
    onSuccess: (c) => navigate(`/contagens/${c.id}`),
    onError: (e) => avisar(e.message, "erro"),
  })

  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-background p-4 sm:p-5">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg tracking-tight">{u.nome}</h3>
          <p className="text-xs text-muted-foreground">A cada {u.frequencia_dias} dia(s) · expediente até {u.encerramento}</p>
        </div>
        {aberta ? <Badge variant="brand">Em andamento</Badge>
          : u.atrasada ? <Badge variant="destructive"><CalendarClock className="size-3" /> Atrasada</Badge>
          : <Badge variant="outline">Em dia</Badge>}
      </header>

      {aberta ? (
        <div className="space-y-1">
          <p className="text-sm">{aberta.responsavel} · {dataBR(aberta.data)}</p>
          <Barra feitos={aberta.contados} total={aberta.total} />
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Última</dt><dd className="tabular-nums">{dataBR(u.ultima_contagem)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Próxima</dt><dd className="tabular-nums">{dataBR(u.proxima_contagem)}</dd></div>
        </dl>
      )}

      <div>
        <p className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          Últimas contagens <span>{prazo}</span>
        </p>
        <ol className="flex items-end gap-1" aria-label={`Últimas ${finalizadas.length} contagens de ${u.nome}`}>
          {finalizadas.map((c) => (
            <li key={c.id} className="flex-1">
              <Link to={`/contagens?contagem=${c.id}`} title={`${dataBR(c.data)} · ${c.contados}/${c.total} contados${c.divergencias ? ` · ${c.divergencias} divergência(s)` : ""}`}
                className="block">
                <span className={cn("block h-6 rounded-md bg-foreground/15 hover:bg-foreground/30", c.divergencias > 0 && "bg-destructive/25 hover:bg-destructive/40")} />
              </Link>
            </li>
          ))}
          {finalizadas.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma ainda.</li>}
        </ol>
      </div>

      {aberta ? (
        <Link to={`/contagens/${aberta.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Continuar contagem
        </Link>
      ) : podeContar && (
        <Button variant={u.atrasada ? "default" : "outline"} disabled={abrir.isPending} onClick={abrirContagem}>
          <Play /> Abrir contagem de hoje
        </Button>
      )}
    </article>
  )
}

/** Resumo da contagem ao lado do histórico (no celular, por cima). */
function PainelContagem({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { data: c, isLoading, error } = useContagem(id)
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()
  const nome = (pid: string) => mapa.get(pid)?.nome ?? "…"

  return (
    <aside aria-label="Resumo da contagem"
      className="fixed inset-0 z-40 flex flex-col bg-card lg:static lg:z-auto lg:m-3 lg:w-[22rem] lg:shrink-0 lg:rounded-2xl lg:border lg:bg-background">
      {isLoading ? <Carregando /> : error || !c ? <ErroCarga mensagem={error?.message} /> : (
        <>
          <header className="flex items-start justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-2xl tracking-tight">{nomeUnidade(c.unidade_id)}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {c.situacao === "aberta" ? <Badge variant="brand">Em andamento</Badge> : <Badge variant="outline">Finalizada</Badge>}
                {dataBR(c.data)} · {c.responsavel}
              </p>
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar resumo"
              className="grid size-9 shrink-0 place-items-center rounded-lg border hover:bg-accent"><X className="size-4" /></button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="space-y-2">
              <Barra feitos={c.contados} total={c.total} />
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Contados", c.contados],
                  ["Não contados", c.total - c.contados],
                  ["Com obs./foto", c.itens.filter((i) => i.observacao || i.foto).length],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex flex-col-reverse rounded-xl border p-2">
                    <dt className="text-[11px] text-muted-foreground">{rotulo}</dt><dd className="text-xl tabular-nums">{valor}</dd>
                  </div>
                ))}
              </dl>
              {c.finalizada_em && <p className="text-xs text-muted-foreground">Finalizada em {dataHora(c.finalizada_em)}</p>}
            </section>

            <section className="space-y-2 border-t pt-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.lista_divergencias.length > 0 && <AlertTriangle className="size-3.5 text-destructive" />} Divergências
              </p>
              {c.lista_divergencias.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma: as quedas batem com as saídas registradas.</p> : (
                <ul className="space-y-2">
                  {c.lista_divergencias.map((d) => (
                    <li key={d.produto_id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{nome(d.produto_id)}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {numero(d.esperado)} → <span className="font-medium text-foreground">{numero(d.contado)}</span>
                        <span className="ml-2 rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">−{numero(d.esperado - d.contado)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {c.itens.some((i) => i.observacao || i.foto) && (
              <section className="space-y-2 border-t pt-4">
                <p className="text-xs text-muted-foreground">Observações e fotos</p>
                <ul className="space-y-2 text-sm">
                  {c.itens.filter((i) => i.observacao || i.foto).slice(0, 6).map((i) => (
                    <li key={i.produto_id}>
                      <p className="truncate">{nome(i.produto_id)}</p>
                      <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {i.observacao && <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />{i.observacao}</span>}
                        {i.foto_url && <MiniaturaFoto url={i.foto_url} nome={nome(i.produto_id)} className="size-10" />}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <footer className="border-t p-5">
            <Link to={`/contagens/${c.id}`} className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {c.situacao === "aberta" ? "Continuar contagem" : "Abrir contagem"} <ChevronRight className="size-4" />
            </Link>
          </footer>
        </>
      )}
    </aside>
  )
}
