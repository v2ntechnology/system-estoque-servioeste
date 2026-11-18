import { Check, FileText, History, Paperclip, Printer, Send, ShieldCheck, Truck, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Campo } from "@/components/form/Campo"
import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, Faixa } from "@/components/ui/card"
import { Confirmar } from "@/components/ui/confirmar"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useMapaProdutos, useProduto } from "@/features/catalogo/api"
import { useAcoesCotacao, useCotacao, useFornecedores } from "@/features/cotacoes/api"
import { useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, dataHora, ETAPAS_COTACAO, lerQuantidade, numero, reais, STATUS_COTACAO } from "@/lib/format"
import type { Cotacao, TipoAnexo } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const NOME_ANEXO: Record<TipoAnexo, string> = { proposta: "Proposta", nota_fiscal: "Nota fiscal", boleto: "Boleto" }

/** Detalhe da cotação: itens e preços, fornecedor, etapas, anexos e histórico. */
export function CotacaoPage() {
  const { id = "" } = useParams()
  const { data: c, isLoading, error, refetch } = useCotacao(id)
  return (
    <AppShell>
      {isLoading ? <Carregando /> : error || !c ? <ErroCarga mensagem={error?.message} onTentarDeNovo={() => refetch()} />
        : <Detalhe c={c} />}
    </AppShell>
  )
}

