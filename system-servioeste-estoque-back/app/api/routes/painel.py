"""Painel inicial: o que precisa de atenção nas unidades liberadas (mesmo cálculo dos simulados)."""
from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DB, EuAtual, unidades_visiveis
from app.core.tempo import hoje
from app.models import Contagem, Cotacao, Divergencia, ItemContagem, Lote, Unidade
from app.services.compras import itens_por_cotacao, view_resumo
from app.services.estoque import iso, mapas_de_estoque, ultimas_contagens, view_unidade

router = APIRouter(prefix="/api/v1")


@router.get("/painel")
async def painel(eu: EuAtual, db: DB, unidade: str = "") -> dict:
    ids = unidades_visiveis(eu, unidade)
    saldos, minimos, _ = await mapas_de_estoque(db)
    abaixo = [
        {"produto_id": str(p), "unidade_id": str(u), "saldo": s, "minimo": minimos.get((p, u), 0)}
        for (p, u), s in saldos.items() if u in ids and s is not None and s < minimos.get((p, u), 0)
    ]

    ultimas = await ultimas_contagens(db)
    unidades = (await db.scalars(select(Unidade).where(Unidade.id.in_(ids)).order_by(Unidade.nome))).all()
    abertas = {c.unidade_id: c.id for c in (await db.scalars(
        select(Contagem).where(Contagem.unidade_id.in_(ids), Contagem.situacao == "aberta"))).all()}
    contagens = []
    for u in unidades:
        v = view_unidade(u, ultimas.get(u.id))
        contagens.append({"unidade_id": str(u.id), "proxima": v["proxima_contagem"], "atrasada": v["atrasada"],
                          "aberta_id": str(abertas[u.id]) if u.id in abertas else None})

    cotacoes = (await db.scalars(select(Cotacao).where(Cotacao.unidade_id.in_(ids), Cotacao.status != "recebida")
                                 .order_by(Cotacao.numero.desc()))).all()
    itens = await itens_por_cotacao(db, [c.id for c in cotacoes])

    divergencias: list[dict] = []
    anterior = {"abaixo_minimo": 0, "divergencias": 0}
    for u in ids:
        finalizadas = (await db.scalars(
            select(Contagem).where(Contagem.unidade_id == u, Contagem.situacao == "finalizada")
            .order_by(Contagem.data.desc(), Contagem.finalizada_em.desc()).limit(2))).all()
        if finalizadas:
            ultima = finalizadas[0]
            for d in (await db.scalars(select(Divergencia).where(Divergencia.contagem_id == ultima.id))).all():
                divergencias.append({"produto_id": str(d.produto_id), "anterior": d.anterior, "entradas": d.entradas,
                                     "saidas": d.saidas, "esperado": d.esperado, "contado": d.contado,
                                     "unidade_id": str(u), "contagem_id": str(ultima.id)})
        if len(finalizadas) > 1:
            penultima = finalizadas[1]
            itens_pen = (await db.scalars(select(ItemContagem).where(ItemContagem.contagem_id == penultima.id))).all()
            anterior["abaixo_minimo"] += sum(1 for i in itens_pen if i.quantidade is not None
                                             and i.quantidade < minimos.get((i.produto_id, u), 0))
            anterior["divergencias"] += len((await db.scalars(
                select(Divergencia).where(Divergencia.contagem_id == penultima.id))).all())

    limite = hoje() + timedelta(days=30)
    lotes = (await db.scalars(select(Lote).where(Lote.unidade_id.in_(ids), Lote.validade <= limite)
                              .order_by(Lote.validade))).all()
    return {
        "abaixo_minimo": abaixo,
        "contagens": contagens,
        "cotacoes_abertas": [view_resumo(c, itens[c.id]) for c in cotacoes],
        "divergencias": divergencias,
        "validade": [{"id": str(lote.id), "produto_id": str(lote.produto_id), "unidade_id": str(lote.unidade_id),
                      "numero": lote.numero, "validade": iso(lote.validade), "quantidade": lote.quantidade,
                      "dias": (lote.validade - hoje()).days} for lote in lotes],
        "anterior": anterior,
    }
