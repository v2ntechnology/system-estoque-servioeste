import { useQuery } from "@tanstack/react-query"

import { api, query } from "@/lib/api"
import type { EscalaSerie, MetricaSerie, RelatorioMensal, SerieRelatorio } from "@/lib/tipos"

export function useRelatorioMensal(unidade: string, mes: string) {
  return useQuery({
    queryKey: ["relatorios", "mensal", unidade, mes],
    queryFn: () => api<RelatorioMensal>(`/relatorios/mensal${query({ unidade, mes })}`),
    enabled: !!unidade,
  })
}

export function useSerie(filtro: { unidade: string; metrica: MetricaSerie; escala: EscalaSerie; mes: string }, ligado = true) {
  return useQuery({
    queryKey: ["relatorios", "serie", filtro],
    queryFn: () => api<SerieRelatorio>(`/relatorios/serie${query(filtro)}`),
    enabled: ligado && !!filtro.unidade,
    placeholderData: (anterior) => anterior,
  })
}
