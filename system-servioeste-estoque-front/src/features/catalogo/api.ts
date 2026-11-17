import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, put, query } from "@/lib/api"
import type { Produto, ProdutoDetalhe } from "@/lib/tipos"

export function useProdutos(filtro: { busca?: string; categoria?: string } = {}) {
  return useQuery({
    queryKey: ["produtos", filtro],
    queryFn: () => api<Produto[]>(`/produtos${query(filtro)}`),
    placeholderData: (anterior) => anterior,
  })
}

export function useProduto(id: string) {
  return useQuery({ queryKey: ["produtos", "detalhe", id], queryFn: () => api<ProdutoDetalhe>(`/produtos/${id}`) })
}

/** Mapa id -> produto, para as telas que mostram nomes a partir de ids. */
export function useMapaProdutos() {
  const r = useProdutos()
  const mapa = new Map((r.data ?? []).map((p) => [p.id, p]))
  return { ...r, mapa }
}

export function useSalvarMinimos(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (minimos: Record<string, number>) => put<Produto>(`/produtos/${id}/minimos`, minimos),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  })
}
