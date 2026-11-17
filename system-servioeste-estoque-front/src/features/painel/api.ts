import { useQuery } from "@tanstack/react-query"

import { api, query } from "@/lib/api"
import type { Painel } from "@/lib/tipos"

export function usePainel(unidade: string) {
  return useQuery({ queryKey: ["painel", unidade], queryFn: () => api<Painel>(`/painel${query({ unidade })}`) })
}
