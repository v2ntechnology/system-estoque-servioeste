import { ArrowDownRight, ArrowUpRight, BarChart3, Download, Mail, Minus } from "lucide-react"
import { useState } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { Cabecalho } from "@/components/layout/Cabecalho"
import { Button } from "@/components/ui/button"
import { Faixa, Kpi } from "@/components/ui/card"
import { Carregando, ErroCarga, Vazio } from "@/components/ui/estados"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMapaProdutos } from "@/features/catalogo/api"
import { useRelatorioMensal } from "@/features/relatorios/api"
import { useNomeUnidade, useUnidades } from "@/features/sessao/api"
import { hojeIso, mesPorExtenso, numero, reais } from "@/lib/format"
import type { RelatorioMensal } from "@/lib/tipos"
import { useUnidadeAtiva } from "@/lib/unidade"
import { cn } from "@/lib/utils"

/** Últimos 6 meses ("AAAA-MM"), do atual para trás. */
function ultimosMeses(n = 6) {
  const [a, m] = hojeIso().split("-").map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 15))
    return d.toISOString().slice(0, 7)
  })
}

const variacao = (atual: number, anterior: number) => (anterior ? Math.round(((atual - anterior) / anterior) * 100) : null)

function Variacao({ atual, anterior }: { atual: number | null; anterior: number | null }) {
  if (atual === null || anterior === null) return <span className="text-muted-foreground">—</span>
  const d = atual - anterior
  const Icone = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", d > 0 && "text-brand", d < 0 && "text-warning", d === 0 && "text-muted-foreground")}>
      <Icone className="size-3.5" /> {d > 0 ? "+" : ""}{numero(d)}
    </span>
  )
}

/**
 * Exporta o relatório como CSV (";" e BOM UTF-8, para o Excel abrir com acentos).
 * Provisório da spec 001: o .xlsx de verdade vem do back-end (pandas + openpyxl).
 */
function exportarCsv(r: RelatorioMensal, nomeUnidade: string, nomeProduto: (id: string) => string) {
  const celula = (v: string | number | null) => {
    const t = v === null ? "" : typeof v === "number" ? String(v).replace(".", ",") : v
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const linhas = [
    ["Produto", "Saldo no início", "Entradas", "Saídas", "Saldo no fim", "Saldo no fim do mês anterior"],
    ...r.linhas.map((l) => [nomeProduto(l.produto_id), l.saldo_inicial, l.entradas, l.saidas, l.saldo_final, l.saldo_mes_anterior]),
  ]
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  const slug = nomeUnidade.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "-")
  a.href = url
  a.download = `relatorio-${slug}-${r.mes}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function RelatoriosPage() {
  const { unidade: ativa } = useUnidadeAtiva()
  const { data: unidades = [] } = useUnidades()
  const nomeUnidade = useNomeUnidade()
  const meses = ultimosMeses()
  const [escolhida, setUnidade] = useState("")
  const [mes, setMes] = useState(meses[0])
  const unidade = escolhida || ativa || unidades[0]?.id || ""
  const { data: r, isLoading, error, refetch } = useRelatorioMensal(unidade, mes)
  const { mapa } = useMapaProdutos()
  const nomeProduto = (id: string) => mapa.get(id)?.nome ?? id

  const varGasto = r ? variacao(r.totais.gasto, r.totais.gasto_mes_anterior) : null

  return (
    <AppShell>
      <Cabecalho icone={BarChart3} titulo="Relatórios" descricao="Relatório mensal de estoque por unidade, comparado ao mês anterior."
        acoes={<Button variant="outline" disabled={!r} onClick={() => r && exportarCsv(r, nomeUnidade(r.unidade_id), nomeProduto)}><Download /> Exportar para Excel</Button>} />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select aria-label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="sm:w-56">
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
          <Select aria-label="Mês" value={mes} onChange={(e) => setMes(e.target.value)} className="sm:w-56">
            {meses.map((m) => <option key={m} value={m}>{mesPorExtenso(m)}</option>)}
          </Select>
        </div>

        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : !r ? <Vazio icone={BarChart3} titulo="Escolha uma unidade" />
          : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi rotulo="Entradas" valor={numero(r.totais.entradas)} detalhe="itens recebidos no mês" />
                <Kpi rotulo="Saídas" valor={numero(r.totais.saidas)} detalhe="itens consumidos no mês" />
                <Kpi rotulo="Gasto" valor={reais(r.totais.gasto)} tom="brand"
                  detalhe={varGasto === null ? `mês anterior: ${reais(r.totais.gasto_mes_anterior)}` : `${varGasto > 0 ? "+" : ""}${varGasto}% em relação ao mês anterior`} />
              </div>

              <div className="rounded-2xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Saldo no início</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Saldo no fim</TableHead>
                      <TableHead className="text-right">Vs. mês anterior</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.linhas.map((l) => (
                      <TableRow key={l.produto_id}>
                        <TableCell className="min-w-56">{nomeProduto(l.produto_id)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numero(l.saldo_inicial)}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.entradas ? `+${numero(l.entradas)}` : "0"}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.saidas ? `−${numero(l.saidas)}` : "0"}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{numero(l.saldo_final)}</TableCell>
                        <TableCell className="text-right"><Variacao atual={l.saldo_final} anterior={l.saldo_mes_anterior} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

        <Faixa icone={Mail}>
          <p>O resumo semanal por e-mail (itens abaixo do mínimo e cotações paradas) chega junto com o back-end.</p>
        </Faixa>
      </div>
    </AppShell>
  )
}
