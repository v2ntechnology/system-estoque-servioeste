import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, patch, post, query } from "@/lib/api"
import type { AlteracaoItem, Contagem, ContagemResumo } from "@/lib/tipos"

export function useContagens(unidade: string) {
  return useQuery({ queryKey: ["contagens", unidade], queryFn: () => api<ContagemResumo[]>(`/contagens${query({ unidade })}`) })
}

export function useContagem(id: string) {
  return useQuery({ queryKey: ["contagens", "detalhe", id], queryFn: () => api<Contagem>(`/contagens/${id}`) })
}

export function useAbrirContagem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { unidade_id: string; data?: string }) => post<Contagem>("/contagens", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagens"] })
      qc.invalidateQueries({ queryKey: ["painel"] })
    },
  })
}

/** Envia o lote de alterações guardado no aparelho (fila offline). */
export const enviarItens = (id: string, itens: AlteracaoItem[]) => patch<Contagem>(`/contagens/${id}/itens`, { itens })

export function useFinalizarContagem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => post<Contagem>(`/contagens/${id}/finalizar`),
    onSuccess: (c) => {
      qc.setQueryData(["contagens", "detalhe", id], c)
      for (const k of ["contagens", "painel", "produtos", "unidades"]) qc.invalidateQueries({ queryKey: [k] })
    },
  })
}
