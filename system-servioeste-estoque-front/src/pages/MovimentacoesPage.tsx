import { ArrowLeftRight, Plus } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Campo } from "@/components/form/Campo"
import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { QtdMovimento, SeloMovimento } from "@/components/ui/movimento"
import { useMapaProdutos } from "@/features/catalogo/api"
import { useMovimentacoes, useRegistrarMovimentacao } from "@/features/movimentacoes/api"
import { useNomeUnidade, usePode, useUnidades } from "@/features/sessao/api"
import { dataHora, lerQuantidade } from "@/lib/format"
import type { TipoMovimentacao } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"

const ORIGEM = { manual: "Manual", cotacao: "Cotação", importacao: "Importação" } as const

/** Entradas e saídas por unidade (spec 001, RF-10). Transferência entre unidades está fora do escopo. */
export function MovimentacoesPage() {
  const { unidade } = useUnidadeAtiva()
  const [tipo, setTipo] = useState<"" | TipoMovimentacao>("")
  const [novo, setNovo] = useState(false)
  const { data = [], isLoading, error, refetch } = useMovimentacoes({ unidade, tipo })
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()
  const podeRegistrar = usePode("movimentacao.registrar")

  return (
    <AppShell>
      <Cabecalho icone={ArrowLeftRight} titulo="Movimentações"
        descricao="Tudo o que entra e sai de cada unidade. É com isso que o sistema calcula o saldo esperado e o consumo do mês."
        acoes={podeRegistrar && <Button onClick={() => setNovo(true)}><Plus /> Registrar</Button>} />
      <div className="space-y-4 p-5 sm:p-6">
        <Tabs value={tipo} onChange={setTipo} abas={[
          { value: "", label: "Todas" }, { value: "entrada", label: "Entradas" }, { value: "saida", label: "Saídas" },
        ]} />
        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : data.length === 0 ? <Vazio icone={ArrowLeftRight} titulo="Nenhuma movimentação" />
          : (
            <div className="overflow-x-auto rounded-2xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Produto</TableHead>
                    {!unidade && <TableHead>Unidade</TableHead>}
                    <TableHead className="text-right">Quantidade</TableHead><TableHead>Origem</TableHead><TableHead>Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{dataHora(m.data)}</TableCell>
                      <TableCell>
                        <SeloMovimento tipo={m.tipo} />
                      </TableCell>
                      <TableCell className="min-w-48">
                        <Link to={`/catalogo/${m.produto_id}`} className="hover:underline">{mapa.get(m.produto_id)?.nome ?? "…"}</Link>
                        {m.observacao && <span className="block text-xs text-muted-foreground">{m.observacao}</span>}
                      </TableCell>
                      {!unidade && <TableCell>{nomeUnidade(m.unidade_id)}</TableCell>}
                      <TableCell className="text-right tabular-nums"><QtdMovimento tipo={m.tipo} quantidade={m.quantidade} sufixo={mapa.get(m.produto_id)?.medida} /></TableCell>
                      <TableCell>
                        {m.origem === "cotacao" && m.referencia
                          ? <Link to={`/cotacoes/${m.referencia}`} className="text-foreground underline-offset-4 hover:text-brand hover:underline">{ORIGEM.cotacao}</Link> : ORIGEM[m.origem]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{m.autor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
      {novo && <NovaMovimentacaoDialog onFechar={() => setNovo(false)} />}
    </AppShell>
  )
}

function NovaMovimentacaoDialog({ onFechar }: { onFechar: () => void }) {
  const { unidade } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const { data: produtos = [] } = useMapaProdutos()
  const registrar = useRegistrarMovimentacao()
  const avisar = useToast()
  const [tipo, setTipo] = useState<TipoMovimentacao>("saida")
  const [unidadeId, setUnidadeId] = useState(unidade || unidades[0]?.id || "")
  const [produto, setProduto] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [observacao, setObservacao] = useState("")
  const q = lerQuantidade(quantidade)
  const erroQtd = quantidade && (q === undefined || q === null || q <= 0) ? "Informe uma quantidade maior que zero." : undefined

  const salvar = () => {
    if (!produto || !unidadeId || q == null || erroQtd) return
    registrar.mutate({ tipo, produto_id: produto, unidade_id: unidadeId, quantidade: q, observacao }, {
      onSuccess: () => { avisar(tipo === "entrada" ? "Entrada registrada." : "Saída registrada."); onFechar() },
      onError: (e) => avisar(e.message, "erro"),
    })
  }

  return (
    <Dialog open onClose={onFechar} title="Registrar movimentação" description="Entrada (chegou material) ou saída (foi usado ou enviado)."
      footer={<>
        <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button onClick={salvar} disabled={!produto || q == null || !!erroQtd || registrar.isPending}>Registrar</Button>
      </>}>
      <div className="space-y-4">
        <Tabs value={tipo} onChange={setTipo} abas={[{ value: "saida", label: "Saída" }, { value: "entrada", label: "Entrada" }]} />
        <Campo rotulo="Unidade">
          {(p) => <Select {...p} value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>}
        </Campo>
        <Campo rotulo="Produto">
          {(p) => <Select {...p} value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Escolha o produto">
            {produtos.map((x) => <option key={x.id} value={x.id} data-detalhe={`${x.codigo} · ${x.medida}`}>{x.nome}</option>)}
          </Select>}
        </Campo>
        <Campo rotulo="Quantidade" erro={erroQtd}>
          {(p) => <Input {...p} inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />}
        </Campo>
        <Campo rotulo="Observação">
          {(p) => <Textarea {...p} rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: enviado para o posto de coleta" />}
        </Campo>
      </div>
    </Dialog>
  )
}
