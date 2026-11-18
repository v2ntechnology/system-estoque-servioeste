"""Visão de cotação no formato de `src/lib/tipos.ts` (resumo ou completa)."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnexoCotacao, Cotacao, EventoCotacao, ItemCotacao
from app.services.estoque import iso


async def itens_por_cotacao(db: AsyncSession, ids: list[uuid.UUID]) -> dict[uuid.UUID, list[ItemCotacao]]:
    itens: dict[uuid.UUID, list[ItemCotacao]] = {i: [] for i in ids}
    if ids:
        for i in (await db.scalars(select(ItemCotacao).where(ItemCotacao.cotacao_id.in_(ids))
                                   .order_by(ItemCotacao.ordem))).all():
            itens[i.cotacao_id].append(i)
    return itens


def view_resumo(c: Cotacao, itens: list[ItemCotacao]) -> dict:
    cotados = [i for i in itens if i.preco is not None]
    return {
        "id": str(c.id), "numero": c.numero, "titulo": c.titulo, "unidade_id": str(c.unidade_id), "status": c.status,
        "fornecedor_id": str(c.fornecedor_id) if c.fornecedor_id else None, "criada_em": iso(c.criado_em),
        "total": round(sum(i.quantidade * (i.preco or 0) for i in cotados), 2) if cotados else None,
        "itens_qtd": len(itens),
    }


async def view_cotacao(db: AsyncSession, c: Cotacao) -> dict:
    itens = (await itens_por_cotacao(db, [c.id]))[c.id]
    anexos = (await db.scalars(select(AnexoCotacao).where(AnexoCotacao.cotacao_id == c.id)
                               .order_by(AnexoCotacao.enviado_em))).all()
    eventos = (await db.scalars(select(EventoCotacao).where(EventoCotacao.cotacao_id == c.id)
                                .order_by(EventoCotacao.data))).all()
    return {
        **view_resumo(c, itens),
        "itens": [{"produto_id": str(i.produto_id), "quantidade": i.quantidade, "preco": i.preco} for i in itens],
        "anexos": [{"id": str(a.id), "tipo": a.tipo, "nome": a.nome, "enviado_em": iso(a.enviado_em), "autor": a.autor,
                    "url": f"/api/v1/arquivos/{a.arquivo_id}" if a.arquivo_id else None} for a in anexos],
        "eventos": [{"data": iso(e.data), "autor": e.autor, "descricao": e.descricao} for e in eventos],
        "aprovada_por": c.aprovada_por, "aprovada_em": iso(c.aprovada_em), "observacao": c.observacao,
    }
