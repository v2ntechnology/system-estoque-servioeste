import type { Eu, Papel } from "@/lib/tipos"

/** O que cada papel pode fazer. A interface só esconde; quem decide é a API (constituição, princípio X). */
export type Acao =
  | "contagem.registrar"
  | "movimentacao.registrar"
  | "cotacao.montar"
  | "cotacao.aprovar"
  | "catalogo.editar"
  | "importacao.usar"
  | "unidades.gerenciar"

export const ACOES_DO_PAPEL: Record<Papel, Acao[]> = {
  contador: ["contagem.registrar", "movimentacao.registrar"],
  comprador: ["cotacao.montar", "movimentacao.registrar", "catalogo.editar"],
  aprovador: ["cotacao.aprovar"],
  administrador: [
    "contagem.registrar", "movimentacao.registrar", "cotacao.montar", "cotacao.aprovar", "catalogo.editar",
    "importacao.usar", "unidades.gerenciar",
  ],
}

export const NOME_PAPEL: Record<Papel, string> = {
  contador: "Contador",
  comprador: "Comprador",
  aprovador: "Aprovador",
  administrador: "Administrador",
}

export const pode = (eu: Eu | null | undefined, acao: Acao) => !!eu?.papeis.some((p) => ACOES_DO_PAPEL[p].includes(acao))

export const papeisPorExtenso = (eu: Eu) => eu.papeis.map((p) => NOME_PAPEL[p]).join(", ")
