import { Package, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProdutos } from "@/features/catalogo/api"
import { saldoEMinimo, textoEmbalagem } from "@/features/catalogo/util"
import { useCategorias, useEu } from "@/features/sessao/api"
import { numero } from "@/lib/format"
import { useUnidadeAtiva } from "@/lib/unidade"

export function CatalogoPage() {
  const [texto, setTexto] = useState("")
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState("")
  const { unidade } = useUnidadeAtiva()
  const { data: eu } = useEu()
  const { data: categorias = [] } = useCategorias()
  const { data, isLoading, error, refetch } = useProdutos({ busca, categoria })
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setBusca(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])

  const unidades = unidade ? [unidade] : eu?.unidades ?? []
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—"

  return (
    <AppShell>
      <Cabecalho icone={Package} titulo="Catálogo" descricao="Produtos de todas as unidades, com saldo e mínimo da unidade escolhida no topo." />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar produto" placeholder="Buscar por nome ou código" value={texto} onChange={(e) => setTexto(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="sm:w-56">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>

        <div className="rounded-2xl border bg-background">
          {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
            : !data?.length ? <Vazio icone={Package} titulo="Nenhum produto encontrado" descricao="Tente outra busca ou categoria." />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Medida</TableHead>
                    <TableHead>Embalagem</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => {
                    const { saldo, minimo } = saldoEMinimo(p, unidades)
                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/catalogo/${p.id}`)}>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell className="min-w-56 font-medium">{p.nome}</TableCell>
                        <TableCell>{nomeCategoria(p.categoria_id)}</TableCell>
                        <TableCell>{p.medida}</TableCell>
                        <TableCell className="whitespace-nowrap">{textoEmbalagem(p)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(saldo)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(minimo)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {saldo !== null && saldo < minimo && <Badge variant="warning">Abaixo do mínimo</Badge>}
                            {p.controla_validade && <Badge variant="outline">Validade</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
        </div>
      </div>
    </AppShell>
  )
}
