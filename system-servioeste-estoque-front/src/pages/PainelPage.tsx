import { AlertTriangle, CalendarClock, ClipboardList, LayoutDashboard, PackageMinus, ShoppingCart, TimerReset } from "lucide-react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import type { Tendencia } from "@/components/ui/card"
import { Card, Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { useMapaProdutos } from "@/features/catalogo/api"
import { iconeCategoria } from "@/features/catalogo/util"
import { usePainel } from "@/features/painel/api"
import { useEu, useNomeUnidade } from "@/features/sessao/api"
import { dataBR, numero, reais, STATUS_COTACAO } from "@/lib/format"
import type { Painel, Produto } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"

/** Diferença em relação à contagem anterior: cair é bom (menos itens em falta, menos divergência). */
function tendencia(atual: number, anterior: number): Tendencia {
  const d = atual - anterior
  return { texto: d === 0 ? "igual" : `${d > 0 ? "+" : ""}${d}`, direcao: d > 0 ? "sobe" : d < 0 ? "desce" : "igual", boa: d <= 0 }
}

const linha = "flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-accent"

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

          <div className="grid gap-4 xl:grid-cols-2">
            <Card titulo="Itens abaixo do mínimo" icone={PackageMinus}
              acao={<Link to="/cotacoes/nova" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Montar cotação</Link>}>
              {data.abaixo_minimo.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo.</p> : (
                <ListaAbaixoDoMinimo itens={data.abaixo_minimo} produto={(id) => mapa.get(id)} daUnidade={daUnidade} />
              )}
            </Card>

            <Card titulo="Contagens" icone={ClipboardList} acao={<Link to="/contagens" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Ver todas</Link>}>
              <ul className="space-y-0.5">
                {data.contagens.map((c) => (
                  <li key={c.unidade_id}>
                    <Link to={c.aberta_id ? `/contagens/${c.aberta_id}` : "/contagens"} className={linha}>
                      <span>{nomeUnidade(c.unidade_id)}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.aberta_id && <Badge variant="brand">Em andamento</Badge>}
                        {c.atrasada ? <Badge variant="warning"><CalendarClock className="size-3" /> Atrasada desde {dataBR(c.proxima)}</Badge>
                          : <span>Próxima em {dataBR(c.proxima)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card titulo="Divergências da última contagem" icone={AlertTriangle}>
              {data.divergencias.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma queda sem saída registrada.</p> : (
                <ul className="space-y-0.5">
                  {data.divergencias.map((d) => (
                    <li key={`${d.contagem_id}-${d.produto_id}`}>
                      <Link to={`/contagens/${d.contagem_id}`} className={linha}>
                        <span className="min-w-0 truncate">{nome(d.produto_id)}<span className="text-muted-foreground">{daUnidade(d.unidade_id)}</span></span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          esperado {numero(d.esperado)} · contado <span className="font-medium text-foreground">{numero(d.contado)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card titulo="Cotações em aberto" icone={ShoppingCart} acao={<Link to="/cotacoes" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Ver todas</Link>}>
              {data.cotacoes_abertas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma cotação em aberto.</p> : (
                <ul className="space-y-0.5">
                  {data.cotacoes_abertas.map((c) => (
                    <li key={c.id}>
                      <Link to={`/cotacoes/${c.id}`} className={linha}>
                        <span className="min-w-0 truncate">nº {c.numero} · {c.titulo}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                          {reais(c.total)} <Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card titulo="Lotes perto do vencimento" icone={TimerReset} className="xl:col-span-2">
              {data.validade.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lote vence nos próximos 30 dias.</p> : (
                <ul className="grid gap-0.5 md:grid-cols-2">
                  {data.validade.map((l) => (
                    <li key={l.id}>
                      <Link to={`/catalogo/${l.produto_id}`} className={linha}>
                        <span className="min-w-0 truncate">{nome(l.produto_id)}<span className="text-muted-foreground">{daUnidade(l.unidade_id)} · lote {l.numero}</span></span>
                        <Badge variant={l.dias < 0 ? "destructive" : "warning"}>
                          {l.dias < 0 ? `Venceu em ${dataBR(l.validade)}` : l.dias === 0 ? "Vence hoje" : `Vence em ${l.dias} dia(s)`}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
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
