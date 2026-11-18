"""Contagens: abrir, registrar itens em lote (inclusive a fila do modo offline) e finalizar com divergências."""
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, Eu, EuAtual, exigir, unidades_visiveis, uuid_ou_404
from app.core.tempo import agora, hoje
from app.models import Arquivo, Contagem, Divergencia, ItemContagem, Movimentacao, Produto, Saldo
from app.regras import ItemContado, Mov, calcular_divergencias
from app.services import auditoria
from app.services.estoque import itens_e_divergencias, view_contagem

router = APIRouter(prefix="/api/v1")


async def _contagem(db, eu: Eu, id: str) -> Contagem:
    c = await db.get(Contagem, uuid_ou_404(id, "Contagem não encontrada."))
    if c is None or not eu.ve(c.unidade_id):
        raise HTTPException(404, "Contagem não encontrada.")
    return c


async def _completa(db, c: Contagem) -> dict:
    itens, divs = await itens_e_divergencias(db, [c.id])
    return view_contagem(c, itens[c.id], divs[c.id], completa=True)


@router.get("/contagens")
async def listar(eu: EuAtual, db: DB, unidade: str = "") -> list[dict]:
    ids = unidades_visiveis(eu, unidade)
    lista = (await db.scalars(select(Contagem).where(Contagem.unidade_id.in_(ids))
                              .order_by(Contagem.data.desc(), Contagem.situacao))).all()
    itens, divs = await itens_e_divergencias(db, [c.id for c in lista])
    return [view_contagem(c, itens[c.id], divs[c.id], completa=False) for c in lista]


class NovaContagem(BaseModel):
    unidade_id: uuid.UUID
    data: date | None = None


@router.post("/contagens", dependencies=[exigir("contagem.registrar")])
async def abrir(corpo: NovaContagem, eu: EuAtual, db: DB) -> dict:
    if not eu.ve(corpo.unidade_id):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    aberta = await db.scalar(select(Contagem).where(Contagem.unidade_id == corpo.unidade_id,
                                                    Contagem.situacao == "aberta"))
    if aberta:
        de = aberta.data.strftime("%d/%m/%Y")
        raise HTTPException(409, f"Já existe uma contagem aberta nesta unidade (de {de}).")
    c = Contagem(unidade_id=corpo.unidade_id, data=corpo.data or hoje(), responsavel=eu.nome, responsavel_id=eu.id)
    db.add(c)
    await db.flush()
    for pid in (await db.scalars(select(Produto.id).order_by(Produto.codigo))).all():
        db.add(ItemContagem(contagem_id=c.id, produto_id=pid, quantidade=None, observacao=""))
    auditoria.registrar(db, eu, "contagem.abrir", "contagem", c.id, unidade_id=str(c.unidade_id))
    await db.commit()
    return await _completa(db, c)


@router.get("/contagens/{id}")
async def detalhar(id: str, eu: EuAtual, db: DB) -> dict:
    return await _completa(db, await _contagem(db, eu, id))


class AlteracaoItem(BaseModel):
    produto_id: uuid.UUID
    # Ausente = não muda; null = "não contado" (princípio VIII). Por isso usamos model_fields_set.
    quantidade: float | None = None
    observacao: str | None = None
    foto: str | None = None


class LoteDeItens(BaseModel):
    itens: list[AlteracaoItem]


@router.patch("/contagens/{id}/itens", dependencies=[exigir("contagem.registrar")])
async def registrar_itens(id: str, corpo: LoteDeItens, eu: EuAtual, db: DB) -> dict:
    c = await _contagem(db, eu, id)
    if c.situacao == "finalizada":
        raise HTTPException(409, "Esta contagem já foi finalizada e não pode mais ser alterada.")
    for alt in corpo.itens:
        item = await db.get(ItemContagem, (c.id, alt.produto_id))
        if item is None:
            continue
        enviados = alt.model_fields_set
        if "quantidade" in enviados:
            if alt.quantidade is not None and alt.quantidade < 0:
                raise HTTPException(422, "Quantidade inválida.")
            item.quantidade = alt.quantidade
        if "observacao" in enviados:
            item.observacao = alt.observacao or ""
        if "foto" in enviados:
            if alt.foto is not None:
                foto = await db.get(Arquivo, uuid_ou_404(alt.foto, "Foto não encontrada."))
                if foto is None or foto.unidade_id != c.unidade_id:
                    raise HTTPException(422, "Foto não encontrada. Tire a foto de novo.")
            item.foto = alt.foto
    await db.commit()
    return await _completa(db, c)


@router.post("/contagens/{id}/finalizar", dependencies=[exigir("contagem.registrar")])
async def finalizar(id: str, eu: EuAtual, db: DB) -> dict:
    c = await _contagem(db, eu, id)
    if c.situacao == "finalizada":
        raise HTTPException(409, "Esta contagem já foi finalizada.")
    itens = (await db.scalars(select(ItemContagem).where(ItemContagem.contagem_id == c.id))).all()
    if not any(i.quantidade is not None for i in itens):
        raise HTTPException(422, "Nenhum item contado. Digite ao menos uma quantidade (zero também vale).")

    anterior = await db.scalar(
        select(Contagem).where(Contagem.unidade_id == c.unidade_id, Contagem.situacao == "finalizada")
        .order_by(Contagem.data.desc(), Contagem.finalizada_em.desc()).limit(1))
    mapa: dict[str, float | None] = {}
    movs: list[Mov] = []
    if anterior:
        mapa = {str(i.produto_id): i.quantidade for i in (await db.scalars(
            select(ItemContagem).where(ItemContagem.contagem_id == anterior.id))).all()}
        desde = anterior.finalizada_em
        consulta = select(Movimentacao).where(Movimentacao.unidade_id == c.unidade_id)
        if desde:
            consulta = consulta.where(Movimentacao.data > desde)
        movs = [Mov(str(m.produto_id), m.tipo, m.quantidade) for m in (await db.scalars(consulta)).all()]

    calculadas = calcular_divergencias([ItemContado(str(i.produto_id), i.quantidade) for i in itens], mapa, movs)
    for d in calculadas:
        db.add(Divergencia(contagem_id=c.id, produto_id=uuid.UUID(d.produto_id), anterior=d.anterior,
                           entradas=d.entradas, saidas=d.saidas, esperado=d.esperado, contado=d.contado))
    # O saldo passa a ser o contado; item não contado mantém o saldo que tinha.
    for i in itens:
        if i.quantidade is None:
            continue
        saldo = await db.get(Saldo, (i.produto_id, c.unidade_id))
        if saldo is None:
            db.add(Saldo(produto_id=i.produto_id, unidade_id=c.unidade_id, quantidade=i.quantidade))
        else:
            saldo.quantidade = i.quantidade
    c.situacao = "finalizada"
    c.finalizada_em = agora()
    auditoria.registrar(db, eu, "contagem.finalizar", "contagem", c.id, divergencias=len(calculadas),
                        nao_contados=sum(1 for i in itens if i.quantidade is None))
    await db.commit()
    return await _completa(db, c)
