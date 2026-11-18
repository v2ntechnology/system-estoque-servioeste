import { AlertTriangle, Check, ChevronRight, ClipboardList, LayoutDashboard, PackageMinus, ShoppingCart, TimerReset } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import type { Tendencia } from "@/components/ui/card"
import { Card, Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { useMapaProdutos } from "@/features/catalogo/api"
import { useContagens } from "@/features/contagens/api"
import { iconeCategoria } from "@/features/catalogo/util"
import { usePainel } from "@/features/painel/api"
import { useEu, useNomeUnidade } from "@/features/sessao/api"
import { dataBR, diasAte, ETAPAS_COTACAO, numero, reais, STATUS_COTACAO } from "@/lib/format"
import type { Painel, Produto } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

/** Diferença em relação à contagem anterior: cair é bom (menos itens em falta, menos divergência). */
function tendencia(atual: number, anterior: number): Tendencia {
  const d = atual - anterior
  return { texto: d === 0 ? "igual" : `${d > 0 ? "+" : ""}${d}`, direcao: d > 0 ? "sobe" : d < 0 ? "desce" : "igual", boa: d <= 0 }
}


/** Tela inicial: o que precisa de atenção nas unidades liberadas (spec 001, história 1). */
export function PainelPage() {
  const { unidade } = useUnidadeAtiva()
  const { data: eu } = useEu()
  const { data, isLoading, error, refetch } = usePainel(unidade)
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()
  const nome = (id: string) => mapa.get(id)?.nome ?? "…"
  const daUnidade = (unidadeId: string) => (unidade ? "" : ` · ${nomeUnidade(unidadeId)}`)

  return (
    <AppShell>
      <Cabecalho icone={LayoutDashboard} titulo={`Olá, ${eu?.nome.split(" ")[0] ?? ""}`}
        descricao={unidade ? `Resumo de ${nomeUnidade(unidade)}.` : "Resumo de todas as unidades liberadas para você."} />
      {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} /> : data && (
        <div className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi rotulo="Abaixo do mínimo" valor={data.abaixo_minimo.length} detalhe="desde a contagem anterior"
              tendencia={tendencia(data.abaixo_minimo.length, data.anterior.abaixo_minimo)} />
            <Kpi rotulo="Contagens atrasadas" valor={data.contagens.filter((c) => c.atrasada).length}
              detalhe={`de ${data.contagens.length} unidade(s) · ${data.contagens.filter((c) => c.aberta_id).length} em andamento`} />
            <Kpi rotulo="Cotações em aberto" valor={data.cotacoes_abertas.length}
              detalhe={`${reais(data.cotacoes_abertas.reduce((a, c) => a + (c.total ?? 0), 0))} em cotação`} />
            <Kpi rotulo="Divergências" valor={data.divergencias.length} detalhe="desde a contagem anterior"
              tendencia={tendencia(data.divergencias.length, data.anterior.divergencias)} />
            <Kpi rotulo="Validade" valor={data.validade.length} detalhe="lotes vencem em até 30 dias" />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <Card titulo="Itens abaixo do mínimo" icone={PackageMinus}
              acao={<Link to="/cotacoes/nova" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Montar cotação</Link>}>
              {data.abaixo_minimo.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo.</p> : (
                <ListaAbaixoDoMinimo itens={data.abaixo_minimo} produto={(id) => mapa.get(id)} daUnidade={daUnidade} />
              )}
            </Card>

            <Card titulo="Contagens" icone={ClipboardList} acao={<Link to="/contagens" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Ver todas</Link>}>
              <ListaContagens contagens={data.contagens} />
            </Card>

            <Card titulo="Divergências da última contagem" icone={AlertTriangle}
              acao={data.divergencias.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">{data.divergencias.length} produto(s)</span>}>
              {data.divergencias.length === 0 ? <Tranquilo texto="Nenhuma queda sem saída registrada." /> : (
                <ListaDivergencias itens={data.divergencias} produto={(id) => mapa.get(id)} daUnidade={daUnidade} />
              )}
            </Card>

            <Card titulo="Cotações em aberto" icone={ShoppingCart} acao={<Link to="/cotacoes" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Ver todas</Link>}>
              {data.cotacoes_abertas.length === 0 ? <Tranquilo texto="Nenhuma cotação em aberto." /> : (
                <ListaCotacoes cotacoes={data.cotacoes_abertas} />
              )}
            </Card>

            {data.validade.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground xl:col-span-2">
                <TimerReset className="size-4" /> Nenhum lote vence nos próximos 30 dias.
              </div>
            ) : (
              <Card titulo="Lotes perto do vencimento" icone={TimerReset} className="xl:col-span-2">
                <ul className="grid gap-x-6 divide-y divide-border/60 md:grid-cols-2 md:divide-y-0">
                  {data.validade.map((l) => (
                    <li key={l.id}>
                      <Link to={`/catalogo/${l.produto_id}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2.5 text-sm hover:bg-accent">
                        <span className="min-w-0">
                          <span className="block truncate">{nome(l.produto_id)}</span>
                          <span className="block truncate text-xs text-muted-foreground">lote {l.numero}{daUnidade(l.unidade_id)} · {dataBR(l.validade)}</span>
                        </span>
                        <Pilula tom={l.dias < 0 ? "erro" : "aviso"}>{l.dias < 0 ? "Vencido" : l.dias === 0 ? "Hoje" : `${l.dias} dias`}</Pilula>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}

/** Itens abaixo do mínimo em formato de listinha: produto, saldo, quanto do mínimo está coberto e quanto falta. */
function ListaAbaixoDoMinimo({ itens, produto, daUnidade }: {
  itens: Painel["abaixo_minimo"]
  produto: (id: string) => Produto | undefined
  daUnidade: (unidadeId: string) => string
}) {
  const ordenados = [...itens].sort((a, b) => a.saldo / a.minimo - b.saldo / b.minimo)
  return (
    <div className="-mx-1">
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(5rem,7rem)_4rem] gap-3 px-1 pb-2 text-xs text-muted-foreground">
        <span>Produto</span><span className="text-right">Saldo</span><span>Cobertura</span><span className="text-right">Falta</span>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto">
        {ordenados.map((i) => {
          const p = produto(i.produto_id)
          const Icone = iconeCategoria(p?.categoria_id ?? "")
          const cobertura = i.minimo ? Math.round((i.saldo / i.minimo) * 100) : 0
          return (
            <li key={`${i.unidade_id}-${i.produto_id}`}>
              <Link to={`/catalogo/${i.produto_id}`}
                className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(5rem,7rem)_4rem] items-center gap-3 rounded-lg px-1 py-2.5 text-sm hover:bg-accent">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border bg-muted/60">
                    <Icone className="size-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p?.nome ?? "…"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p?.codigo}{daUnidade(i.unidade_id)} · mín. {numero(i.minimo)}</span>
                  </span>
                </span>
                <span className="text-right tabular-nums">{numero(i.saldo)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{cobertura}%</span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, cobertura)}%` }} />
                  </span>
                </span>
                <span className="justify-self-end rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-destructive">
                  −{numero(i.minimo - i.saldo)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Linha vazia discreta: o cartão não fica grande quando não há nada a mostrar. */
function Tranquilo({ texto }: { texto: string }) {
  return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4" /> {texto}</p>
}

/** Pílula de situação: vermelha (erro), âmbar (aviso) ou neutra. Só para indicar situação (princípio XI). */
function Pilula({ tom = "neutro", children }: { tom?: "erro" | "aviso" | "neutro"; children: ReactNode }) {
  return (
    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
      tom === "erro" ? "bg-destructive/10 text-destructive" : tom === "aviso" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}>
      {children}
    </span>
  )
}

/** Uma linha por unidade: situação no calendário (um só indicador) e o progresso da contagem aberta. */
function ListaContagens({ contagens }: { contagens: Painel["contagens"] }) {
  const { unidade } = useUnidadeAtiva()
  const { data: lista = [] } = useContagens(unidade)
  const nomeUnidade = useNomeUnidade()
  return (
    <ul className="divide-y divide-border/60">
      {contagens.map((c) => {
        const aberta = c.aberta_id ? lista.find((x) => x.id === c.aberta_id) : null
        const dias = diasAte(c.proxima)
        return (
          <li key={c.unidade_id}>
            <Link to={c.aberta_id ? `/contagens/${c.aberta_id}` : "/contagens"}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-2.5 text-sm hover:bg-accent">
              <span className="min-w-0">
                <span className="block truncate">{nomeUnidade(c.unidade_id)}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className={cn("size-1.5 rounded-full", aberta ? "bg-brand" : c.atrasada ? "bg-destructive" : "bg-muted-foreground/40")} />
                  {aberta ? `Em andamento · ${aberta.contados} de ${aberta.total}`
                    : c.atrasada ? `Atrasada há ${-dias} dia(s)` : dias === 0 ? "Contar hoje" : `Próxima em ${dias} dia(s) · ${dataBR(c.proxima)}`}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {aberta && (
                  <span className="hidden h-1 w-20 overflow-hidden rounded-full bg-muted sm:block">
                    <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${Math.round((aberta.contados / aberta.total) * 100)}%` }} />
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{aberta ? "Continuar" : c.atrasada ? "Contar" : ""}</span>
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Divergências em listinha: produto, esperado → contado e quanto sumiu. */
function ListaDivergencias({ itens, produto, daUnidade }: {
  itens: Painel["divergencias"]
  produto: (id: string) => Produto | undefined
  daUnidade: (unidadeId: string) => string
}) {
  return (
    <div className="-mx-1">
      <div className="grid grid-cols-[minmax(0,1fr)_7rem_4rem] gap-3 px-1 pb-2 text-xs text-muted-foreground">
        <span>Produto</span><span className="text-right">Esperado → contado</span><span className="text-right">Sumiu</span>
      </div>
      <ul className="divide-y divide-border/60">
        {itens.map((d) => {
          const p = produto(d.produto_id)
          const Icone = iconeCategoria(p?.categoria_id ?? "")
          const perda = Math.round(((d.esperado - d.contado) / d.esperado) * 100)
          return (
            <li key={`${d.contagem_id}-${d.produto_id}`}>
              <Link to={`/contagens?contagem=${d.contagem_id}`}
                className="grid grid-cols-[minmax(0,1fr)_7rem_4rem] items-center gap-3 rounded-lg px-1 py-2.5 text-sm hover:bg-accent">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border bg-muted/60"><Icone className="size-4 text-muted-foreground" /></span>
                  <span className="min-w-0">
                    <span className="block truncate">{p?.nome ?? "…"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p?.codigo}{daUnidade(d.unidade_id)} · {perda}% a menos</span>
                  </span>
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{numero(d.esperado)} → <span className="text-foreground">{numero(d.contado)}</span></span>
                <span className="justify-self-end"><Pilula tom="erro">−{numero(d.esperado - d.contado)}</Pilula></span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Cotações em aberto: número, título, unidade, as quatro etapas em tracinhos, total e etapa atual. */
function ListaCotacoes({ cotacoes }: { cotacoes: Painel["cotacoes_abertas"] }) {
  const nomeUnidade = useNomeUnidade()
  return (
    <ul className="divide-y divide-border/60">
      {cotacoes.map((c) => {
        const etapa = ETAPAS_COTACAO.indexOf(c.status)
        return (
          <li key={c.id}>
            <Link to={`/cotacoes?cotacao=${c.id}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-2.5 text-sm hover:bg-accent">
              <span className="tabular-nums text-muted-foreground">#{String(c.numero).padStart(4, "0")}</span>
              <span className="min-w-0">
                <span className="block truncate">{c.titulo}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex gap-0.5" aria-label={`Etapa ${etapa + 1} de 4`}>
                    {ETAPAS_COTACAO.map((e, i) => <span key={e} className={cn("h-1 w-4 rounded-full", i <= etapa ? "bg-foreground/70" : "bg-muted")} />)}
                  </span>
                  {STATUS_COTACAO[c.status].rotulo} · {nomeUnidade(c.unidade_id)} · {c.itens_qtd} itens
                </span>
              </span>
              <span className="text-right tabular-nums">{reais(c.total)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
