import { ChartColumn, ChartLine, Table2 } from "lucide-react"
import { useState } from "react"

import { GraficoSerie, ListaPartes, TabelaSerie, type Ponto } from "@/components/graficos/GraficoSerie"
import { Dialog } from "@/components/ui/dialog"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { Tabs } from "@/components/ui/tabs"
import { useCategorias, useNomeUnidade } from "@/features/sessao/api"
import { mesPorExtenso, numero, reais } from "@/lib/format"
import type { EscalaSerie, MetricaSerie, PontoSerie } from "@/lib/tipos"

import { useSerie } from "./api"

const NOME: Record<MetricaSerie, string> = { entradas: "Entradas", saidas: "Saídas", gasto: "Gasto" }
const reaisCompacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 })
const mesCurto = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
const diaLongo = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "")

function paraPontos(pontos: PontoSerie[], escala: EscalaSerie): Ponto[] {
  return pontos.map((p) => escala === "dia"
    ? { rotulo: p.periodo.slice(8, 10), detalhe: diaLongo(p.periodo), valor: p.valor }
    : { rotulo: mesCurto(p.periodo), detalhe: mesPorExtenso(p.periodo), valor: p.valor })
}

/**
 * Histórico de um indicador dos relatórios (spec 003): por dia do mês ou pelos últimos 6 meses, em área ou colunas,
 * com a tabela dos mesmos números e a divisão por categoria em lista de barras.
 */
export function GraficoDialog({ metrica, unidade, mes, onFechar }: {
  metrica: MetricaSerie
  unidade: string
  mes: string
  onFechar: () => void
}) {
  const [escala, setEscala] = useState<EscalaSerie>("dia")
  const [tipo, setTipo] = useState<"area" | "colunas" | "tabela">("area")
  const { data, isLoading, error, refetch } = useSerie({ unidade, metrica, escala, mes })
  const { data: categorias = [] } = useCategorias()
  const nomeUnidade = useNomeUnidade()
  const formatar = metrica === "gasto" ? reais : (v: number) => `${numero(v)} itens`
  const formatarEixo = metrica === "gasto" ? (v: number) => reaisCompacto.format(v) : numero
  // Converte pela escala da resposta: enquanto a nova carrega, a anterior continua na tela sem ser lida errado.
  const pontos = data ? paraPontos(data.pontos, data.escala) : []
  const total = pontos.reduce((a, p) => a + p.valor, 0)
  const periodo = escala === "dia" ? mesPorExtenso(mes) : `6 meses até ${mesPorExtenso(mes)}`

  return (
    <Dialog open onClose={onFechar} className="max-w-3xl" title={`${NOME[metrica]} · ${nomeUnidade(unidade)}`}
      description={`${periodo} · total ${formatar(total)}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={escala} onChange={setEscala} abas={[{ value: "dia", label: "Por dia" }, { value: "mes", label: "Por mês" }]} />
          <div role="radiogroup" aria-label="Tipo de gráfico" className="inline-flex gap-1 rounded-full bg-foreground/5 p-1">
            {([["area", "Área", ChartLine], ["colunas", "Colunas", ChartColumn], ["tabela", "Tabela", Table2]] as const).map(([v, rotulo, Icone]) => (
              <button key={v} type="button" role="radio" aria-checked={tipo === v} onClick={() => setTipo(v)} aria-label={rotulo} title={rotulo}
                className={`grid size-8 place-items-center rounded-full transition-colors ${tipo === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Icone className="size-4" />
              </button>
            ))}
          </div>
        </div>

        {isLoading ? <Carregando /> : error ? <ErroCarga mensagem={error.message} onTentarDeNovo={() => refetch()} />
          : tipo === "tabela" ? <TabelaSerie pontos={pontos} formatar={formatar} cabecalho={NOME[metrica]} />
          : <GraficoSerie pontos={pontos} tipo={tipo} formatar={formatar} formatarEixo={formatarEixo} rotuloSerie={NOME[metrica]} />}

        {data && (
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm text-muted-foreground">Por categoria · {periodo}</h3>
            <ListaPartes formatar={formatar}
              partes={data.por_categoria.map((c) => ({ nome: categorias.find((x) => x.id === c.categoria_id)?.nome ?? "Outros", valor: c.valor }))} />
          </section>
        )}
      </div>
    </Dialog>
  )
}
