import { cn } from "@/lib/utils"

export type TomMedidor = "brand" | "warning" | "destructive" | "vazio"

const COR: Record<TomMedidor, string> = {
  brand: "text-brand",
  warning: "text-warning",
  destructive: "text-destructive",
  vazio: "text-border",
}

/**
 * Medidor em semicírculo com tracinhos (referência da spec 002, "Average Performance"). `valor` de 0 a 1 diz quantos
 * tracinhos acendem; a cor indica a situação — é um dos poucos lugares onde aviso e erro têm cor (princípio XI).
 */
export function Medidor({ valor, tom, tamanho = 44, tracos = 12, className, rotulo }: {
  valor: number
  tom: TomMedidor
  tamanho?: number
  tracos?: number
  className?: string
  rotulo?: string
}) {
  const acesos = tom === "vazio" ? 0 : Math.max(1, Math.round(Math.min(1, Math.max(0, valor)) * tracos))
  const c = 50
  return (
    <svg viewBox="0 0 100 56" width={tamanho} height={(tamanho * 56) / 100} role="img" aria-label={rotulo}
      className={cn("shrink-0", className)}>
      {Array.from({ length: tracos }, (_, i) => {
        const a = Math.PI - (i / (tracos - 1)) * Math.PI
        const [x1, y1, x2, y2] = [c + 30 * Math.cos(a), 52 - 30 * Math.sin(a), c + 46 * Math.cos(a), 52 - 46 * Math.sin(a)]
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={7} strokeLinecap="round" stroke="currentColor"
            className={i < acesos ? COR[tom] : "text-border"} />
        )
      })}
    </svg>
  )
}
