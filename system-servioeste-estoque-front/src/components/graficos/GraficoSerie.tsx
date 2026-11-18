import { useEffect, useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export interface Ponto {
  rotulo: string
  /** Rótulo completo para o tooltip e a tabela (ex.: "terça, 5 de novembro"). */
  detalhe: string
  valor: number
}

const ALTURA = 220
const M = { topo: 12, direita: 8, base: 26, esquerda: 52 }

/** Teto "redondo" para o eixo (1, 2, 2,5 ou 5 × 10ⁿ). */
function teto(max: number) {
  if (max <= 0) return 1
  const e = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 2.5, 5, 10].map((f) => f * e).find((v) => v >= max)!
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, largura }
}

/**
 * Gráfico de uma série (skill dataviz): área com linha de 2 px e cruz + tooltip, ou colunas com cantos de 4 px e
 * tooltip por coluna. Uma série só, então sem legenda (o título da tela nomeia). Grade e eixos discretos; cor no token
 * `--grafico`. O valor de cada ponto também está na tabela (`TabelaSerie`), porque o verde tem contraste < 3:1 no claro.
 */
export function GraficoSerie({ pontos, tipo, formatar, formatarEixo = formatar, rotuloSerie }: {
  pontos: Ponto[]
  tipo: "area" | "colunas"
  formatar: (v: number) => string
  formatarEixo?: (v: number) => string
  rotuloSerie: string
}) {
  const { ref, largura } = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const gradiente = useId()
  const n = pontos.length
  const w = largura - M.esquerda - M.direita
  const h = ALTURA - M.topo - M.base
  const max = teto(Math.max(0, ...pontos.map((p) => p.valor)))
  const banda = n ? w / n : w
  const x = (i: number) => M.esquerda + (tipo === "area" ? (n > 1 ? (i / (n - 1)) * w : w / 2) : i * banda + banda / 2)
  const y = (v: number) => M.topo + h - (v / max) * h
  const linhas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 64))))

  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ")
  const area = n ? `${caminho} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ""

  const indicePeloMouse = (clientX: number, svg: SVGSVGElement) => {
    const px = clientX - svg.getBoundingClientRect().left - M.esquerda
    const i = tipo === "area" ? Math.round((px / w) * (n - 1)) : Math.floor(px / banda)
    return Math.min(n - 1, Math.max(0, i))
  }

  const p = ativo === null ? null : pontos[ativo]
  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={largura} height={ALTURA} role="img" aria-label={`${rotuloSerie}: gráfico de ${tipo === "area" ? "área" : "colunas"} com ${n} pontos`}
        onMouseMove={(e) => n && setAtivo(indicePeloMouse(e.clientX, e.currentTarget))} onMouseLeave={() => setAtivo(null)}
        onTouchStart={(e) => n && setAtivo(indicePeloMouse(e.touches[0].clientX, e.currentTarget))}
        onTouchMove={(e) => n && setAtivo(indicePeloMouse(e.touches[0].clientX, e.currentTarget))}>
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--grafico)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--grafico)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {linhas.map((v) => (
          <g key={v}>
            <line x1={M.esquerda} x2={largura - M.direita} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={v ? "2 4" : undefined} />
            <text x={M.esquerda - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{formatarEixo(v)}</text>
          </g>
        ))}
        {pontos.map((pt, i) => i % passoRotulo === 0 && (
          <text key={i} x={x(i)} y={ALTURA - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">{pt.rotulo}</text>
        ))}

        {tipo === "area" ? (
          <>
            <path d={area} fill={`url(#${gradiente})`} />
            <path d={caminho} fill="none" stroke="var(--grafico)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {p && ativo !== null && (
              <>
                <line x1={x(ativo)} x2={x(ativo)} y1={M.topo} y2={y(0)} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(ativo)} cy={y(p.valor)} r={5} fill="var(--grafico)" stroke="var(--background)" strokeWidth={2} />
              </>
            )}
          </>
        ) : pontos.map((pt, i) => {
          const larg = Math.max(2, Math.min(28, banda - 2))
          const topo = y(pt.valor)
          const alt = y(0) - topo
          const r = Math.min(4, alt, larg / 2)
          const x0 = x(i) - larg / 2
          // Coluna com só os cantos de cima arredondados, presa na linha de base.
          const d = alt <= 0 ? "" : `M${x0},${y(0)} V${topo + r} Q${x0},${topo} ${x0 + r},${topo} H${x0 + larg - r} Q${x0 + larg},${topo} ${x0 + larg},${topo + r} V${y(0)} Z`
          return <path key={i} d={d} fill="var(--grafico)" className={cn("transition-opacity", ativo !== null && ativo !== i && "opacity-40")} />
        })}
      </svg>

      {p && ativo !== null && (
        <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: Math.min(largura - 70, Math.max(70, x(ativo))), top: Math.max(40, y(p.valor) - 10) }}>
          <p className="font-medium tabular-nums">{formatar(p.valor)}</p>
          <p className="whitespace-nowrap text-muted-foreground">{p.detalhe}</p>
        </div>
      )}
    </div>
  )
}

/** A mesma série em tabela (visão acessível e para conferir os números). */
export function TabelaSerie({ pontos, formatar, cabecalho }: { pontos: Ponto[]; formatar: (v: number) => string; cabecalho: string }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
          <tr><th className="px-3 py-2 text-left font-normal">Período</th><th className="px-3 py-2 text-right font-normal">{cabecalho}</th></tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {pontos.map((p, i) => (
            <tr key={`${i}-${p.detalhe}`}><td className="px-3 py-1.5">{p.detalhe}</td><td className="px-3 py-1.5 text-right tabular-nums">{formatar(p.valor)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Partes de um todo em lista de barras (no lugar da pizza): nome, barra e valor por linha, do maior para o menor. */
export function ListaPartes({ partes, formatar }: { partes: { nome: string; valor: number }[]; formatar: (v: number) => string }) {
  const total = partes.reduce((a, p) => a + p.valor, 0)
  const maior = Math.max(0, ...partes.map((p) => p.valor))
  if (!total) return <p className="text-sm text-muted-foreground">Sem movimentação no período.</p>
  return (
    <ul className="space-y-2.5">
      {partes.map((p) => (
        <li key={p.nome} className="grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate">{p.nome}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-grafico" style={{ width: `${(p.valor / maior) * 100}%` }} />
          </span>
          <span className="w-32 text-right tabular-nums text-muted-foreground">
            {formatar(p.valor)} <span className="text-xs">· {Math.round((p.valor / total) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
