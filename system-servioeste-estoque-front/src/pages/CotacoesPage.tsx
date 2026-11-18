import { ChevronRight, FileDown, FileText, Plus, Search, Send, ShieldCheck, Truck, X } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Confirmar } from "@/components/ui/confirmar"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useMapaProdutos } from "@/features/catalogo/api"
import { iconeCategoria } from "@/features/catalogo/util"
import { useAcoesCotacao, useCotacao, useCotacoes, useFornecedores } from "@/features/cotacoes/api"
import { useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, dataHora, ETAPAS_COTACAO, numero, reais, STATUS_COTACAO } from "@/lib/format"
import type { StatusCotacao } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

/**
 * Lista de cotações com o resumo da escolhida num painel à direita (referência da spec 002, lista de pedidos com
 * detalhe ao lado). A cotação escolhida fica na URL (`?cotacao=co-3`), então o link pode ser compartilhado.
 */
export function CotacoesPage() {
  const { unidade } = useUnidadeAtiva()
  const [status, setStatus] = useState<"" | StatusCotacao>("")
  const [busca, setBusca] = useState("")
  const [params, setParams] = useSearchParams()
  const selecionada = params.get("cotacao")
  const { data = [], isLoading, error, refetch } = useCotacoes({ unidade })
  const { data: fornecedores = [] } = useFornecedores()
  const nomeUnidade = useNomeUnidade()
  const podeMontar = usePode("cotacao.montar")
  const navigate = useNavigate()
  const nomeFornecedor = (id: string | null) => fornecedores.find((f) => f.id === id)?.nome ?? "Sem fornecedor"
  const termo = busca.trim().toLowerCase()
  const lista = data
    .filter((c) => !status || c.status === status)
    .filter((c) => !termo || `${c.numero} ${c.titulo} ${nomeFornecedor(c.fornecedor_id)}`.toLowerCase().includes(termo))
  const escolher = (id: string | null) => setParams(id ? { cotacao: id } : {}, { replace: true })

  return (
    <AppShell>
      <div className="flex h-full min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <Cabecalho titulo="Cotações" acoes={<>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nº, título ou fornecedor"
                aria-label="Buscar cotação" className="h-9 pl-9" />
            </div>
            {podeMontar && <Button className="h-9" onClick={() => navigate("/cotacoes/nova")}><Plus /> Nova cotação</Button>}
          </>} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
            <Tabs value={status} onChange={setStatus} abas={[
              { value: "", label: "Todas", count: data.length },
              ...ETAPAS_COTACAO.map((s) => ({ value: s, label: STATUS_COTACAO[s].rotulo, count: data.filter((c) => c.status === s).length })),
            ]} />
            {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
              : lista.length === 0 ? <Vazio icone={FileText} titulo="Nenhuma cotação" descricao="Não há cotações nesta etapa para a unidade escolhida." />
              : (
                <div aria-label="Cotações" className="text-sm">
                  <div className="hidden grid-cols-[6rem_minmax(0,2fr)_minmax(0,1.4fr)_7rem_7rem_2rem] gap-3 border-b px-3 pb-2 text-xs text-muted-foreground md:grid">
                    <span>Nº</span><span>Cotação</span><span>Fornecedor</span>
                    <span className="text-right">Total</span><span>Etapa</span><span />
                  </div>
                  {lista.map((c) => (
                    <button key={c.id} type="button" onClick={() => escolher(c.id === selecionada ? null : c.id)}
                      aria-pressed={c.id === selecionada}
                      className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent md:grid-cols-[6rem_minmax(0,2fr)_minmax(0,1.4fr)_7rem_7rem_2rem]",
                        c.id === selecionada && "bg-brand/10 hover:bg-brand/15")}>
                      <span className="hidden md:block">
                        <span className="block font-medium tabular-nums">#{String(c.numero).padStart(4, "0")}</span>
                        <span className="block text-xs text-muted-foreground">{dataBR(c.criada_em)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.titulo}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          <span className="md:hidden">#{c.numero} · </span>{nomeUnidade(c.unidade_id)} · {c.itens_qtd} itens
                        </span>
                      </span>
                      <span className="hidden truncate md:block">{nomeFornecedor(c.fornecedor_id)}</span>
                      <span className="hidden text-right tabular-nums md:block">{reais(c.total)}</span>
                      <span><Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge></span>
                      <ChevronRight className="hidden size-4 text-muted-foreground md:block" aria-hidden />
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>

        {selecionada && <PainelCotacao id={selecionada} onFechar={() => escolher(null)} />}
      </div>
    </AppShell>
  )
}

/** Resumo da cotação ao lado da lista (no celular, por cima dela). */
function PainelCotacao({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { data: c, isLoading, error } = useCotacao(id)
  const { data: fornecedores = [] } = useFornecedores()
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()
  const acoes = useAcoesCotacao(id)
  const podeMontar = usePode("cotacao.montar")
  const podeAprovar = usePode("cotacao.aprovar")
  const avisar = useToast()
  const [confirmar, setConfirmar] = useState<"aprovar" | "receber" | null>(null)
  const fornecedor = fornecedores.find((f) => f.id === c?.fornecedor_id)
  const erro = (e: Error) => avisar(e.message, "erro")

  return (
    <aside aria-label="Resumo da cotação"
      className="fixed inset-0 z-40 flex flex-col bg-card lg:static lg:z-auto lg:m-3 lg:w-[22rem] lg:shrink-0 lg:rounded-2xl lg:border lg:bg-background">
      {isLoading ? <Carregando /> : error || !c ? <ErroCarga mensagem={error?.message} /> : (
        <>
          <header className="flex items-start justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-2xl tracking-tight">Cotação #{String(c.numero).padStart(4, "0")}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge>
                Criada em {dataHora(c.criada_em)}
              </p>
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar resumo"
              className="grid size-9 shrink-0 place-items-center rounded-lg border hover:bg-accent"><X className="size-4" /></button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                {fornecedor && <Link to="/fornecedores" className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-accent">
                  Ver <ChevronRight className="size-3" /></Link>}
              </div>
              {fornecedor ? (
                <div className="text-sm">
                  <p className="font-medium">{fornecedor.nome}</p>
                  <p className="text-muted-foreground">{fornecedor.contato} · {fornecedor.telefone}</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">Ainda sem fornecedor escolhido.</p>}
              <p className="text-xs text-muted-foreground">{c.titulo} · {nomeUnidade(c.unidade_id)}</p>
            </section>

            <section className="space-y-2 border-t pt-4">
              <p className="text-xs text-muted-foreground">Itens da cotação</p>
              <ul className="space-y-3">
                {c.itens.map((i) => {
                  const p = mapa.get(i.produto_id)
                  const Icone = iconeCategoria(p?.categoria_id ?? "")
                  return (
                    <li key={i.produto_id} className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-muted/60"><Icone className="size-4 text-muted-foreground" /></span>
                      <span className="min-w-0 text-sm">
                        <span className="block truncate">{p?.nome ?? "…"}</span>
                        <span className="text-muted-foreground"><span className="font-medium text-foreground">{reais(i.preco)}</span> × {numero(i.quantidade)} {p?.medida}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            {c.aprovada_por && c.aprovada_em && (
              <p className="border-t pt-4 text-xs text-muted-foreground">Aprovada por {c.aprovada_por} em {dataHora(c.aprovada_em)}</p>
            )}
          </div>

          <footer className="space-y-3 border-t p-5">
            <p className="flex items-baseline justify-between text-sm text-muted-foreground">
              Total <span className="text-2xl tabular-nums tracking-tight text-foreground">{reais(c.total)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {c.status === "rascunho" && podeMontar && (
                <Button size="sm" disabled={acoes.enviar.isPending}
                  onClick={() => acoes.enviar.mutate(undefined, { onSuccess: () => avisar("Cotação enviada."), onError: erro })}><Send /> Enviar</Button>
              )}
              {c.status === "enviada" && podeAprovar && <Button size="sm" onClick={() => setConfirmar("aprovar")}><ShieldCheck /> Aprovar</Button>}
              {c.status === "aprovada" && podeMontar && <Button size="sm" onClick={() => setConfirmar("receber")}><Truck /> Receber</Button>}
              <Link to={`/cotacoes/${c.id}/pdf`} className="inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium hover:bg-accent">
                <FileDown className="size-4" /> PDF
              </Link>
              <Link to={`/cotacoes/${c.id}`} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-accent">
                Abrir <ChevronRight className="size-4" />
              </Link>
            </div>
          </footer>

          {confirmar === "aprovar" && (
            <Confirmar titulo="Aprovar cotação" rotulo="Aprovar" pendente={acoes.aprovar.isPending} erro={acoes.aprovar.error?.message}
              descricao={`Aprovar a cotação nº ${c.numero}, no total de ${reais(c.total)}? Fica registrado o seu nome e a data.`}
              onFechar={() => { acoes.aprovar.reset(); setConfirmar(null) }}
              onConfirmar={() => acoes.aprovar.mutate(undefined, { onSuccess: () => { setConfirmar(null); avisar("Cotação aprovada.") } })} />
          )}
          {confirmar === "receber" && (
            <Confirmar titulo="Marcar como recebida" rotulo="Confirmar recebimento" pendente={acoes.receber.isPending} erro={acoes.receber.error?.message}
              descricao={`Cada item vira uma entrada no estoque de ${nomeUnidade(c.unidade_id)}.`}
              onFechar={() => { acoes.receber.reset(); setConfirmar(null) }}
              onConfirmar={() => acoes.receber.mutate(undefined, { onSuccess: () => { setConfirmar(null); avisar("Recebida. Entradas registradas no estoque.") } })} />
          )}
        </>
      )}
    </aside>
  )
}
