import { useState } from "react"

import { cn } from "@/lib/utils"

/** Miniatura que abre a foto inteira numa aba nova (spec 005). Foto que não carrega avisa em vez de quebrar. */
export function MiniaturaFoto({ url, nome, className }: { url: string; nome: string; className?: string }) {
  const [quebrada, setQuebrada] = useState(false)
  if (quebrada) return <span className="text-xs text-muted-foreground">Foto indisponível</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Abrir a foto" className={cn("block size-14 shrink-0 overflow-hidden rounded-lg border", className)}>
      <img src={url} alt={`Foto de ${nome}`} className="size-full object-cover" onError={() => setQuebrada(true)} />
    </a>
  )
}
