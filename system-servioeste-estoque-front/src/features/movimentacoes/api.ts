import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, post, query } from "@/lib/api"
import type { Movimentacao, NovaMovimentacao, TipoMovimentacao } from "@/lib/tipos"

export function useMovimentacoes(filtro: { unidade: string; tipo?: TipoMovimentacao | ""; produto?: string }) {
  return useQuery({ queryKey: ["movimentacoes", filtro], queryFn: () => api<Movimentacao[]>(`/movimentacoes${query(filtro)}`) })
}

export function useRegistrarMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NovaMovimentacao) => post<Movimentacao>("/movimentacoes", body),
    onSuccess: () => {
      for (const k of ["movimentacoes", "produtos", "painel"]) qc.invalidateQueries({ queryKey: [k] })
    },
  })
}
