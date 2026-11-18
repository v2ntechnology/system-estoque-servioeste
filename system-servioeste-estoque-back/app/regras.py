"""Regras de negócio puras do Estoque. Iguais às de `system-servioeste-estoque-front/src/mocks/regras.ts`, com os mesmos
casos de teste (spec 004, research D1). Mudou aqui, muda lá.
"""
import math
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
from types import EllipsisType

# Divergência: queda maior que 10% e de pelo menos 2 unidades em relação ao esperado.
LIMITE_PERCENTUAL = 0.1
LIMITE_ABSOLUTO = 2


@dataclass(frozen=True)
class ItemContado:
    produto_id: str
    quantidade: float | None  # None = não contado (princípio VIII)


@dataclass(frozen=True)
class Mov:
    produto_id: str
    tipo: str  # entrada | saida
    quantidade: float


@dataclass(frozen=True)
class DivergenciaCalculada:
    produto_id: str
    anterior: float
    entradas: float
    saidas: float
    esperado: float
    contado: float


def ler_quantidade(texto: str) -> float | None | EllipsisType:
    """"" -> None (não contado); "1,5" -> 1.5; texto inválido ou negativo -> ``...``."""
    t = texto.strip().replace(",", ".")
    if t == "":
        return None
    if not re.fullmatch(r"\d+(\.\d+)?", t):
        return ...
    return float(t)


def progresso(itens: Iterable[ItemContado]) -> tuple[int, int]:
    """(contados, total): vazio não conta, zero conta."""
    lista = list(itens)
    return sum(1 for i in lista if i.quantidade is not None), len(lista)


def calcular_divergencias(
    itens: Iterable[ItemContado], anterior: Mapping[str, float | None], movimentacoes: Iterable[Mov],
) -> list[DivergenciaCalculada]:
    """Compara a contagem nova com a anterior, descontando as movimentações do intervalo.

    Item não contado nunca gera divergência, nem item sem contagem anterior.
    """
    movs = list(movimentacoes)
    resultado = []
    for item in itens:
        antes = anterior.get(item.produto_id)
        if item.quantidade is None or antes is None:
            continue
        do_produto = [m for m in movs if m.produto_id == item.produto_id]
        entradas = sum(m.quantidade for m in do_produto if m.tipo == "entrada")
        saidas = sum(m.quantidade for m in do_produto if m.tipo == "saida")
        esperado = antes + entradas - saidas
        falta = esperado - item.quantidade
        if falta >= LIMITE_ABSOLUTO and falta > esperado * LIMITE_PERCENTUAL:
            resultado.append(DivergenciaCalculada(item.produto_id, antes, entradas, saidas, esperado, item.quantidade))
    return resultado


def sugerir_compra(saldo: float | None, minimo: float, consumo_mensal: float, embalagem: float | None) -> float:
    """Quanto comprar: cobre a falta até o mínimo mais um mês de consumo, arredondado para a embalagem."""
    bruto = max(0.0, minimo + consumo_mensal - (saldo or 0))
    if bruto == 0:
        return 0
    passo = embalagem if embalagem and embalagem > 1 else 1
    return math.ceil(bruto / passo) * passo


def consumo_medio_mensal(saidas: Iterable[tuple[float, datetime]], hoje: datetime, dias: int = 90) -> int:
    """Consumo médio mensal: saídas dos últimos `dias` dias convertidas para 30 dias."""
    inicio = hoje - timedelta(days=dias)
    total = sum(q for q, quando in saidas if quando >= inicio)
    return round(total / dias * 30)


def situacao(saldo: float | None, minimo: float) -> str:
    """Abaixo do mínimo = crítica; até 1,5× = atenção; acima = boa; sem contagem = não contado."""
    if saldo is None:
        return "nao_contado"
    if saldo < minimo:
        return "critica"
    if saldo < minimo * 1.5:
        return "atencao"
    return "boa"
