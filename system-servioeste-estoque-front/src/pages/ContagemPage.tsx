import {
  AlarmClock, AlertTriangle, Camera, CheckCircle2, ClipboardCheck, CloudOff, Loader2, MessageSquare, Search, X,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Barra } from "@/components/ui/barra"
import { Button } from "@/components/ui/button"
import { Faixa } from "@/components/ui/card"
import { Confirmar } from "@/components/ui/confirmar"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useMapaProdutos } from "@/features/catalogo/api"
import { enviarItens, useContagem, useFinalizarContagem } from "@/features/contagens/api"
import { adicionar, aplicarFila, confirmarEnvio, lerFila, minutosAte } from "@/features/contagens/fila"
import { useCategorias, useNomeUnidade, usePode, useUnidades } from "@/features/sessao/api"
import { ApiError } from "@/lib/api"
import { dataBR, dataHora, lerQuantidade, numero } from "@/lib/format"
import type { AlteracaoItem, Contagem, ItemContagem, Produto } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Envio = "salvo" | "enviando" | "sem_conexao"

/** Contagem de uma unidade (spec 001, história 2): feita no celular, guardada no aparelho e enviada em lote. */
export function ContagemPage() {
  const { id = "" } = useParams()
  const { data: contagem, isLoading, error, refetch } = useContagem(id)
  return (
    <AppShell>
      {contagem ? (contagem.situacao === "aberta" ? <ContagemAberta contagem={contagem} /> : <ContagemFinalizada contagem={contagem} />)
        : isLoading ? <Carregando /> : <ErroCarga mensagem={error?.message} onTentarDeNovo={() => refetch()} />}
    </AppShell>
  )
}

// ---------------------------------------------------------------- contagem aberta

