"""Visões no formato de `src/lib/tipos.ts` e operações de estoque usadas por várias rotas."""
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tempo import agora, com_fuso, hoje
from app.models import (
    Contagem,
    Divergencia,
    EstoqueMinimo,
    ItemContagem,
    Movimentacao,
    Produto,
    Saldo,
    Unidade,
)

Chave = tuple[uuid.UUID, uuid.UUID]  # (produto, unidade)


def iso(d: datetime | date | None) -> str | None:
    if d is None:
        return None
    return com_fuso(d).isoformat() if isinstance(d, datetime) else d.isoformat()


# ---------------------------------------------------------------- saldos, mínimos e consumo

async def mapas_de_estoque(db: AsyncSession) -> tuple[dict[Chave, float | None], dict[Chave, float], dict[Chave, int]]:
    """Saldos (None = não contado), mínimos e consumo médio mensal (saídas dos últimos 90 dias) de todo o catálogo."""
    saldos = {(s.produto_id, s.unidade_id): s.quantidade for s in (await db.scalars(select(Saldo))).all()}
    minimos = {(m.produto_id, m.unidade_id): m.quantidade for m in (await db.scalars(select(EstoqueMinimo))).all()}
    desde = agora() - timedelta(days=90)
    linhas = await db.execute(
        select(Movimentacao.produto_id, Movimentacao.unidade_id, func.sum(Movimentacao.quantidade))
        .where(Movimentacao.tipo == "saida", Movimentacao.data >= desde)
        .group_by(Movimentacao.produto_id, Movimentacao.unidade_id))
    consumos = {(p, u): round(float(total) / 90 * 30) for p, u, total in linhas.all()}
    return saldos, minimos, consumos


async def ids_unidades(db: AsyncSession) -> list[uuid.UUID]:
    return list((await db.scalars(select(Unidade.id).order_by(Unidade.nome))).all())


def view_produto(p: Produto, unidades: list[uuid.UUID], saldos, minimos, consumos) -> dict:
    return {
        "id": str(p.id), "codigo": p.codigo, "nome": p.nome, "categoria_id": str(p.categoria_id), "medida": p.medida,
        "embalagem": {"nome": p.embalagem_nome, "quantidade": p.embalagem_quantidade} if p.embalagem_nome else None,
        "controla_validade": p.controla_validade,
        "saldos": {str(u): saldos.get((p.id, u)) for u in unidades},
        "minimos": {str(u): minimos.get((p.id, u), 0) for u in unidades},
        "consumo_mensal": {str(u): consumos.get((p.id, u), 0) for u in unidades},
    }


async def aplicar_movimentacao(db: AsyncSession, m: Movimentacao) -> None:
    """Entrada soma; saída subtrai sem passar de zero. Saldo desconhecido só passa a ter valor com uma entrada."""
    saldo = await db.get(Saldo, (m.produto_id, m.unidade_id))
    if saldo is None:
        saldo = Saldo(produto_id=m.produto_id, unidade_id=m.unidade_id, quantidade=None)
        db.add(saldo)
    if m.tipo == "entrada":
        saldo.quantidade = (saldo.quantidade or 0) + m.quantidade
    elif saldo.quantidade is not None:
        saldo.quantidade = max(0.0, saldo.quantidade - m.quantidade)


# ---------------------------------------------------------------- unidades

async def ultimas_contagens(db: AsyncSession) -> dict[uuid.UUID, date]:
    linhas = await db.execute(
        select(Contagem.unidade_id, func.max(Contagem.data)).where(Contagem.situacao == "finalizada")
        .group_by(Contagem.unidade_id))
    return dict(linhas.all())


def view_unidade(u: Unidade, ultima: date | None) -> dict:
    proxima = ultima + timedelta(days=u.frequencia_dias) if ultima else hoje()
    return {
        "id": str(u.id), "nome": u.nome, "encerramento": u.encerramento, "frequencia_dias": u.frequencia_dias,
        "ultima_contagem": iso(ultima), "proxima_contagem": iso(proxima), "atrasada": proxima < hoje(),
    }


# ---------------------------------------------------------------- contagens

def view_contagem(c: Contagem, itens: list[ItemContagem], divergencias: list[Divergencia], *, completa: bool) -> dict:
    contados = sum(1 for i in itens if i.quantidade is not None)
    base = {
        "id": str(c.id), "unidade_id": str(c.unidade_id), "data": iso(c.data), "responsavel": c.responsavel,
        "situacao": c.situacao, "contados": contados, "total": len(itens), "divergencias": len(divergencias),
        "finalizada_em": iso(c.finalizada_em),
    }
    if completa:
        base["itens"] = [{"produto_id": str(i.produto_id), "quantidade": i.quantidade, "observacao": i.observacao,
                          "foto": i.foto, "foto_url": f"/api/v1/arquivos/{i.foto}" if i.foto else None}
                         for i in itens]
        base["lista_divergencias"] = [{"produto_id": str(d.produto_id), "anterior": d.anterior, "entradas": d.entradas,
                                       "saidas": d.saidas, "esperado": d.esperado, "contado": d.contado}
                                      for d in divergencias]
    return base


async def itens_e_divergencias(db: AsyncSession, ids: list[uuid.UUID]):
    """Itens (na ordem do catálogo) e divergências de várias contagens de uma vez."""
    itens: dict[uuid.UUID, list[ItemContagem]] = {i: [] for i in ids}
    divs: dict[uuid.UUID, list[Divergencia]] = {i: [] for i in ids}
    if not ids:
        return itens, divs
    linhas = await db.scalars(
        select(ItemContagem).join(Produto, Produto.id == ItemContagem.produto_id)
        .where(ItemContagem.contagem_id.in_(ids)).order_by(Produto.codigo))
    for i in linhas.all():
        itens[i.contagem_id].append(i)
    for d in (await db.scalars(select(Divergencia).where(Divergencia.contagem_id.in_(ids)))).all():
        divs[d.contagem_id].append(d)
    return itens, divs


def view_movimentacao(m: Movimentacao) -> dict:
    return {
        "id": str(m.id), "tipo": m.tipo, "produto_id": str(m.produto_id), "unidade_id": str(m.unidade_id),
        "quantidade": m.quantidade, "data": iso(m.data), "origem": m.origem, "referencia": m.referencia,
        "observacao": m.observacao, "autor": m.autor,
    }
