import { BookmarkPlus, FilePlus2, Lightbulb, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Campo } from "@/components/form/Campo"
import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { useMapaProdutos, useProdutos } from "@/features/catalogo/api"
import { useCriarCotacao, useModelos, useSalvarModelo, useSugestoes } from "@/features/cotacoes/api"
import { useUnidades } from "@/features/sessao/api"
import { lerQuantidade, numero } from "@/lib/format"
import { useUnidadeAtiva } from "@/lib/unidade"

type Origem = "sugestoes" | "modelo" | "catalogo"
type Linha = { produto_id: string; quantidade: string }

/** Monta uma cotação nova a partir das sugestões, de um modelo salvo ou do catálogo. */
export function CotacaoNovaPage() {
  const navigate = useNavigate()
  const avisar = useToast()
  const { unidade: ativa } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const [unidadeEscolhida, setUnidade] = useState("")
  const unidadeId = unidadeEscolhida || ativa || unidades[0]?.id || ""
  const [titulo, setTitulo] = useState("")
  const [origem, setOrigem] = useState<Origem>("sugestoes")
  const [itens, setItens] = useState<Linha[]>([])
  const [erroTitulo, setErroTitulo] = useState<string>()
  const [modeloAberto, setModeloAberto] = useState(false)
  const { mapa } = useMapaProdutos()
  const criar = useCriarCotacao()

  /** Acrescenta itens; produto já na lista fica com a maior quantidade. */
  const adicionar = (novos: { produto_id: string; quantidade: number }[]) => {
    setItens((atual) => {
      const lista = [...atual]
      for (const n of novos) {
        const i = lista.findIndex((l) => l.produto_id === n.produto_id)
        if (i === -1) lista.push({ produto_id: n.produto_id, quantidade: String(n.quantidade) })
        else lista[i] = { ...lista[i], quantidade: String(Math.max(Number(lerQuantidade(lista[i].quantidade) ?? 0), n.quantidade)) }
      }
      return lista
    })
  }

  const itensValidos = itens.map((l) => ({ produto_id: l.produto_id, quantidade: lerQuantidade(l.quantidade) }))
  const invalido = itensValidos.some((i) => i.quantidade == null || i.quantidade <= 0)

  const salvar = () => {
    if (!titulo.trim()) {
      setErroTitulo("Dê um título à cotação.")
      return
    }
    if (invalido) {
      avisar("Toda quantidade precisa ser um número maior que zero.", "erro")
      return
    }
    criar.mutate(
      { titulo: titulo.trim(), unidade_id: unidadeId, itens: itensValidos.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade!, preco: null })) },
      {
        onSuccess: (c) => {
          avisar(`Cotação nº ${c.numero} criada como rascunho.`)
          navigate(`/cotacoes/${c.id}`)
        },
        onError: (e) => avisar(e.message, "erro"),
      },
    )
  }

  return (
    <AppShell>
      <Cabecalho icone={FilePlus2} titulo="Nova cotação"
        descricao="Escolha os produtos pelas sugestões, por um modelo ou pelo catálogo. A cotação começa como rascunho."
        acoes={<>
          <Button variant="outline" onClick={() => navigate("/cotacoes")}>Cancelar</Button>
          <Button onClick={salvar} disabled={criar.isPending || itens.length === 0}>
            {criar.isPending ? "Salvando…" : "Criar cotação"}
          </Button>
        </>} />
      <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Título" erro={erroTitulo}>
                {(p) => <Input {...p} value={titulo} placeholder="Ex.: Material de limpeza — novembro"
                  onChange={(e) => { setTitulo(e.target.value); setErroTitulo(undefined) }} />}
              </Campo>
              <Campo rotulo="Unidade">
                {(p) => (
                  <Select {...p} value={unidadeId} onChange={(e) => setUnidade(e.target.value)}>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </Select>
                )}
              </Campo>
            </div>
          </Card>

          <Tabs value={origem} onChange={setOrigem} abas={[
            { value: "sugestoes", label: "Sugestões" },
            { value: "modelo", label: "Modelo" },
            { value: "catalogo", label: "Catálogo" },
          ]} />
          {origem === "sugestoes" && <OrigemSugestoes unidade={unidadeId} nome={(id) => mapa.get(id)?.nome ?? id} onAdicionar={adicionar} />}
          {origem === "modelo" && <OrigemModelo nome={(id) => mapa.get(id)?.nome ?? id} onAdicionar={adicionar} />}
          {origem === "catalogo" && <OrigemCatalogo onAdicionar={(id) => adicionar([{ produto_id: id, quantidade: mapa.get(id)?.embalagem?.quantidade ?? 1 }])} />}
        </div>

        <Card titulo={`Itens da cotação (${itens.length})`} icone={FilePlus2}
          acao={itens.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setModeloAberto(true)} disabled={invalido}>
              <BookmarkPlus /> Salvar como modelo
            </Button>
          )}>
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item ainda. Adicione pelas sugestões, por um modelo ou pelo catálogo.</p>
          ) : (
            <ul className="space-y-2">
              {itens.map((l, i) => {
                const p = mapa.get(l.produto_id)
                const q = lerQuantidade(l.quantidade)
                return (
                  <li key={l.produto_id} className="flex items-center gap-2 rounded-xl border p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{p?.nome ?? l.produto_id}</p>
                      <p className="text-xs text-muted-foreground">{p?.codigo} · {p?.medida}{p?.embalagem && ` · ${p.embalagem.nome} com ${p.embalagem.quantidade}`}</p>
                    </div>
                    <Input aria-label={`Quantidade de ${p?.nome ?? "produto"}`} inputMode="decimal" className="h-9 w-24 text-right tabular-nums"
                      aria-invalid={q == null || q <= 0} value={l.quantidade}
                      onChange={(e) => setItens((at) => at.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} />
                    <Button variant="ghost" size="icon" aria-label={`Remover ${p?.nome ?? "produto"}`}
                      onClick={() => setItens((at) => at.filter((_, j) => j !== i))}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {modeloAberto && (
        <DialogoModelo itens={itensValidos.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade! }))}
          onFechar={() => setModeloAberto(false)} />
      )}
    </AppShell>
  )
}

function OrigemSugestoes({ unidade, nome, onAdicionar }: {
  unidade: string
  nome: (id: string) => string
  onAdicionar: (itens: { produto_id: string; quantidade: number }[]) => void
}) {
  const { data = [], isLoading, error, refetch } = useSugestoes(unidade)
  // Todos marcados por padrão: guarda só os desmarcados.
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const marcados = data.filter((s) => !desmarcados.has(s.produto_id))
  const alternar = (id: string) => setDesmarcados((d) => {
    const n = new Set(d)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  if (isLoading) return <Carregando />
  if (error) return <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
  if (data.length === 0) return <Vazio icone={Lightbulb} titulo="Nada abaixo do mínimo" descricao="Nenhum produto desta unidade está abaixo do estoque mínimo." />

  return (
    <Card titulo="Abaixo do mínimo" icone={Lightbulb}
      acao={<Button size="sm" disabled={marcados.length === 0}
        onClick={() => onAdicionar(marcados.map((s) => ({ produto_id: s.produto_id, quantidade: s.sugerido })))}>
        <Plus /> Adicionar {marcados.length}
      </Button>}>
      <p className="mb-3 text-xs text-muted-foreground">Sugerido = mínimo + consumo de um mês − saldo, arredondado para a embalagem.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"><span className="sr-only">Incluir</span></TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-right">Consumo/mês</TableHead>
            <TableHead className="text-right">Sugerido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s) => (
            <TableRow key={s.produto_id}>
              <TableCell><Checkbox aria-label={`Incluir ${nome(s.produto_id)}`} checked={!desmarcados.has(s.produto_id)} onChange={() => alternar(s.produto_id)} /></TableCell>
              <TableCell className="min-w-48">{nome(s.produto_id)}</TableCell>
              <TableCell className="text-right tabular-nums text-warning">{numero(s.saldo)}</TableCell>
              <TableCell className="text-right tabular-nums">{numero(s.minimo)}</TableCell>
              <TableCell className="text-right tabular-nums">{numero(s.consumo_mensal)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{numero(s.sugerido)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function OrigemModelo({ nome, onAdicionar }: {
  nome: (id: string) => string
  onAdicionar: (itens: { produto_id: string; quantidade: number }[]) => void
}) {
  const { data = [], isLoading, error, refetch } = useModelos()
  const [id, setId] = useState("")
  const modelo = data.find((m) => m.id === id)

  if (isLoading) return <Carregando />
  if (error) return <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
  if (data.length === 0) return <Vazio titulo="Nenhum modelo salvo" descricao="Monte uma cotação e use “Salvar como modelo”." />

  return (
    <Card titulo="Modelos de cotação" icone={BookmarkPlus}>
      <div className="flex flex-wrap items-end gap-2">
        <Campo rotulo="Modelo" className="min-w-56 flex-1">
          {(p) => (
            <Select {...p} value={id} onChange={(e) => setId(e.target.value)} placeholder="Escolha um modelo…">
              {data.map((m) => <option key={m.id} value={m.id}>{`${m.nome} (${m.itens.length} itens)`}</option>)}
            </Select>
          )}
        </Campo>
        <Button disabled={!modelo} onClick={() => modelo && onAdicionar(modelo.itens)}><Plus /> Carregar itens</Button>
      </div>
      {modelo && (
        <ul className="mt-4 space-y-1 text-sm">
          {modelo.itens.map((i) => (
            <li key={i.produto_id} className="flex justify-between gap-3 border-b py-1.5 last:border-0">
              <span className="min-w-0 truncate">{nome(i.produto_id)}</span>
              <span className="tabular-nums text-muted-foreground">{numero(i.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function OrigemCatalogo({ onAdicionar }: { onAdicionar: (id: string) => void }) {
  const [busca, setBusca] = useState("")
  const { data = [], isLoading, error, refetch } = useProdutos({ busca })
  return (
    <Card titulo="Catálogo" icone={Search}>
      <Input aria-label="Buscar produto" placeholder="Buscar por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} /> : (
        <ul className="mt-3 space-y-1.5">
          {data.slice(0, 12).map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.codigo} · {p.medida}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onAdicionar(p.id)}><Plus /> Adicionar</Button>
            </li>
          ))}
          {data.length === 0 && <li className="text-sm text-muted-foreground">Nenhum produto encontrado.</li>}
          {data.length > 12 && <li className="text-xs text-muted-foreground">Mostrando 12 de {data.length}. Refine a busca.</li>}
        </ul>
      )}
    </Card>
  )
}

function DialogoModelo({ itens, onFechar }: { itens: { produto_id: string; quantidade: number }[]; onFechar: () => void }) {
  const [nome, setNome] = useState("")
  const salvar = useSalvarModelo()
  const avisar = useToast()
  return (
    <Dialog open onClose={onFechar} title="Salvar como modelo"
      description={`Os ${itens.length} itens e quantidades ficam guardados para as próximas cotações.`}
      footer={<>
        <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button disabled={salvar.isPending || !nome.trim()}
          onClick={() => salvar.mutate({ nome, itens }, {
            onSuccess: () => { avisar("Modelo salvo."); onFechar() },
            onError: (e) => avisar(e.message, "erro"),
          })}>
          {salvar.isPending ? "Salvando…" : "Salvar modelo"}
        </Button>
      </>}>
      <Campo rotulo="Nome do modelo">
        {(p) => <Input {...p} value={nome} placeholder="Ex.: Material de limpeza" onChange={(e) => setNome(e.target.value)} />}
      </Campo>
    </Dialog>
  )
}
