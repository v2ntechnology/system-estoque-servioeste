import { useMutation, useQueryClient } from "@tanstack/react-query"

import { patch, post } from "@/lib/api"
import type { PreviaImportacao, ResultadoImportacao, TipoPlanilha } from "@/lib/tipos"

export function useEnviarPlanilha() {
  return useMutation({
    mutationFn: ({ arquivo, tipo, unidade_id }: { arquivo: File; tipo: TipoPlanilha; unidade_id: string }) => {
      const form = new FormData()
      form.set("arquivo", arquivo)
      form.set("tipo", tipo)
      form.set("unidade_id", unidade_id)
      return post<PreviaImportacao>("/importacao/planilha", form)
    },
  })
}

export function useAssociarLinha(id: string) {
  return useMutation({
    mutationFn: ({ linha, produto_id }: { linha: number; produto_id: string | null }) =>
      patch<PreviaImportacao>(`/importacao/${id}/linhas/${linha}`, { produto_id }),
  })
}

export function useConfirmarImportacao(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => post<ResultadoImportacao>(`/importacao/${id}/confirmar`),
    onSuccess: () => {
      for (const k of ["contagens", "produtos", "painel"]) qc.invalidateQueries({ queryKey: [k] })
    },
  })
}
