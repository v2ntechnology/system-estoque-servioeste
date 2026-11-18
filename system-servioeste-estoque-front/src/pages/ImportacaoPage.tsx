import { CheckCircle2, CircleAlert, FileSpreadsheet, RotateCcw, Upload } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Campo } from "@/components/form/Campo"
import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Faixa, Kpi } from "@/components/ui/card"
import { Confirmar } from "@/components/ui/confirmar"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { useProdutos } from "@/features/catalogo/api"
import { useAssociarLinha, useConfirmarImportacao, useEnviarPlanilha } from "@/features/importacao/api"
import { useNomeUnidade, useUnidades } from "@/features/sessao/api"
import { dataBR, numero } from "@/lib/format"
import type { LinhaImportacao, PreviaImportacao, ResultadoImportacao, TipoPlanilha } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"

const NOME_TIPO: Record<TipoPlanilha, string> = { declaracao_estoque: "Declaração de Estoque", cotacao: "Planilha de cotação" }

const SITUACAO: Record<LinhaImportacao["situacao"], { rotulo: string; tom: "brand" | "warning" | "destructive" | "outline" }> = {
  ok: { rotulo: "Ok", tom: "brand" },
  novo: { rotulo: "Produto novo", tom: "outline" },
  associar: { rotulo: "Associar ao catálogo", tom: "warning" },
  erro: { rotulo: "Erro", tom: "destructive" },
}

function Envio({ aoReceber }: { aoReceber: (p: PreviaImportacao) => void }) {
  const { unidade: ativa } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const [tipo, setTipo] = useState<TipoPlanilha>("declaracao_estoque")
  const [unidade, setUnidade] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const enviar = useEnviarPlanilha()
  const unidadeId = unidade || ativa || unidades[0]?.id || ""

  return (
    <form className="max-w-xl space-y-4 rounded-2xl border bg-background p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (arquivo) enviar.mutate({ arquivo, tipo, unidade_id: unidadeId }, { onSuccess: aoReceber })
      }}>
      <Campo rotulo="Tipo de planilha">
        {(p) => (
          <Select {...p} value={tipo} onChange={(e) => setTipo(e.target.value as TipoPlanilha)}>
            {(Object.keys(NOME_TIPO) as TipoPlanilha[]).map((t) => <option key={t} value={t}>{NOME_TIPO[t]}</option>)}
          </Select>
        )}
      </Campo>
      <Campo rotulo="Unidade">
        {(p) => (
          <Select {...p} value={unidadeId} onChange={(e) => setUnidade(e.target.value)}>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        )}
      </Campo>
      <Campo rotulo="Arquivo" ajuda="Planilha do Excel (.xlsx). Nada é gravado antes de você conferir a prévia e confirmar."
        erro={enviar.error?.message}>
        {(p) => <Input {...p} type="file" accept=".xlsx,.xls" className="h-auto py-2"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />}
      </Campo>
      <Button type="submit" disabled={!arquivo || !unidadeId || enviar.isPending}>
        <Upload /> {enviar.isPending ? "Lendo a planilha…" : "Ver prévia"}
      </Button>
    </form>
  )
}

