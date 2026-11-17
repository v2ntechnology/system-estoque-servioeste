import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlarmClock, Building2 } from "lucide-react"
import { useState } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Faixa } from "@/components/ui/card"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { useUnidades } from "@/features/sessao/api"
import { patch } from "@/lib/api"
import { dataBR } from "@/lib/format"
import type { Unidade } from "@/lib/tipos"

function LinhaUnidade({ u }: { u: Unidade }) {
  const qc = useQueryClient()
  const avisar = useToast()
  const [encerramento, setEncerramento] = useState(u.encerramento)
  const [frequencia, setFrequencia] = useState(String(u.frequencia_dias))
  const salvar = useMutation({
    mutationFn: () => patch<Unidade>(`/unidades/${u.id}`, { encerramento, frequencia_dias: Number(frequencia) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidades"] })
      qc.invalidateQueries({ queryKey: ["painel"] })
      avisar(`${u.nome}: alterações salvas.`)
    },
    onError: (e) => avisar(e.message, "erro"),
  })
  const freqInvalida = !/^\d+$/.test(frequencia) || Number(frequencia) < 1
  const mudou = encerramento !== u.encerramento || frequencia !== String(u.frequencia_dias)

  return (
    <TableRow>
      <TableCell className="font-medium">{u.nome}</TableCell>
      <TableCell>
        <Input type="time" aria-label={`Encerramento de ${u.nome}`} value={encerramento} onChange={(e) => setEncerramento(e.target.value)} className="h-8 w-28" />
      </TableCell>
      <TableCell>
        <Input type="number" min={1} inputMode="numeric" aria-label={`Frequência de contagem de ${u.nome}`} aria-invalid={freqInvalida}
          value={frequencia} onChange={(e) => setFrequencia(e.target.value)} className="h-8 w-20" />
      </TableCell>
      <TableCell className="whitespace-nowrap">{dataBR(u.ultima_contagem)}</TableCell>
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-2">{dataBR(u.proxima_contagem)} {u.atrasada && <Badge variant="warning">Atrasada</Badge>}</span>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" disabled={!mudou || freqInvalida || salvar.isPending} onClick={() => salvar.mutate()}>Salvar</Button>
      </TableCell>
    </TableRow>
  )
}

export function UnidadesPage() {
  const { data, isLoading, error, refetch } = useUnidades()
  return (
    <AppShell>
      <Cabecalho icone={Building2} titulo="Unidades" descricao="Horário de encerramento do expediente e calendário de contagem de cada unidade." />
      <div className="space-y-4 p-5 sm:p-6">
        <Faixa icone={AlarmClock}>
          <p>O horário de encerramento é usado no aviso de contagem pendente: 5 minutos antes, quem está contando é avisado se
            ainda houver itens sem contagem. A frequência define quando a próxima contagem vence.</p>
        </Faixa>
        <div className="rounded-2xl border bg-background">
          {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
            : !data?.length ? <Vazio icone={Building2} titulo="Nenhuma unidade" />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Encerramento</TableHead>
                    <TableHead>Contar a cada (dias)</TableHead>
                    <TableHead>Última contagem</TableHead>
                    <TableHead>Próxima</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => <LinhaUnidade key={`${u.id}-${u.encerramento}-${u.frequencia_dias}`} u={u} />)}
                </TableBody>
              </Table>
            )}
        </div>
      </div>
    </AppShell>
  )
}
