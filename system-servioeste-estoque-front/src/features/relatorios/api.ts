import { useQuery } from "@tanstack/react-query"

import { api, query } from "@/lib/api"
import type { RelatorioMensal } from "@/lib/tipos"

export function useRelatorioMensal(unidade: string, mes: string) {
  return useQuery({
    queryKey: ["relatorios", "mensal", unidade, mes],
    queryFn: () => api<RelatorioMensal>(`/relatorios/mensal${query({ unidade, mes })}`),
    enabled: !!unidade,
  })
}
