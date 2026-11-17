// Fila da contagem no aparelho (spec 001, research D4): toda alteração é guardada aqui primeiro e enviada em lote quando
// há conexão. Assim nada se perde se o sinal cair no meio do almoxarifado. Nesta fase fica no localStorage; o
// IndexedDB (com service worker da aplicação) entra na spec do offline real.
import { hora } from "@/lib/format"
import type { AlteracaoItem, ItemContagem } from "@/lib/tipos"

const chave = (contagemId: string) => `estoque-fila-contagem-${contagemId}`

export function lerFila(contagemId: string): AlteracaoItem[] {
  try {
    const v = localStorage.getItem(chave(contagemId))
    return v ? (JSON.parse(v) as AlteracaoItem[]) : []
  } catch {
    return []
  }
}

function gravar(contagemId: string, fila: AlteracaoItem[]) {
  try {
    if (fila.length) localStorage.setItem(chave(contagemId), JSON.stringify(fila))
    else localStorage.removeItem(chave(contagemId))
  } catch {
    /* sem storage: a alteração segue só na memória até o envio */
  }
}

/** Junta a alteração com o que já estava na fila para o mesmo produto (vale o último valor de cada campo). */
export function juntar(fila: AlteracaoItem[], alt: AlteracaoItem): AlteracaoItem[] {
  const i = fila.findIndex((a) => a.produto_id === alt.produto_id)
  if (i < 0) return [...fila, alt]
  const copia = [...fila]
  copia[i] = { ...copia[i], ...alt }
  return copia
}

export function adicionar(contagemId: string, alt: AlteracaoItem) {
  const fila = juntar(lerFila(contagemId), alt)
  gravar(contagemId, fila)
  return fila
}

/** Tira da fila o que foi enviado, mantendo o que mudou de novo durante o envio. */
export function confirmarEnvio(contagemId: string, enviados: AlteracaoItem[]) {
  const restantes = lerFila(contagemId).filter((a) => {
    const e = enviados.find((x) => x.produto_id === a.produto_id)
    return !e || JSON.stringify(e) !== JSON.stringify(a)
  })
  gravar(contagemId, restantes)
  return restantes
}

/** Itens da contagem com as alterações ainda na fila do aparelho por cima. */
export function aplicarFila(itens: ItemContagem[], fila: AlteracaoItem[]): ItemContagem[] {
  return itens.map((i) => {
    const alt = fila.find((a) => a.produto_id === i.produto_id)
    if (!alt) return i
    const definidos = Object.fromEntries(Object.entries(alt).filter(([, v]) => v !== undefined)) as Partial<ItemContagem>
    return { ...i, ...definidos }
  })
}

/** Minutos até o encerramento "HH:MM" de hoje (Brasília). Negativo = já passou. */
export function minutosAte(encerramento: string, agora: Date) {
  const [h, m] = encerramento.split(":").map(Number)
  const [ha, ma] = hora(agora).split(":").map(Number)
  return h * 60 + m - (ha * 60 + ma)
}
