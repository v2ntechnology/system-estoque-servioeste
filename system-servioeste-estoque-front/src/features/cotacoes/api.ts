import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, patch, post, query } from "@/lib/api"
import type {
  AlteracaoCotacao, Cotacao, CotacaoResumo, Fornecedor, ModeloCotacao, NovaCotacao, StatusCotacao, Sugestao, TipoAnexo,
} from "@/lib/tipos"

export function useCotacoes(filtro: { unidade: string; status?: StatusCotacao | "" }) {
  return useQuery({ queryKey: ["cotacoes", filtro], queryFn: () => api<CotacaoResumo[]>(`/cotacoes${query(filtro)}`) })
}

export function useCotacao(id: string) {
  return useQuery({ queryKey: ["cotacoes", "detalhe", id], queryFn: () => api<Cotacao>(`/cotacoes/${id}`) })
}

export function useSugestoes(unidade: string) {
  return useQuery({
    queryKey: ["cotacoes", "sugestoes", unidade],
    queryFn: () => api<Sugestao[]>(`/cotacoes/sugestoes${query({ unidade })}`),
    enabled: !!unidade,
  })
}

export function useModelos() {
  return useQuery({ queryKey: ["modelos-cotacao"], queryFn: () => api<ModeloCotacao[]>("/modelos-cotacao") })
}

export function useSalvarModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<ModeloCotacao, "id">) => post<ModeloCotacao>("/modelos-cotacao", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modelos-cotacao"] }),
  })
}

export function useCriarCotacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NovaCotacao) => post<Cotacao>("/cotacoes", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotacoes"] }),
  })
}

/** Alterações e mudanças de etapa de uma cotação; todas devolvem a cotação atualizada. */
export function useAcoesCotacao(id: string) {
  const qc = useQueryClient()
  const aoSalvar = (c: Cotacao) => {
    qc.setQueryData(["cotacoes", "detalhe", id], c)
    for (const k of ["cotacoes", "painel", "movimentacoes", "produtos"]) qc.invalidateQueries({ queryKey: [k], refetchType: "active" })
  }
  return {
    alterar: useMutation({ mutationFn: (body: AlteracaoCotacao) => patch<Cotacao>(`/cotacoes/${id}`, body), onSuccess: aoSalvar }),
    enviar: useMutation({ mutationFn: () => post<Cotacao>(`/cotacoes/${id}/enviar`), onSuccess: aoSalvar }),
    aprovar: useMutation({ mutationFn: () => post<Cotacao>(`/cotacoes/${id}/aprovar`), onSuccess: aoSalvar }),
    receber: useMutation({ mutationFn: () => post<Cotacao>(`/cotacoes/${id}/receber`), onSuccess: aoSalvar }),
    anexar: useMutation({
      mutationFn: ({ tipo, arquivo }: { tipo: TipoAnexo; arquivo: File }) => {
        const form = new FormData()
        form.set("tipo", tipo)
        form.set("arquivo", arquivo)
        return post<Cotacao>(`/cotacoes/${id}/anexos`, form)
      },
      onSuccess: aoSalvar,
    }),
  }
}

export function useFornecedores() {
  return useQuery({ queryKey: ["fornecedores"], queryFn: () => api<Fornecedor[]>("/fornecedores") })
}

export function useCotacoesDoFornecedor(id: string | null) {
  return useQuery({
    queryKey: ["fornecedores", id, "cotacoes"],
    queryFn: () => api<CotacaoResumo[]>(`/fornecedores/${id}/cotacoes`),
    enabled: !!id,
  })
}

export function useCriarFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<Fornecedor, "id">) => post<Fornecedor>("/fornecedores", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  })
}
