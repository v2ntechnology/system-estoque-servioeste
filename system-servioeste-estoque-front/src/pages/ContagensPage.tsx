import { CalendarClock, ClipboardList, Play } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Barra } from "@/components/ui/barra"
import { Button } from "@/components/ui/button"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { useAbrirContagem, useContagens } from "@/features/contagens/api"
import { useNomeUnidade, usePode, useUnidades } from "@/features/sessao/api"
import { dataBR, dataHora } from "@/lib/format"
import { useUnidadeAtiva } from "@/lib/unidade"

/** Calendário de contagem por unidade e histórico das contagens (spec 001, RF-05). */
export function ContagensPage() {
  const { unidade } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const { data = [], isLoading, error, refetch } = useContagens(unidade)
  const nomeUnidade = useNomeUnidade()
  const podeContar = usePode("contagem.registrar")
  const abrir = useAbrirContagem()
  const avisar = useToast()
  const navigate = useNavigate()
  const visiveis = unidades.filter((u) => !unidade || u.id === unidade)

  const abrirContagem = (unidadeId: string) =>
    abrir.mutate({ unidade_id: unidadeId }, {
      onSuccess: (c) => navigate(`/contagens/${c.id}`),
      onError: (e) => avisar(e.message, "erro"),
    })

  return (
    <AppShell>
      <Cabecalho icone={ClipboardList} titulo="Contagens"
        descricao="Declaração de estoque de cada unidade. Campo vazio é “não contado”; zero só quando digitado." />
      <div className="space-y-6 p-5 sm:p-6">
        <section aria-label="Calendário de contagem" className="grid gap-3 md:grid-cols-3">
          {visiveis.map((u) => {
            const aberta = data.find((c) => c.unidade_id === u.id && c.situacao === "aberta")
            return (
              <div key={u.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">A cada {u.frequencia_dias} dia(s) · expediente até {u.encerramento}</p>
                  </div>
                  {u.atrasada ? <Badge variant="warning"><CalendarClock className="size-3" /> Atrasada</Badge> : <Badge variant="brand">Em dia</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Última: {dataBR(u.ultima_contagem)} · Próxima: <span className={u.atrasada ? "font-medium text-warning" : ""}>{dataBR(u.proxima_contagem)}</span>
                </p>
                {aberta ? (
                  <Link to={`/contagens/${aberta.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Continuar contagem ({aberta.contados}/{aberta.total})
                  </Link>
                ) : podeContar && (
                  <Button variant="outline" disabled={abrir.isPending} onClick={() => abrirContagem(u.id)}>
                    <Play /> Abrir contagem de hoje
                  </Button>
                )}
              </div>
            )
          })}
        </section>

        <section aria-label="Histórico de contagens" className="space-y-3">
          <h2 className="text-sm font-medium">Histórico</h2>
          {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
            : data.length === 0 ? <Vazio icone={ClipboardList} titulo="Nenhuma contagem ainda" descricao="Abra a primeira contagem pela unidade acima." />
            : (
              <div className="overflow-x-auto rounded-2xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {!unidade && <TableHead>Unidade</TableHead>}
                      <TableHead>Responsável</TableHead>
                      <TableHead className="min-w-40">Contados</TableHead>
                      <TableHead>Divergências</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contagens/${c.id}`)}>
                        <TableCell><Link to={`/contagens/${c.id}`} className="font-medium hover:underline">{dataBR(c.data)}</Link></TableCell>
                        {!unidade && <TableCell>{nomeUnidade(c.unidade_id)}</TableCell>}
                        <TableCell className="max-w-56 truncate">{c.responsavel}</TableCell>
                        <TableCell><Barra feitos={c.contados} total={c.total} /></TableCell>
                        <TableCell>{c.divergencias ? <Badge variant="warning">{c.divergencias}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {c.situacao === "aberta" ? <Badge variant="brand">Em andamento</Badge>
                            : <span className="text-xs text-muted-foreground">Finalizada {c.finalizada_em ? dataHora(c.finalizada_em) : ""}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </section>
      </div>
    </AppShell>
  )
}
