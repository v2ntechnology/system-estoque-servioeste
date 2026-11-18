"""Datas no fuso de Brasília (núcleo I)."""
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

BRASILIA = ZoneInfo("America/Sao_Paulo")


def agora() -> datetime:
    return datetime.now(UTC)


def hoje() -> date:
    return datetime.now(BRASILIA).date()


def com_fuso(d: datetime) -> datetime:
    """O SQLite dos testes devolve datas sem fuso: tratamos como UTC (mesmo cuidado do Hub)."""
    return d if d.tzinfo else d.replace(tzinfo=UTC)
