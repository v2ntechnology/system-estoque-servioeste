import { FileText, Plus } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { useCotacoes, useFornecedores } from "@/features/cotacoes/api"
import { useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, ETAPAS_COTACAO, reais, STATUS_COTACAO } from "@/lib/format"
import type { StatusCotacao } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"

/** Lista de cotações da unidade ativa, filtrada pela etapa. */
export function CotacoesPage() {
  const { unidade } = useUnidadeAtiva()
  const [status, setStatus] = useState<"" | StatusCotacao>("")
  const { data = [], isLoading, error, refetch } = useCotacoes({ unidade })
  const { data: fornecedores = [] } = useFornecedores()
  const nomeUnidade = useNomeUnidade()
  const podeMontar = usePode("cotacao.montar")
  const navigate = useNavigate()
  const lista = data.filter((c) => !status || c.status === status)
  const nomeFornecedor = (id: string | null) => fornecedores.find((f) => f.id === id)?.nome ?? "—"

  return (
    <AppShell>
      <Cabecalho icone={FileText} titulo="Cotações"
        descricao="Do rascunho ao recebimento: monte, envie, aprove e dê entrada no estoque."
        acoes={podeMontar && (
          <Button onClick={() => navigate("/cotacoes/nova")}><Plus /> Nova cotação</Button>
        )} />
      <div className="space-y-4 p-5 sm:p-6">
        <Tabs value={status} onChange={setStatus} abas={[
          { value: "", label: "Todas", count: data.length },
          ...ETAPAS_COTACAO.map((s) => ({ value: s, label: STATUS_COTACAO[s].rotulo, count: data.filter((c) => c.status === s).length })),
        ]} />
        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : lista.length === 0 ? (
            <Vazio icone={FileText} titulo="Nenhuma cotação" descricao="Não há cotações nesta etapa para a unidade escolhida." />
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="space-y-2 md:hidden">
                {lista.map((c) => (
                  <li key={c.id}>
                    <Link to={`/cotacoes/${c.id}`} className="block rounded-2xl border bg-background p-4 hover:bg-accent">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">nº {c.numero} · {c.titulo}</p>
                        <Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {nomeUnidade(c.unidade_id)} · {c.itens_qtd} itens · {reais(c.total)} · {dataBR(c.criada_em)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {/* Computador: tabela */}
              <div className="hidden rounded-2xl border bg-background md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/cotacoes/${c.id}`)}>
                        <TableCell className="tabular-nums">{c.numero}</TableCell>
                        <TableCell><Link to={`/cotacoes/${c.id}`} className="font-medium hover:underline">{c.titulo}</Link></TableCell>
                        <TableCell>{nomeUnidade(c.unidade_id)}</TableCell>
                        <TableCell className="max-w-56 truncate">{nomeFornecedor(c.fornecedor_id)}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.itens_qtd}</TableCell>
                        <TableCell className="text-right tabular-nums">{reais(c.total)}</TableCell>
                        <TableCell><Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge></TableCell>
                        <TableCell className="tabular-nums">{dataBR(c.criada_em)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
      </div>
    </AppShell>
  )
}
