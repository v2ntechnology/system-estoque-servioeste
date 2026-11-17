import { cn } from "@/lib/utils"

/** Barra de progresso "feitos/total · %" (contagens e área do dev). */
export function Barra({ feitos, total, className }: { feitos: number; total: number; className?: string }) {
  const p = total ? Math.round((feitos / total) * 100) : 0
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${p}%` }} />
      </div>
      <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">{feitos}/{total} · {p}%</span>
    </div>
  )
}
