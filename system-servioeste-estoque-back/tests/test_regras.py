"""Mesmos casos de system-servioeste-estoque-front/tests/regras.test.ts (spec 004, research D1)."""
from datetime import UTC, datetime

from app.regras import (
    ItemContado,
    Mov,
    calcular_divergencias,
    consumo_medio_mensal,
    ler_quantidade,
    progresso,
    situacao,
    sugerir_compra,
)


def item(produto: str, quantidade: float | None) -> ItemContado:
    return ItemContado(produto_id=produto, quantidade=quantidade)


def test_vazio_e_nao_contado_e_zero_e_zero():
    assert ler_quantidade("") is None
    assert ler_quantidade("  ") is None
    assert ler_quantidade("0") == 0
    assert ler_quantidade("1,5") == 1.5
    assert ler_quantidade("dez") is ...
    assert ler_quantidade("-3") is ...


def test_progresso_conta_o_zero_e_ignora_o_vazio():
    assert progresso([item("a", 0), item("b", None), item("c", 4)]) == (2, 3)


ANTERIOR = {"a": 40, "b": 40, "c": 40, "d": None}
MOVS = [Mov("b", "saida", 30), Mov("c", "entrada", 10)]


def test_divergencia_aponta_queda_sem_saida():
    d = calcular_divergencias([item("a", 10)], ANTERIOR, MOVS)
    resumo = [(x.produto_id, x.anterior, x.entradas, x.saidas, x.esperado, x.contado) for x in d]
    assert resumo == [("a", 40, 0, 0, 40, 10)]


def test_divergencia_desconta_saidas_e_soma_entradas():
    assert calcular_divergencias([item("b", 10), item("c", 49)], ANTERIOR, MOVS) == []


def test_divergencia_ignora_nao_contado_e_sem_anterior():
    assert calcular_divergencias([item("a", None), item("d", 0), item("novo", 0)], ANTERIOR, MOVS) == []


def test_divergencia_tolera_diferenca_pequena():
    assert calcular_divergencias([item("a", 37)], ANTERIOR, []) == []
    assert len(calcular_divergencias([item("a", 35)], ANTERIOR, [])) == 1


def test_sugestao_cobre_minimo_mais_um_mes_na_embalagem():
    assert sugerir_compra(10, 40, 30, None) == 60
    assert sugerir_compra(10, 40, 30, 8) == 64
    assert sugerir_compra(100, 40, 30, None) == 0
    assert sugerir_compra(None, 4, 2, None) == 6


def test_consumo_mensal_das_saidas_dos_ultimos_90_dias():
    hoje = datetime(2026, 11, 17, 12, tzinfo=UTC)
    saidas = [(90, datetime(2026, 10, 1, 12, tzinfo=UTC)), (1000, datetime(2026, 1, 1, 12, tzinfo=UTC))]
    assert consumo_medio_mensal(saidas, hoje) == 30


def test_situacao_do_estoque():
    assert situacao(5, 10) == "critica"
    assert situacao(10, 10) == "atencao"
    assert situacao(15, 10) == "boa"
    assert situacao(None, 10) == "nao_contado"
