import { ArrowLeft, Package } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { useProduto, useSalvarMinimos } from "@/features/catalogo/api"
import { textoEmbalagem } from "@/features/catalogo/util"
import { useMovimentacoes } from "@/features/movimentacoes/api"
import { useCategorias, useEu, useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, dataHora, diasAte, numero, reais } from "@/lib/format"
import { useUnidadeAtiva } from "@/lib/unidade"

function MinimoEditavel({ produto, unidade, atual }: { produto: string; unidade: string; atual: number }) {
  const [valor, setValor] = useState(String(atual))
  const salvar = useSalvarMinimos(produto)
  const avisar = useToast()
  const n = Number(valor.replace(",", "."))
  const invalido = valor.trim() === "" || !Number.isFinite(n) || n < 0
  const enviar = () => salvar.mutate({ [unidade]: n }, {
    onSuccess: () => avisar("Mínimo salvo."),
    onError: (e) => avisar(e.message, "erro"),
  })
  return (
    <div className="flex items-center justify-end gap-2">
      <Input aria-label="Estoque mínimo" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)}
        aria-invalid={invalido} className="h-8 w-20 text-right" />
      <Button size="sm" variant="outline" disabled={invalido || n === atual || salvar.isPending} onClick={enviar}>Salvar</Button>
    </div>
  )
}

export function ProdutoPage() {
  const { id = "" } = useParams()
  const { data: p, isLoading, error, refetch } = useProduto(id)
  const { data: eu } = useEu()
  const { data: categorias = [] } = useCategorias()
  const { unidade } = useUnidadeAtiva()
  const nomeUnidade = useNomeUnidade()
  const podeEditar = usePode("catalogo.editar")
  const movs = useMovimentacoes({ unidade, produto: id })

  const voltar = <Link to="/catalogo" className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-accent"><ArrowLeft className="size-3.5" /> Catálogo</Link>

  if (isLoading) return <AppShell><Carregando /></AppShell>
  if (error || !p) return <AppShell><ErroCarga mensagem={error?.message ?? "Produto não encontrado."} onTentarDeNovo={() => refetch()} /></AppShell>

  const unidades = eu?.unidades ?? []
  const categoria = categorias.find((c) => c.id === p.categoria_id)?.nome ?? "—"

  return (
    <AppShell>
      <Cabecalho icone={Package} titulo={p.nome}
        descricao={`${p.codigo} · ${categoria} · medida ${p.medida} · embalagem ${textoEmbalagem(p)}`} acoes={voltar} />
      <div className="space-y-4 p-5 sm:p-6">
        <Card titulo="Estoque por unidade">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Consumo médio/mês</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((u) => {
                const saldo = p.saldos[u] ?? null
                const minimo = p.minimos[u] ?? 0
                return (
                  <TableRow key={u}>
                    <TableCell className="font-medium">{nomeUnidade(u)}</TableCell>
                    <TableCell className="text-right tabular-nums">{saldo === null ? <span className="text-muted-foreground">Não contado</span> : numero(saldo)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {podeEditar ? <MinimoEditavel key={`${u}-${minimo}`} produto={p.id} unidade={u} atual={minimo} /> : numero(minimo)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{numero(p.consumo_mensal[u])}</TableCell>
                    <TableCell>
                      {saldo === null ? <Badge>Sem contagem</Badge> : saldo < minimo ? <Badge variant="warning">Abaixo do mínimo</Badge> : <Badge variant="brand">Ok</Badge>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        {p.controla_validade && (
          <Card titulo="Lotes e validade">
            {p.lotes.length === 0 ? <p className="text-sm text-muted-foreground">Sem lote cadastrado.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...p.lotes].sort((a, b) => a.validade.localeCompare(b.validade)).map((l) => {
                    const dias = diasAte(l.validade)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{l.numero}</TableCell>
                        <TableCell>{nomeUnidade(l.unidade_id)}</TableCell>
                        <TableCell>{dataBR(l.validade)}</TableCell>
                        <TableCell>
                          {dias < 0 ? <Badge variant="destructive">Vencido há {-dias} dia(s)</Badge>
                            : dias <= 30 ? <Badge variant="warning">Vence em {dias} dia(s)</Badge>
                            : <span className="text-muted-foreground">{dias} dias</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{numero(l.quantidade)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card titulo="Últimos preços aprovados">
            {p.precos.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não comprado por cotação.</p> : (
              <ul className="divide-y text-sm">
                {p.precos.slice(0, 8).map((x) => (
                  <li key={`${x.cotacao_id}-${x.data}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{x.fornecedor}</span>
                      <span className="text-xs text-muted-foreground">{dataBR(x.data)} · <Link to={`/cotacoes/${x.cotacao_id}`} className="text-brand hover:underline">ver cotação</Link></span>
                    </span>
                    <span className="font-medium tabular-nums">{reais(x.preco)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card titulo="Últimas movimentações">
            {movs.isLoading ? <Carregando /> : movs.error ? <ErroCarga mensagem={movs.error.message} onTentarDeNovo={() => movs.refetch()} />
              : !movs.data?.length ? <Vazio titulo="Nenhuma movimentação" className="py-8" />
              : (
                <ul className="divide-y text-sm">
                  {movs.data.slice(0, 10).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <Badge variant={m.tipo === "entrada" ? "brand" : "default"}>{m.tipo === "entrada" ? "Entrada" : "Saída"}</Badge>
                          <span className="truncate">{nomeUnidade(m.unidade_id)}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{dataHora(m.data)} · {m.autor}</span>
                      </span>
                      <span className="tabular-nums">{m.tipo === "entrada" ? "+" : "−"}{numero(m.quantidade)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