function ContagemAberta({ contagem }: { contagem: Contagem }) {
  const { mapa } = useMapaProdutos()
  const { data: categorias = [] } = useCategorias()
  const { data: unidades = [] } = useUnidades()
  const nomeUnidade = useNomeUnidade()
  const podeContar = usePode("contagem.registrar")
  const finalizar = useFinalizarContagem(contagem.id)
  const avisar = useToast()
  const qc = useQueryClient()

  const [fila, setFila] = useState(() => lerFila(contagem.id))
  const [envio, setEnvio] = useState<Envio>(fila.length ? "sem_conexao" : "salvo")
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState("todas")
  const [soFaltam, setSoFaltam] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [agora, setAgora] = useState(() => new Date())
  const enviando = useRef(false)

  const itens = useMemo(() => aplicarFila(contagem.itens, fila), [contagem.itens, fila])
  const contados = itens.filter((i) => i.quantidade !== null).length
  const faltam = itens.length - contados
  const unidade = unidades.find((u) => u.id === contagem.unidade_id)

  // Envia a fila em lote. Erro de rede deixa tudo guardado e tenta de novo depois.
  const sincronizar = useCallback(async () => {
    const pendentes = lerFila(contagem.id)
    if (!pendentes.length || enviando.current) return true
    enviando.current = true
    setEnvio("enviando")
    try {
      const atualizada = await enviarItens(contagem.id, pendentes)
      qc.setQueryData(["contagens", "detalhe", contagem.id], atualizada)
      const restantes = confirmarEnvio(contagem.id, pendentes)
      setFila(restantes)
      setEnvio(restantes.length ? "enviando" : "salvo")
      return restantes.length === 0
    } catch (e) {
      setEnvio("sem_conexao")
      if (e instanceof ApiError && e.status !== 0) avisar(e.message, "erro")
      return false
    } finally {
      enviando.current = false
    }
  }, [contagem.id, avisar, qc])

  // Tenta enviar logo depois de cada alteração, a cada 10 s e quando a conexão volta.
  useEffect(() => {
    if (!fila.length) return
    const t = setTimeout(sincronizar, 700)
    return () => clearTimeout(t)
  }, [fila, sincronizar])
  useEffect(() => {
    const t = setInterval(() => { setAgora(new Date()); void sincronizar() }, 10_000)
    window.addEventListener("online", sincronizar)
    return () => {
      clearInterval(t)
      window.removeEventListener("online", sincronizar)
    }
  }, [sincronizar])

  const alterar = (alt: AlteracaoItem) => setFila(adicionar(contagem.id, alt))

  const minutos = unidade ? minutosAte(unidade.encerramento, agora) : null
  const avisoExpediente = faltam > 0 && minutos !== null && minutos <= 5 && minutos >= -60

  const visiveis = itens.filter((i) => {
    const p = mapa.get(i.produto_id)
    if (!p) return false
    if (soFaltam && i.quantidade !== null) return false
    if (categoria !== "todas" && p.categoria_id !== categoria) return false
    const t = busca.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    return !t || `${p.codigo} ${p.nome}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(t)
  })

  async function concluir() {
    const ok = await sincronizar()
    if (!ok) {
      setConfirmar(false)
      avisar("Sem conexão: as quantidades estão guardadas neste aparelho. Finalize quando o sinal voltar.", "erro")
      return
    }
    finalizar.mutate(undefined, {
      onSuccess: (c) => {
        setConfirmar(false)
        avisar(c.divergencias ? `Contagem finalizada com ${c.divergencias} divergência(s) para conferir.` : "Contagem finalizada.")
      },
      onError: (e) => avisar(e.message, "erro"),
    })
  }

  return (
    <>
      <Cabecalho icone={ClipboardCheck} titulo={`Contagem · ${nomeUnidade(contagem.unidade_id)}`}
        descricao={`${dataBR(contagem.data)} · ${contagem.responsavel}`}
        acoes={<StatusEnvio envio={envio} pendentes={fila.length} />} />

      <div className="space-y-3 p-3 pb-28 sm:p-6 sm:pb-28">
        {envio === "sem_conexao" && (
          <Faixa tom="warning" icone={CloudOff}>
            <p className="font-medium">Sem conexão: as quantidades ficam guardadas neste aparelho.</p>
            <p className="text-muted-foreground">{fila.length} alteração(ões) serão enviadas sozinhas quando o sinal voltar. Pode continuar contando.</p>
          </Faixa>
        )}
        {avisoExpediente && unidade && (
          <Faixa tom="destructive" icone={AlarmClock}>
            <p className="font-medium">O expediente termina às {unidade.encerramento} e faltam {faltam} item(ns) sem contagem.</p>
            <p>Conte os que faltam ou finalize deixando-os como “não contado”.</p>
          </Faixa>
        )}

        <div className="sticky top-0 z-10 -mx-3 space-y-2 bg-card/95 px-3 py-2 backdrop-blur sm:mx-0 sm:px-0">
          <Barra feitos={contados} total={itens.length} />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou código" className="pl-9" aria-label="Buscar produto" />
            </div>
            <Button variant={soFaltam ? "default" : "outline"} onClick={() => setSoFaltam((v) => !v)} aria-pressed={soFaltam}>
              Faltam {faltam}
            </Button>
          </div>
          <Tabs value={categoria} onChange={setCategoria}
            abas={[{ value: "todas", label: "Todas" }, ...categorias.map((c) => ({ value: c.id, label: c.nome }))]} />
        </div>

        {visiveis.length === 0 ? <Vazio icone={Search} titulo={soFaltam ? "Tudo contado neste filtro" : "Nenhum produto encontrado"} /> : (
          <ul className="space-y-2">
            {visiveis.map((i) => (
              <LinhaContagem key={i.produto_id} item={i} produto={mapa.get(i.produto_id)!} desabilitado={!podeContar} onAlterar={alterar} />
            ))}
          </ul>
        )}
      </div>

      {podeContar && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-card/95 p-3 backdrop-blur sm:px-6">
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{contados}</span> de {itens.length} contados</p>
          <Button onClick={() => (faltam ? setConfirmar(true) : void concluir())} disabled={finalizar.isPending || contados === 0}>
            <CheckCircle2 /> Finalizar contagem
          </Button>
        </div>
      )}

      {confirmar && (
        <Confirmar titulo="Finalizar com itens sem contagem?" rotulo="Finalizar assim mesmo" pendente={finalizar.isPending}
          descricao={`Ficam ${faltam} item(ns) sem contagem. Eles não viram zero: continuam como “não contado” e o saldo deles não muda.`}
          onConfirmar={() => void concluir()} onFechar={() => setConfirmar(false)} />
      )}
    </>
  )
}

function StatusEnvio({ envio, pendentes }: { envio: Envio; pendentes: number }) {
  if (envio === "enviando") return <Badge variant="outline"><Loader2 className="size-3 animate-spin" /> Salvando…</Badge>
  if (envio === "sem_conexao") return <Badge variant="warning"><CloudOff className="size-3" /> {pendentes} guardada(s) no aparelho</Badge>
  return <Badge variant="brand"><CheckCircle2 className="size-3" /> Tudo salvo</Badge>
}

function LinhaContagem({ item, produto, desabilitado, onAlterar }: {
  item: ItemContagem
  produto: Produto
  desabilitado: boolean
  onAlterar: (alt: AlteracaoItem) => void
}) {
  const [texto, setTexto] = useState(item.quantidade === null ? "" : String(item.quantidade).replace(".", ","))
  const [invalido, setInvalido] = useState(false)
  const [obsAberta, setObsAberta] = useState(!!item.observacao)
  const foto = useRef<HTMLInputElement>(null)

  function mudar(v: string) {
    setTexto(v)
    const q = lerQuantidade(v)
    setInvalido(q === undefined)
    // Vazio vira null ("não contado"), nunca zero (constituição, princípio VIII).
    if (q !== undefined) onAlterar({ produto_id: item.produto_id, quantidade: q })
  }

  const somarEmbalagem = () => {
    if (!produto.embalagem) return
    mudar(String((lerQuantidade(texto) ?? 0) + produto.embalagem.quantidade).replace(".", ","))
  }

  return (
    <li className={cn("rounded-2xl border bg-background p-3", item.quantidade === null ? "" : "border-brand/40")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{produto.nome}</p>
          <p className="text-xs text-muted-foreground">
            {produto.codigo} · {produto.medida}
            {produto.embalagem && <> · 1 {produto.embalagem.nome} = {produto.embalagem.quantidade} {produto.medida}</>}
          </p>
        </div>
        <div className="w-28 shrink-0">
          <Input inputMode="decimal" enterKeyHint="next" value={texto} disabled={desabilitado}
            onChange={(e) => mudar(e.target.value)} placeholder="Não contado" aria-label={`Quantidade de ${produto.nome}`}
            aria-invalid={invalido} className={cn("h-12 text-right text-lg tabular-nums placeholder:text-xs", invalido && "border-destructive")} />
        </div>
      </div>
      {invalido && <p role="alert" className="mt-1 text-right text-xs text-destructive">Use só números (ex.: 12 ou 1,5).</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {produto.embalagem && !desabilitado && (
          <Button size="sm" variant="ghost" onClick={somarEmbalagem}>+1 {produto.embalagem.nome}</Button>
        )}
        {!desabilitado && texto !== "" && (
          <Button size="sm" variant="ghost" onClick={() => mudar("")}><X /> Limpar</Button>
        )}
        <span className="flex-1" />
        <Button size="sm" variant={obsAberta ? "outline" : "ghost"} onClick={() => setObsAberta((v) => !v)} disabled={desabilitado && !item.observacao}>
          <MessageSquare /> Obs.
        </Button>
        <Button size="sm" variant={item.foto ? "outline" : "ghost"} onClick={() => foto.current?.click()} disabled={desabilitado}>
          <Camera /> {item.foto ? "Trocar foto" : "Foto"}
        </Button>
        <input ref={foto} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAlterar({ produto_id: item.produto_id, foto: f.name }) }} />
      </div>
      {item.foto && <p className="mt-1 truncate text-xs text-muted-foreground"><Camera className="mr-1 inline size-3" />{item.foto}</p>}
      {obsAberta && (
        <Textarea className="mt-2" rows={2} defaultValue={item.observacao} disabled={desabilitado} placeholder="Ex.: 2 caixas amassadas"
          aria-label={`Observação de ${produto.nome}`} onBlur={(e) => e.target.value !== item.observacao && onAlterar({ produto_id: item.produto_id, observacao: e.target.value })} />
      )}
    </li>
  )
}

// ---------------------------------------------------------------- contagem finalizada (só leitura: princípio IX)

function ContagemFinalizada({ contagem }: { contagem: Contagem }) {
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()
  const [filtro, setFiltro] = useState<"todos" | "contados" | "nao_contados" | "com_obs">("todos")
  const nome = (id: string) => mapa.get(id)?.nome ?? "…"
  const lista = contagem.itens.filter((i) =>
    filtro === "todos" || (filtro === "contados" ? i.quantidade !== null : filtro === "nao_contados" ? i.quantidade === null : !!i.observacao || !!i.foto))

  return (
    <>
      <Cabecalho icone={ClipboardCheck} titulo={`Contagem · ${nomeUnidade(contagem.unidade_id)}`}
        descricao={`${dataBR(contagem.data)} · ${contagem.responsavel} · finalizada ${contagem.finalizada_em ? dataHora(contagem.finalizada_em) : ""}`}
        acoes={<Link to="/contagens" className="text-sm text-muted-foreground hover:text-foreground">Voltar às contagens</Link>} />
      <div className="space-y-4 p-5 sm:p-6">
        <Barra feitos={contagem.contados} total={contagem.total} />
        {contagem.lista_divergencias.length > 0 ? (
          <section className="space-y-2 rounded-2xl border border-warning/40 bg-background p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-warning" /> Divergências para conferir</h2>
            <p className="text-xs text-muted-foreground">Queda maior que a explicada pelas saídas registradas desde a contagem anterior.</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead><TableHead className="text-right">Anterior</TableHead><TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead><TableHead className="text-right">Esperado</TableHead><TableHead className="text-right">Contado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contagem.lista_divergencias.map((d) => (
                    <TableRow key={d.produto_id}>
                      <TableCell><Link to={`/catalogo/${d.produto_id}`} className="hover:underline">{nome(d.produto_id)}</Link></TableCell>
                      <TableCell className="text-right tabular-nums">{numero(d.anterior)}</TableCell>
                      <TableCell className="text-right tabular-nums">+{numero(d.entradas)}</TableCell>
                      <TableCell className="text-right tabular-nums">−{numero(d.saidas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{numero(d.esperado)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-warning">{numero(d.contado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : <Faixa tom="brand" icone={CheckCircle2}>Nenhuma divergência: as quedas batem com as saídas registradas.</Faixa>}

        <Tabs value={filtro} onChange={setFiltro} abas={[
          { value: "todos", label: "Todos", count: contagem.total },
          { value: "contados", label: "Contados", count: contagem.contados },
          { value: "nao_contados", label: "Não contados", count: contagem.total - contagem.contados },
          { value: "com_obs", label: "Com observação ou foto", count: contagem.itens.filter((i) => i.observacao || i.foto).length },
        ]} />
        <div className="overflow-x-auto rounded-2xl border bg-background">
          <Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
            <TableBody>
              {lista.map((i) => (
                <TableRow key={i.produto_id}>
                  <TableCell>{nome(i.produto_id)} <span className="text-xs text-muted-foreground">{mapa.get(i.produto_id)?.medida}</span></TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.quantidade === null ? <span className="text-xs text-muted-foreground">Não contado</span> : numero(i.quantidade)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.observacao}{i.foto && <span className="ml-1 inline-flex items-center gap-1"><Camera className="size-3" />{i.foto}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