function Detalhe({ c }: { c: Cotacao }) {
  const avisar = useToast()
  const acoes = useAcoesCotacao(c.id)
  const podeMontar = usePode("cotacao.montar")
  const podeAprovar = usePode("cotacao.aprovar")
  const nomeUnidade = useNomeUnidade()
  const { mapa } = useMapaProdutos()
  const { data: fornecedores = [] } = useFornecedores()
  const [precos, setPrecos] = useState<Record<string, string>>({})
  const [confirmar, setConfirmar] = useState<"aprovar" | "receber" | null>(null)

  const editavel = (c.status === "rascunho" || c.status === "enviada") && podeMontar
  const status = STATUS_COTACAO[c.status]
  const precoDigitado = (produtoId: string, atual: number | null) =>
    precos[produtoId] ?? (atual == null ? "" : String(atual).replace(".", ","))
  const alterado = Object.keys(precos).length > 0
  const precoInvalido = Object.values(precos).some((t) => lerQuantidade(t) === undefined)
  const totalTela = c.itens.reduce<number | null>((s, i) => {
    const p = lerQuantidade(precoDigitado(i.produto_id, i.preco))
    return p == null ? s : (s ?? 0) + p * i.quantidade
  }, null)

  const erro = (e: Error) => avisar(e.message, "erro")

  const salvarPrecos = () => acoes.alterar.mutate(
    { itens: c.itens.map((i) => ({ ...i, preco: lerQuantidade(precoDigitado(i.produto_id, i.preco)) ?? null })) },
    { onSuccess: () => { setPrecos({}); avisar("Preços salvos.") }, onError: erro },
  )

  return (
    <>
      <Cabecalho icone={FileText} titulo={`Cotação nº ${c.numero} · ${c.titulo}`}
        descricao={`${nomeUnidade(c.unidade_id)} · criada em ${dataBR(c.criada_em)}`}
        acoes={<>
          <Link to={`/cotacoes/${c.id}/pdf`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium hover:bg-accent">
            <Printer className="size-4" /> Gerar PDF
          </Link>
          {c.status === "rascunho" && podeMontar && (
            <Button disabled={acoes.enviar.isPending}
              onClick={() => acoes.enviar.mutate(undefined, { onSuccess: () => avisar("Cotação enviada."), onError: erro })}>
              <Send /> Enviar para cotação
            </Button>
          )}
          {c.status === "enviada" && podeAprovar && (
            <Button onClick={() => setConfirmar("aprovar")} disabled={alterado}><ShieldCheck /> Aprovar</Button>
          )}
          {c.status === "aprovada" && podeMontar && (
            <Button onClick={() => setConfirmar("receber")}><Truck /> Marcar como recebida</Button>
          )}
        </>} />

      <div className="space-y-4 p-5 sm:p-6">
        <Etapas atual={c.status} />
        {c.aprovada_por && c.aprovada_em && (
          <Faixa tom="brand" icone={ShieldCheck}>Aprovada por <strong>{c.aprovada_por}</strong> em {dataHora(c.aprovada_em)}.</Faixa>
        )}
        {c.status === "enviada" && podeAprovar && alterado && (
          <Faixa tom="warning" icone={ShieldCheck}>Salve os preços antes de aprovar.</Faixa>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card titulo={<span className="flex items-center gap-2">Itens <Badge variant={status.tom}>{status.rotulo}</Badge></span>}
            acao={editavel && alterado && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPrecos({})}>Descartar</Button>
                <Button size="sm" onClick={salvarPrecos} disabled={acoes.alterar.isPending || precoInvalido}>
                  {acoes.alterar.isPending ? "Salvando…" : "Salvar preços"}
                </Button>
              </div>
            )}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço unitário</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Último preço aprovado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.itens.map((i) => {
                  const p = mapa.get(i.produto_id)
                  const texto = precoDigitado(i.produto_id, i.preco)
                  const valor = lerQuantidade(texto)
                  return (
                    <TableRow key={i.produto_id}>
                      <TableCell className="min-w-48">
                        <p>{p?.nome ?? i.produto_id}</p>
                        <p className="text-xs text-muted-foreground">{p?.codigo}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{numero(i.quantidade)} {p?.medida}</TableCell>
                      <TableCell className="text-right">
                        {editavel ? (
                          <Input aria-label={`Preço de ${p?.nome ?? "produto"}`} inputMode="decimal" placeholder="0,00"
                            className="ml-auto h-9 w-28 text-right tabular-nums" value={texto} aria-invalid={valor === undefined}
                            onChange={(e) => setPrecos((at) => ({ ...at, [i.produto_id]: e.target.value }))} />
                        ) : <span className="tabular-nums">{reais(i.preco)}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{valor == null ? "—" : reais(valor * i.quantidade)}</TableCell>
                      <TableCell><UltimoPreco produtoId={i.produto_id} cotacaoId={c.id} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <p className="mt-3 text-right text-sm">Total: <strong className="tabular-nums">{reais(totalTela)}</strong></p>
          </Card>

          <div className="space-y-4">
            <Card titulo="Fornecedor e observação">
              <div className="space-y-4">
                <Campo rotulo="Fornecedor">
                  {(props) => (
                    <Select {...props} value={c.fornecedor_id ?? ""} disabled={!editavel || acoes.alterar.isPending}
                      placeholder="Escolha o fornecedor…"
                      onChange={(e) => acoes.alterar.mutate({ fornecedor_id: e.target.value || null }, { onError: erro })}>
                      {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </Select>
                  )}
                </Campo>
                <Observacao c={c} editavel={editavel} />
              </div>
            </Card>
            <Anexos c={c} />
            <Card titulo="Histórico" icone={History}>
              <ol className="space-y-3 border-l pl-4">
                {[...c.eventos].reverse().map((e, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand" />
                    <p>{e.descricao}</p>
                    <p className="text-xs text-muted-foreground">{e.autor} · {dataHora(e.data)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </div>

      {confirmar === "aprovar" && (
        <Confirmar titulo="Aprovar cotação" rotulo="Aprovar" pendente={acoes.aprovar.isPending} erro={acoes.aprovar.error?.message}
          descricao={`Aprovar a cotação nº ${c.numero}, no total de ${reais(c.total)}, com ${fornecedores.find((f) => f.id === c.fornecedor_id)?.nome ?? "fornecedor não escolhido"}? Seu nome e a data ficam registrados.`}
          onFechar={() => { acoes.aprovar.reset(); setConfirmar(null) }}
          onConfirmar={() => acoes.aprovar.mutate(undefined, { onSuccess: () => { setConfirmar(null); avisar("Cotação aprovada.") } })} />
      )}
      {confirmar === "receber" && (
        <Confirmar titulo="Marcar como recebida" rotulo="Confirmar recebimento" pendente={acoes.receber.isPending} erro={acoes.receber.error?.message}
          descricao={`Cada item vira uma entrada no estoque de ${nomeUnidade(c.unidade_id)}, com seu nome e a data de hoje. Confira se tudo chegou.`}
          onFechar={() => { acoes.receber.reset(); setConfirmar(null) }}
          onConfirmar={() => acoes.receber.mutate(undefined, { onSuccess: () => { setConfirmar(null); avisar("Recebida. Entradas registradas no estoque.") } })} />
      )}
    </>
  )
}

/** Linha de etapas: rascunho → enviada → aprovada → recebida, com a atual destacada. */
function Etapas({ atual }: { atual: Cotacao["status"] }) {
  const indice = ETAPAS_COTACAO.indexOf(atual)
  return (
    <ol aria-label="Etapas da cotação" className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      {ETAPAS_COTACAO.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2" aria-current={i === indice ? "step" : undefined}>
          {i > 0 && <span className={cn("h-px w-6 sm:w-10", i <= indice ? "bg-brand" : "bg-border")} />}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
            i < indice && "text-foreground",
            i === indice && "border-brand bg-brand font-medium text-brand-foreground",
            i > indice && "text-muted-foreground")}>
            {i < indice && <Check className="size-3" />} {STATUS_COTACAO[s].rotulo}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Último preço aprovado do produto em outra cotação (uma consulta por linha: aceitável nesta fase). */
function UltimoPreco({ produtoId, cotacaoId }: { produtoId: string; cotacaoId: string }) {
  const { data } = useProduto(produtoId)
  const ultimo = data?.precos.find((p) => p.cotacao_id !== cotacaoId)
  if (!ultimo) return <span className="text-xs text-muted-foreground">Primeira compra</span>
  return (
    <span className="text-xs">
      <span className="tabular-nums">{reais(ultimo.preco)}</span>
      <span className="block max-w-48 truncate text-muted-foreground">{ultimo.fornecedor} · {dataBR(ultimo.data)}</span>
    </span>
  )
}

function Observacao({ c, editavel }: { c: Cotacao; editavel: boolean }) {
  const [texto, setTexto] = useState(c.observacao)
  const { alterar } = useAcoesCotacao(c.id)
  const avisar = useToast()
  return (
    <Campo rotulo="Observação" ajuda={editavel ? "Salva ao sair do campo." : undefined}>
      {(p) => (
        <Textarea {...p} rows={3} value={texto} disabled={!editavel} onChange={(e) => setTexto(e.target.value)}
          onBlur={() => texto !== c.observacao && alterar.mutate({ observacao: texto }, {
            onSuccess: () => avisar("Observação salva."),
            onError: (e) => avisar(e.message, "erro"),
          })} />
      )}
    </Campo>
  )
}

function Anexos({ c }: { c: Cotacao }) {
  const { anexar } = useAcoesCotacao(c.id)
  const avisar = useToast()
  const [tipo, setTipo] = useState<TipoAnexo>(c.status === "aprovada" || c.status === "recebida" ? "nota_fiscal" : "proposta")
  const arquivo = useRef<HTMLInputElement>(null)

  const enviar = (f: File | undefined) => {
    if (!f) return
    anexar.mutate({ tipo, arquivo: f }, {
      onSuccess: () => avisar(`${NOME_ANEXO[tipo]} anexada.`),
      onError: (e) => avisar(e.message, "erro"),
      onSettled: () => { if (arquivo.current) arquivo.current.value = "" },
    })
  }

  return (
    <Card titulo="Anexos" icone={Paperclip}>
      {c.anexos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p> : (
        <ul className="space-y-2">
          {c.anexos.map((a) => (
            <li key={a.id} className="rounded-xl border p-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{NOME_ANEXO[a.tipo]}</Badge>
                <span className="min-w-0 truncate">{a.nome}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.autor} · {dataHora(a.enviado_em)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select aria-label="Tipo do anexo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAnexo)} className="h-9 w-40">
          {(Object.keys(NOME_ANEXO) as TipoAnexo[]).map((t) => <option key={t} value={t}>{NOME_ANEXO[t]}</option>)}
        </Select>
        <input ref={arquivo} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" aria-label="Arquivo do anexo"
          onChange={(e) => enviar(e.target.files?.[0])} />
        <Button variant="outline" size="sm" disabled={anexar.isPending} onClick={() => arquivo.current?.click()}>
          <Upload /> {anexar.isPending ? "Enviando…" : "Anexar arquivo"}
        </Button>
      </div>
    </Card>
  )
}