function Previa({ previa, setPrevia, aoConcluir }: {
  previa: PreviaImportacao
  setPrevia: (p: PreviaImportacao) => void
  aoConcluir: (r: ResultadoImportacao) => void
}) {
  const nomeUnidade = useNomeUnidade()
  const { data: produtos = [] } = useProdutos()
  const associar = useAssociarLinha(previa.id)
  const confirmar = useConfirmarImportacao(previa.id)
  const avisar = useToast()
  const [confirmando, setConfirmando] = useState(false)

  const contar = (s: LinhaImportacao["situacao"]) => previa.linhas.filter((l) => l.situacao === s).length
  const pendentes = contar("associar")
  const erros = contar("erro")

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-background p-4 text-sm">
        <p className="flex items-center gap-2 font-medium"><FileSpreadsheet className="size-4 text-muted-foreground" /> {previa.arquivo}</p>
        <p className="mt-1 text-muted-foreground">
          {NOME_TIPO[previa.tipo]} · {nomeUnidade(previa.unidade_id)} · responsável {previa.responsavel} · {dataBR(previa.data)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Ok" valor={contar("ok")} />
        <Kpi rotulo="Produtos novos" valor={contar("novo")} detalhe="serão criados no catálogo" />
        <Kpi rotulo="A associar" valor={pendentes} detalhe="sem código na planilha" />
        <Kpi rotulo="Com erro" valor={erros} detalhe="serão ignoradas" />
      </div>

      {erros > 0 && (
        <Faixa tom="destructive" icone={CircleAlert}>
          <p>{erros} linha(s) com erro serão ignoradas. Corrija na planilha e importe de novo, se precisar delas.</p>
        </Faixa>
      )}

      <div className="rounded-2xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Linha</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome na planilha</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Medida</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previa.linhas.map((l) => (
              <TableRow key={l.linha}>
                <TableCell className="tabular-nums text-muted-foreground">{l.linha}</TableCell>
                <TableCell className="font-mono text-xs">{l.codigo ?? "—"}</TableCell>
                <TableCell className="min-w-56">
                  {l.nome}
                  {(l.situacao === "associar" || (l.situacao === "ok" && !l.codigo)) && (
                    <Select aria-label={`Produto do catálogo para a linha ${l.linha}`} value={l.produto_id ?? ""} className="mt-1.5 h-8"
                      placeholder="Escolher produto do catálogo…" disabled={associar.isPending}
                      onChange={(e) => associar.mutate({ linha: l.linha, produto_id: e.target.value || null }, {
                        onSuccess: setPrevia, onError: (er) => avisar(er.message, "erro"),
                      })}>
                      {produtos.map((p) => <option key={p.id} value={p.id} data-detalhe={p.codigo}>{p.nome}</option>)}
                    </Select>
                  )}
                  {l.erro && <p className="mt-1 text-xs text-destructive">{l.erro}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {l.quantidade === null ? <span className="text-muted-foreground">Não contado</span> : numero(l.quantidade)}
                </TableCell>
                <TableCell>{l.medida}</TableCell>
                <TableCell className="text-muted-foreground">{l.observacao || "—"}</TableCell>
                <TableCell><Badge variant={SITUACAO[l.situacao].tom}>{SITUACAO[l.situacao].rotulo}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pendentes > 0 || confirmar.isPending} onClick={() => setConfirmando(true)}>
          <CheckCircle2 /> Confirmar importação
        </Button>
        {pendentes > 0 && <p className="text-sm text-muted-foreground">Associe os {pendentes} produto(s) sem código para confirmar.</p>}
      </div>

      {confirmando && (
        <Confirmar titulo="Confirmar importação"
          descricao={`Serão gravadas ${previa.linhas.length - erros} linha(s)${erros ? ` e ignoradas ${erros} com erro` : ""}. Linhas sem quantidade continuam como "não contado".`}
          rotulo="Importar" pendente={confirmar.isPending} erro={confirmar.error?.message}
          onFechar={() => setConfirmando(false)}
          onConfirmar={() => confirmar.mutate(undefined, { onSuccess: (r) => { setConfirmando(false); aoConcluir(r) } })} />
      )}
    </div>
  )
}

export function ImportacaoPage() {
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)
  const recomecar = () => { setPrevia(null); setResultado(null) }

  return (
    <AppShell>
      <Cabecalho icone={FileSpreadsheet} titulo="Importação de planilhas"
        descricao="Traga as planilhas atuais (Declaração de Estoque e cotações) para o sistema, conferindo antes de gravar."
        acoes={(previa || resultado) && <Button variant="outline" onClick={recomecar}><RotateCcw /> Começar de novo</Button>} />
      <div className="space-y-4 p-5 sm:p-6">
        {resultado ? (
          <div className="max-w-xl space-y-4 rounded-2xl border bg-background p-5">
            <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-5 text-brand" /> Importação concluída</p>
            <ul className="space-y-1 text-sm">
              <li>Produtos criados no catálogo: <strong>{resultado.produtos_criados}</strong></li>
              <li>Itens importados: <strong>{resultado.itens_importados}</strong></li>
              <li>Linhas ignoradas: <strong>{resultado.ignorados}</strong></li>
            </ul>
            {resultado.contagem_id && (
              <Link to={`/contagens/${resultado.contagem_id}`} className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-accent">
                Ver a contagem importada
              </Link>
            )}
          </div>
        ) : previa ? (
          <Previa previa={previa} setPrevia={setPrevia} aoConcluir={setResultado} />
        ) : (
          <Envio aoReceber={setPrevia} />
        )}
      </div>
    </AppShell>
  )
}
