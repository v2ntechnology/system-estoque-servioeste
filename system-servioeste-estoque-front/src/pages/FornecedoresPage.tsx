import { Phone, Plus, Search, Truck } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Campo } from "@/components/form/Campo"
import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useCotacoesDoFornecedor, useCriarFornecedor, useFornecedores } from "@/features/cotacoes/api"
import { useCategorias, useNomeUnidade, usePode } from "@/features/sessao/api"
import { dataBR, reais, STATUS_COTACAO } from "@/lib/format"
import type { Fornecedor } from "@/lib/tipos"

const sem = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

/** Cadastro de fornecedores, com as cotações e os valores de cada um. */
export function FornecedoresPage() {
  const { data = [], isLoading, error, refetch } = useFornecedores()
  const { data: categorias = [] } = useCategorias()
  const podeCriar = usePode("cotacao.montar")
  const [busca, setBusca] = useState("")
  const [novo, setNovo] = useState(false)
  const [aberto, setAberto] = useState<Fornecedor | null>(null)
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? id
  const lista = data.filter((f) => !busca || sem(`${f.nome} ${f.contato}`).includes(sem(busca)))

  return (
    <AppShell>
      <Cabecalho icone={Truck} titulo="Fornecedores" descricao="Quem fornece cada categoria e quanto foi pago nas últimas compras."
        acoes={podeCriar && <Button onClick={() => setNovo(true)}><Plus /> Novo fornecedor</Button>} />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar fornecedor" placeholder="Buscar por nome ou contato…" className="pl-9"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : lista.length === 0 ? <Vazio icone={Truck} titulo="Nenhum fornecedor" descricao={busca ? "Nada encontrado com essa busca." : undefined} />
          : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => setAberto(f)}
                    className="h-full w-full rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-accent">
                    <p className="font-medium">{f.nome}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="size-3.5" /> {f.contato} · {f.telefone}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {f.categorias.map((c) => <Badge key={c} variant="brand">{nomeCategoria(c)}</Badge>)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      {novo && <NovoFornecedor onFechar={() => setNovo(false)} />}
      {aberto && <CotacoesDoFornecedor fornecedor={aberto} onFechar={() => setAberto(null)} />}
    </AppShell>
  )
}

function NovoFornecedor({ onFechar }: { onFechar: () => void }) {
  const { data: categorias = [] } = useCategorias()
  const criar = useCriarFornecedor()
  const avisar = useToast()
  const [dados, setDados] = useState({ nome: "", contato: "", telefone: "", categorias: [] as string[] })
  const [erroNome, setErroNome] = useState<string>()

  const salvar = () => {
    if (!dados.nome.trim()) {
      setErroNome("Informe o nome do fornecedor.")
      return
    }
    criar.mutate(dados, {
      onSuccess: (f) => { avisar(`${f.nome} cadastrado.`); onFechar() },
      onError: (e) => avisar(e.message, "erro"),
    })
  }

  return (
    <Dialog open onClose={onFechar} title="Novo fornecedor"
      footer={<>
        <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button onClick={salvar} disabled={criar.isPending}>{criar.isPending ? "Salvando…" : "Cadastrar"}</Button>
      </>}>
      <div className="space-y-4">
        <Campo rotulo="Nome" erro={erroNome}>
          {(p) => <Input {...p} value={dados.nome} onChange={(e) => { setDados({ ...dados, nome: e.target.value }); setErroNome(undefined) }} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Contato">
            {(p) => <Input {...p} value={dados.contato} onChange={(e) => setDados({ ...dados, contato: e.target.value })} />}
          </Campo>
          <Campo rotulo="Telefone">
            {(p) => <Input {...p} type="tel" placeholder="(21) 90000-0000" value={dados.telefone}
              onChange={(e) => setDados({ ...dados, telefone: e.target.value })} />}
          </Campo>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Categorias fornecidas</legend>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={dados.categorias.includes(c.id)}
                  onChange={(e) => setDados({
                    ...dados,
                    categorias: e.target.checked ? [...dados.categorias, c.id] : dados.categorias.filter((x) => x !== c.id),
                  })} />
                {c.nome}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  )
}

function CotacoesDoFornecedor({ fornecedor, onFechar }: { fornecedor: Fornecedor; onFechar: () => void }) {
  const { data = [], isLoading, error, refetch } = useCotacoesDoFornecedor(fornecedor.id)
  const nomeUnidade = useNomeUnidade()
  const aprovado = data.filter((c) => c.status === "aprovada" || c.status === "recebida").reduce((s, c) => s + (c.total ?? 0), 0)
  return (
    <Dialog open onClose={onFechar} title={fornecedor.nome} description={`${fornecedor.contato} · ${fornecedor.telefone}`} className="max-w-2xl">
      {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
        : data.length === 0 ? <Vazio titulo="Nenhuma cotação com este fornecedor" />
        : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {data.length} cotação(ões) · total aprovado <strong className="text-foreground">{reais(aprovado)}</strong>
            </p>
            <ul className="space-y-2">
              {data.map((c) => (
                <li key={c.id}>
                  <Link to={`/cotacoes/${c.id}`} className="block rounded-xl border p-3 hover:bg-accent">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">nº {c.numero} · {c.titulo}</p>
                      <Badge variant={STATUS_COTACAO[c.status].tom}>{STATUS_COTACAO[c.status].rotulo}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nomeUnidade(c.unidade_id)} · {c.itens_qtd} itens · {reais(c.total)} · {dataBR(c.criada_em)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
    </Dialog>
  )
}
