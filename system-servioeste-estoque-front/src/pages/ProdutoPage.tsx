import { ArrowLeft, Check, PenLine, Plus, X } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Medidor } from "@/components/ui/medidor"
import { QtdMovimento, SeloMovimento } from "@/components/ui/movimento"
import { useToast } from "@/components/ui/toast"
import { useProduto, useSalvarMinimos } from "@/features/catalogo/api"
import { iconeCategoria, nivel, saldoEMinimo, situacao, SITUACAO, textoEmbalagem } from "@/features/catalogo/util"
import { useMovimentacoes } from "@/features/movimentacoes/api"
import { useCategorias, useEu, useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, dataHora, diasAte, lerQuantidade, numero, reais } from "@/lib/format"
import type { ProdutoDetalhe } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

/** Quantos dias o saldo dura no consumo médio. */
const cobertura = (saldo: number | null, consumoMensal: number) =>
  saldo === null || consumoMensal <= 0 ? null : Math.floor((saldo / consumoMensal) * 30)

const secao = "rounded-2xl border bg-background"
const tituloSecao = "flex items-center justify-between gap-3 border-b px-4 py-3 text-lg tracking-tight sm:px-5"

/** Detalhe do produto no estilo das listas da spec 002: resumo, estoque por unidade, movimentações, preços e lotes. */
export function ProdutoPage() {
  const { id = "" } = useParams()
  const { data: p, isLoading, error, refetch } = useProduto(id)
  const { data: eu } = useEu()
  const { data: categorias = [] } = useCategorias()
  const { unidade } = useUnidadeAtiva()
  const podeCotar = usePode("cotacao.montar")

  if (isLoading) return <AppShell><Carregando /></AppShell>
  if (error || !p) return <AppShell><ErroCarga mensagem={error?.message ?? "Produto não encontrado."} onTentarDeNovo={() => refetch()} /></AppShell>

  const unidades = unidade ? [unidade] : eu?.unidades ?? []
  const total = saldoEMinimo(p, unidades)
  const sit = situacao(total.saldo, total.minimo)
  const dias = cobertura(total.saldo, total.consumo)
  const Icone = iconeCategoria(p.categoria_id)
  const categoria = categorias.find((c) => c.id === p.categoria_id)?.nome ?? "—"

  return (
    <AppShell>
      <Cabecalho titulo={p.nome}
        descricao={`${p.codigo} · ${categoria} · medida ${p.medida} · embalagem ${textoEmbalagem(p)}`}
        acoes={<>
          <Link to="/catalogo" className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm hover:bg-accent"><ArrowLeft className="size-4" /> Catálogo</Link>
          {podeCotar && (
            <Link to="/cotacoes/nova" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" /> Nova cotação
            </Link>
          )}
        </>} />

      <div className="space-y-4 p-3 sm:p-5">
        <section aria-label="Resumo do produto" className="grid grid-cols-2 gap-3 lg:grid-cols-[auto_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 flex items-center gap-4 rounded-2xl border bg-background p-4 lg:col-span-1">
            <span className="grid size-14 place-items-center rounded-xl border bg-muted/60"><Icone className="size-6 text-muted-foreground" /></span>
            <div>
              <p className="text-sm text-muted-foreground">Situação</p>
              <p className="flex items-center gap-2 text-2xl tracking-tight">
                <Medidor valor={nivel(total.saldo, total.minimo)} tom={SITUACAO[sit].tom} tamanho={40} rotulo={`Situação: ${SITUACAO[sit].rotulo}`} />
                {SITUACAO[sit].rotulo}
              </p>
            </div>
          </div>
          <Kpi rotulo="Saldo" valor={total.saldo === null ? "—" : numero(total.saldo)} detalhe={unidade ? p.medida : `${p.medida} em ${unidades.length} unidade(s)`} />
          <Kpi rotulo="Mínimo" valor={numero(total.minimo)} detalhe={total.saldo !== null && total.saldo < total.minimo ? `faltam ${numero(total.minimo - total.saldo)}` : p.medida} />
          <Kpi rotulo="Consumo médio" valor={numero(total.consumo)} detalhe={`${p.medida} por mês`} />
          <Kpi rotulo="Cobertura" valor={dias === null ? "—" : `${dias} dias`} detalhe="no consumo médio" />
        </section>

        <EstoquePorUnidade p={p} unidades={eu?.unidades ?? []} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Movimentacoes produto={p.id} />
          <div className="space-y-4">
            <Precos p={p} />
            {p.controla_validade && <Lotes p={p} />}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/** Estoque de cada unidade em formato de listinha: saldo, situação, mínimo editável, consumo e cobertura. */
function EstoquePorUnidade({ p, unidades }: { p: ProdutoDetalhe; unidades: string[] }) {
  const nomeUnidade = useNomeUnidade()
  const podeEditar = usePode("catalogo.editar")
  const colunas = "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_6rem_minmax(0,1.2fr)_8rem_7rem_minmax(7rem,1fr)]"
  return (
    <section className={secao} aria-label="Estoque por unidade">
      <h2 className={tituloSecao}>Estoque por unidade</h2>
      <div className={cn("hidden gap-4 px-5 pt-3 text-xs text-muted-foreground md:grid", colunas)}>
        <span>Unidade</span><span className="text-right">Saldo</span><span>Situação</span><span>Mínimo</span><span className="text-right">Consumo/mês</span><span>Cobertura</span>
      </div>
      <ul className="divide-y divide-border/60 px-2 pb-2 sm:px-3">
        {unidades.map((u) => {
          const saldo = p.saldos[u] ?? null
          const minimo = p.minimos[u] ?? 0
          const consumo = p.consumo_mensal[u] ?? 0
          const s = situacao(saldo, minimo)
          const dias = cobertura(saldo, consumo)
          return (
            <li key={u} className={cn("grid items-center gap-x-4 gap-y-2 rounded-lg px-2 py-3 text-sm", colunas)}>
              <span className="min-w-0">
                <span className="block truncate">{nomeUnidade(u)}</span>
                <span className="block text-xs text-muted-foreground md:hidden">saldo {saldo === null ? "não contado" : numero(saldo)} · mín. {numero(minimo)}</span>
              </span>
              <span className="hidden text-right tabular-nums md:block">{saldo === null ? <span className="text-muted-foreground">Não contado</span> : numero(saldo)}</span>
              <span className="flex items-center gap-2 justify-self-end md:justify-self-start">
                <Medidor valor={nivel(saldo, minimo)} tom={SITUACAO[s].tom} tamanho={32} rotulo={`Situação: ${SITUACAO[s].rotulo}`} />
                <span className="text-muted-foreground">{SITUACAO[s].rotulo}</span>
              </span>
              <span className="hidden md:block">
                {podeEditar ? <MinimoEditavel key={`${u}-${minimo}`} produto={p.id} unidade={u} atual={minimo} /> : <span className="tabular-nums">{numero(minimo)}</span>}
              </span>
              <span className="hidden text-right tabular-nums text-muted-foreground md:block">{numero(consumo)}</span>
              <span className="hidden items-center gap-2 md:flex">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(100, ((dias ?? 0) / 60) * 100)}%` }} />
                </span>
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{dias === null ? "—" : `${dias} dias`}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Mínimo mostrado como número; o lápis abre o campo, com salvar (✓) e cancelar (✕). */
function MinimoEditavel({ produto, unidade, atual }: { produto: string; unidade: string; atual: number }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(atual))
  const salvar = useSalvarMinimos(produto)
  const avisar = useToast()
  const n = lerQuantidade(valor)
  const invalido = n === null || n === undefined

  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)} aria-label="Editar mínimo"
        className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 tabular-nums hover:bg-accent">
        {numero(atual)} <PenLine className="size-3.5 text-muted-foreground group-hover:text-brand" />
      </button>
    )
  }
  const enviar = () => {
    if (invalido) return
    salvar.mutate({ [unidade]: n }, {
      onSuccess: () => { avisar("Mínimo salvo."); setEditando(false) },
      onError: (e) => avisar(e.message, "erro"),
    })
  }
  return (
    <span className="flex items-center gap-1">
      <Input aria-label="Estoque mínimo" inputMode="decimal" value={valor} autoFocus onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") enviar(); if (e.key === "Escape") setEditando(false) }}
        aria-invalid={invalido} className="h-8 w-16 text-right" />
      <button type="button" onClick={enviar} disabled={invalido || salvar.isPending} aria-label="Salvar mínimo"
        className="grid size-8 place-items-center rounded-lg hover:bg-accent hover:text-brand disabled:opacity-40"><Check className="size-4" /></button>
      <button type="button" onClick={() => { setValor(String(atual)); setEditando(false) }} aria-label="Cancelar"
        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
    </span>
  )
}

function Movimentacoes({ produto }: { produto: string }) {
  const { unidade } = useUnidadeAtiva()
  const nomeUnidade = useNomeUnidade()
  const movs = useMovimentacoes({ unidade, produto })
  return (
    <section className={secao} aria-label="Últimas movimentações">
      <h2 className={tituloSecao}>
        Últimas movimentações
        <Link to="/movimentacoes" className="text-xs text-muted-foreground underline-offset-4 hover:text-brand hover:underline">Ver todas</Link>
      </h2>
      {movs.isLoading ? <Carregando /> : movs.error ? <ErroCarga mensagem={movs.error.message} onTentarDeNovo={() => movs.refetch()} />
        : !movs.data?.length ? <p className="px-5 py-4 text-sm text-muted-foreground">Nenhuma movimentação.</p>
        : (
          <ul className="divide-y divide-border/60 px-2 pb-2 text-sm sm:px-3">
            {movs.data.slice(0, 10).map((m) => (
              <li key={m.id} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5">
                <SeloMovimento tipo={m.tipo} className="justify-self-start" />
                <span className="min-w-0">
                  <span className="block truncate">{nomeUnidade(m.unidade_id)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{dataHora(m.data)} · {m.autor}</span>
                </span>
                <QtdMovimento tipo={m.tipo} quantidade={m.quantidade} />
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

function Precos({ p }: { p: ProdutoDetalhe }) {
  return (
    <section className={secao} aria-label="Últimos preços aprovados">
      <h2 className={tituloSecao}>Últimos preços aprovados</h2>
      {p.precos.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">Ainda não comprado por cotação.</p> : (
        <ul className="divide-y divide-border/60 px-2 pb-2 text-sm sm:px-3">
          {p.precos.slice(0, 6).map((x) => (
            <li key={`${x.cotacao_id}-${x.data}`}>
              <Link to={`/cotacoes?cotacao=${x.cotacao_id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate">{x.fornecedor}</span>
                  <span className="text-xs text-muted-foreground">{dataBR(x.data)}</span>
                </span>
                <span className="tabular-nums">{reais(x.preco)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Lotes({ p }: { p: ProdutoDetalhe }) {
  const nomeUnidade = useNomeUnidade()
  return (
    <section className={secao} aria-label="Lotes e validade">
      <h2 className={tituloSecao}>Lotes e validade</h2>
      {p.lotes.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">Sem lote cadastrado.</p> : (
        <ul className="divide-y divide-border/60 px-2 pb-2 text-sm sm:px-3">
          {[...p.lotes].sort((a, b) => a.validade.localeCompare(b.validade)).map((l) => {
            const dias = diasAte(l.validade)
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">Lote {l.numero} · {nomeUnidade(l.unidade_id)}</span>
                  <span className="text-xs text-muted-foreground">vence em {dataBR(l.validade)} · {numero(l.quantidade)} un.</span>
                </span>
                {dias < 0 ? <Badge variant="destructive">Vencido</Badge>
                  : dias <= 30 ? <Badge variant="warning">{dias} dia(s)</Badge>
                  : <span className="text-xs text-muted-foreground">{dias} dias</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
