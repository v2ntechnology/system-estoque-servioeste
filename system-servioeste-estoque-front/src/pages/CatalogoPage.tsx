import { ArrowDownUp, ChevronUp, Eye, Package, Plus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Medidor } from "@/components/ui/medidor"
import { Select } from "@/components/ui/select"
import { useProdutos } from "@/features/catalogo/api"
import { iconeCategoria, nivel, saldoEMinimo, situacao, SITUACAO, textoEmbalagem, type Situacao } from "@/features/catalogo/util"
import { useCategorias, useEu, usePode } from "@/features/sessao/api"
import { numero } from "@/lib/format"
import type { Produto } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

const POR_PAGINA = 10

type Ordem = "nome" | "situacao" | "saldo"

interface Linha {
  p: Produto
  saldo: number | null
  minimo: number
  consumo: number
  sit: Situacao
}

/** Catálogo no layout da referência `docs/img/design/referencias/lista-de-produtos.png` (spec 002). */
export function CatalogoPage() {
  const [texto, setTexto] = useState("")
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState("")
  const [ordem, setOrdem] = useState<Ordem>("situacao")
  const [pagina, setPagina] = useState(1)
  const [estatisticas, setEstatisticas] = useState(true)
  const { unidade } = useUnidadeAtiva()
  const { data: eu } = useEu()
  const { data: categorias = [] } = useCategorias()
  const { data, isLoading, error, refetch } = useProdutos({ busca, categoria })
  const podeCotar = usePode("cotacao.montar")

  useEffect(() => {
    const t = setTimeout(() => { setBusca(texto.trim()); setPagina(1) }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const unidades = useMemo(() => (unidade ? [unidade] : eu?.unidades ?? []), [unidade, eu])
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—"

  const linhas: Linha[] = useMemo(() => (data ?? []).map((p) => {
    const { saldo, minimo, consumo } = saldoEMinimo(p, unidades)
    return { p, saldo, minimo, consumo, sit: situacao(saldo, minimo) }
  }).sort((a, b) =>
    ordem === "nome" ? a.p.nome.localeCompare(b.p.nome)
      : ordem === "saldo" ? (b.saldo ?? -1) - (a.saldo ?? -1)
      : SITUACAO[a.sit].ordem - SITUACAO[b.sit].ordem || a.p.nome.localeCompare(b.p.nome)), [data, unidades, ordem])

  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA))
  const atual = Math.min(pagina, paginas)
  const visiveis = linhas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA)

  return (
    <AppShell>
      <Cabecalho titulo="Catálogo" acoes={<>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar produto ou código" aria-label="Buscar produto" className="h-9 pl-9" />
        </div>
        <Select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="h-9 w-44">
          <option value="situacao">Ordenar: situação</option>
          <option value="nome">Ordenar: nome</option>
          <option value="saldo">Ordenar: maior saldo</option>
        </Select>
        <Select aria-label="Categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPagina(1) }} className="h-9 w-48">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        {podeCotar && (
          <Link to="/cotacoes/nova" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Nova cotação
          </Link>
        )}
      </>} />

      {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} /> : (
        <>
          <Estatisticas linhas={linhas} aberta={estatisticas} onAlternar={() => setEstatisticas((v) => !v)} />
          <div className="px-3 pb-4 sm:px-5">
            {visiveis.length === 0 ? <Vazio icone={Package} titulo="Nenhum produto encontrado" descricao="Tente outra busca ou categoria." /> : (
              <ul className="divide-y">
                {visiveis.map((l) => <LinhaProduto key={l.p.id} linha={l} categoria={nomeCategoria(l.p.categoria_id)} />)}
              </ul>
            )}
            {linhas.length > POR_PAGINA && (
              <nav aria-label="Páginas" className="flex items-center justify-between gap-3 border-t pt-4">
                <Button variant="outline" size="sm" disabled={atual === 1} onClick={() => setPagina(atual - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">Página {atual} de {paginas}</span>
                <Button variant="outline" size="sm" disabled={atual === paginas} onClick={() => setPagina(atual + 1)}>Próxima</Button>
              </nav>
            )}
          </div>
        </>
      )}
    </AppShell>
  )
}

