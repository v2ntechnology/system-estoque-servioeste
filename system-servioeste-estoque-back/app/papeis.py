"""Papéis e ações. Igual a `system-servioeste-estoque-front/src/lib/papeis.ts`: a interface esconde, a API decide."""
PAPEIS = ("contador", "comprador", "aprovador", "administrador")

ACOES_DO_PAPEL: dict[str, set[str]] = {
    "contador": {"contagem.registrar", "movimentacao.registrar"},
    "comprador": {"cotacao.montar", "movimentacao.registrar", "catalogo.editar"},
    "aprovador": {"cotacao.aprovar"},
    "administrador": {
        "contagem.registrar", "movimentacao.registrar", "cotacao.montar", "cotacao.aprovar", "catalogo.editar",
        "importacao.usar", "unidades.gerenciar",
    },
}


def pode(papeis: list[str], acao: str) -> bool:
    return any(acao in ACOES_DO_PAPEL.get(p, set()) for p in papeis)
