import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { pode, type Acao } from "@/lib/papeis"
import type { Categoria, Eu, Unidade } from "@/lib/tipos"

/** Pessoa da sessão (identidade do Hub + papéis e unidades do Estoque). */
export function useEu() {
  return useQuery({ queryKey: ["eu"], queryFn: () => api<Eu>("/eu"), staleTime: 5 * 60_000, retry: false })
}

export function usePode(acao: Acao) {
  const { data: eu } = useEu()
  return pode(eu, acao)
}

export function useUnidades() {
  return useQuery({ queryKey: ["unidades"], queryFn: () => api<Unidade[]>("/unidades"), staleTime: 60_000 })
}

export function useCategorias() {
  return useQuery({ queryKey: ["categorias"], queryFn: () => api<Categoria[]>("/categorias"), staleTime: 5 * 60_000 })
}

/** Nome da unidade pelo id (para listas). */
export function useNomeUnidade() {
  const { data = [] } = useUnidades()
  return (id: string) => data.find((u) => u.id === id)?.nome ?? "—"
}