function Estatisticas({ linhas, aberta, onAlternar }: { linhas: Linha[]; aberta: boolean; onAlternar: () => void }) {
  const contados = linhas.filter((l) => l.sit !== "nao_contado")
  const boas = contados.filter((l) => l.sit === "boa").length
  const criticas = linhas.filter((l) => l.sit === "critica").length
  const proporcao = contados.length ? boas / contados.length : 0
  const geral: Situacao = !contados.length ? "nao_contado" : criticas / contados.length > 0.2 ? "critica" : proporcao >= 0.7 ? "boa" : "atencao"
  const consumo = linhas.reduce((a, l) => a + l.consumo, 0)

  return (
    <section aria-label="Estatísticas do catálogo" className="m-3 rounded-2xl border bg-background sm:m-5">
      <button type="button" onClick={onAlternar} aria-expanded={aberta}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-lg tracking-tight sm:px-5">
        Estatísticas do estoque
        <ChevronUp className={cn("size-4 text-muted-foreground transition-transform", !aberta && "rotate-180")} />
      </button>
      {aberta && (
        <dl className="grid grid-cols-2 gap-y-4 border-t px-4 py-4 sm:px-5 md:grid-cols-5 md:divide-x">
          <Estat rotulo="Produtos ativos" valor={numero(linhas.length)} detalhe="produtos" />
          <Estat rotulo="Abaixo do mínimo" valor={numero(criticas)} detalhe="itens" />
          <div className="md:px-5">
            <dt className="text-sm text-muted-foreground">Situação geral</dt>
            <dd className="mt-1 flex items-center gap-2">
              <Medidor valor={geral === "nao_contado" ? 0 : proporcao} tom={SITUACAO[geral].tom} tamanho={40} rotulo={`Situação geral: ${SITUACAO[geral].rotulo}`} />
              <span className="text-2xl tracking-tight">{SITUACAO[geral].rotulo}</span>
            </dd>
          </div>
          <Estat rotulo="Consumo no mês" valor={numero(consumo)} detalhe="unidades (média)" />
          <Estat rotulo="Não contados" valor={numero(linhas.length - contados.length)} detalhe="itens" />
        </dl>
      )}
    </section>
  )
}

function Estat({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="md:px-5 md:first:pl-0">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 text-2xl tabular-nums tracking-tight">{valor} <span className="text-sm text-muted-foreground">{detalhe}</span></dd>
    </div>
  )
}

function LinhaProduto({ linha: l, categoria }: { linha: Linha; categoria: string }) {
  const Icone = iconeCategoria(l.p.categoria_id)
  const s = SITUACAO[l.sit]
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 py-3 md:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <span className="grid size-12 place-items-center rounded-xl border bg-muted/60">
        <Icone className="size-5 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <Link to={`/catalogo/${l.p.id}`} className="block truncate font-medium hover:text-brand">{l.p.nome}</Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{l.p.codigo}</span><span>·</span><span>{categoria}</span>
          {l.p.controla_validade && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Validade</Badge>}
        </p>
      </div>

      <div className="order-last col-span-3 flex items-center justify-between gap-3 md:order-none md:col-span-1 md:justify-start">
        <div>
          <p className="text-xs text-muted-foreground">Situação <span className="text-foreground">{s.rotulo}</span></p>
          <p className="text-xs text-muted-foreground tabular-nums">mín. {numero(l.minimo)} · {numero(l.consumo)}/mês</p>
        </div>
        <Medidor valor={nivel(l.saldo, l.minimo)} tom={s.tom} rotulo={`Situação: ${s.rotulo}`} />
      </div>

      <div className="hidden md:block">
        <p className="text-xs text-muted-foreground">Estoque</p>
        <p className="flex items-center gap-1.5 text-sm tabular-nums"><Package className="size-3.5 text-muted-foreground" />
          {l.saldo === null ? <span className="text-muted-foreground">Não contado</span> : <>{numero(l.saldo)} {l.p.medida}</>}
        </p>
      </div>
      <div className="hidden md:block">
        <p className="text-xs text-muted-foreground">Embalagem</p>
        <p className="text-sm">{textoEmbalagem(l.p)}</p>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 text-sm tabular-nums md:hidden">{l.saldo === null ? "—" : numero(l.saldo)}</span>
        <Link to={`/catalogo/${l.p.id}`} aria-label={`Editar mínimos de ${l.p.nome}`} title="Mínimos"
          className="hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-brand sm:grid">
          <ArrowDownUp className="size-4" />
        </Link>
        <Link to={`/catalogo/${l.p.id}`} aria-label={`Ver ${l.p.nome}`} title="Ver produto"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-brand">
          <Eye className="size-4" />
        </Link>
      </div>
    </li>
  )
}
