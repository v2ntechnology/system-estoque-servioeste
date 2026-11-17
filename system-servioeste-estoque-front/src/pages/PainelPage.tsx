import { AlertTriangle, CalendarClock, ClipboardList, LayoutDashboard, PackageMinus, ShoppingCart, TimerReset } from "lucide-react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Card, Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { useMapaProdutos } from "@/features/catalogo/api"
import { usePainel } from "@/features/painel/api"
import { useEu, useNomeUnidade } from "@/features/sessao/api"
import { dataBR, numero, reais, STATUS_COTACAO } from "@/lib/format"
import { useUnidadeAtiva } from "@/lib/unidade"

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
            <Kpi rotulo="Abaixo do mínimo" valor={data.abaixo_minimo.length} tom={data.abaixo_minimo.length ? "warning" : undefined} detalhe="itens" />
            <Kpi rotulo="Contagens atrasadas" valor={data.contagens.filter((c) => c.atrasada).length}
              tom={data.contagens.some((c) => c.atrasada) ? "warning" : undefined} detalhe={`de ${data.contagens.length} unidade(s)`} />
            <Kpi rotulo="Cotações em aberto" valor={data.cotacoes_abertas.length} tom="brand" detalhe="rascunho, enviada ou aprovada" />
            <Kpi rotulo="Divergências" valor={data.divergencias.length} tom={data.divergencias.length ? "warning" : undefined} detalhe="na última contagem" />
            <Kpi rotulo="Validade" valor={data.validade.length} tom={data.validade.length ? "warning" : undefined} detalhe="lotes em até 30 dias" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card titulo="Itens abaixo do mínimo" icone={PackageMinus}
              acao={<Link to="/cotacoes/nova" className="text-xs text-brand hover:underline">Montar cotação</Link>}>
              {data.abaixo_minimo.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo.</p> : (
                <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                  {data.abaixo_minimo.map((i) => (
                    <li key={`${i.unidade_id}-${i.produto_id}`}>
                      <Link to={`/catalogo/${i.produto_id}`} className={linha}>
                        <span className="min-w-0 truncate">{nome(i.produto_id)}<span className="text-muted-foreground">{daUnidade(i.unidade_id)}</span></span>
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                          <span className="font-medium text-warning">{numero(i.saldo)}</span> / mín. {numero(i.minimo)} · faltam {numero(i.minimo - i.saldo)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card titulo="Contagens" icone={ClipboardList} acao={<Link to="/contagens" className="text-xs text-brand hover:underline">Ver todas</Link>}>
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
                          esperado {numero(d.esperado)} · contado <span className="font-medium text-warning">{numero(d.contado)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card titulo="Cotações em aberto" icone={ShoppingCart} acao={<Link to="/cotacoes" className="text-xs text-brand hover:underline">Ver todas</Link>}>
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
