"""Unidades, categorias e produtos (com mínimos, lotes e preços aprovados)."""
import re
import unicodedata

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, EuAtual, exigir, uuid_ou_404
from app.models import Categoria, Cotacao, EstoqueMinimo, Fornecedor, ItemCotacao, Lote, Produto, Unidade
from app.services import auditoria
from app.services.estoque import ids_unidades, iso, mapas_de_estoque, ultimas_contagens, view_produto, view_unidade

router = APIRouter(prefix="/api/v1")


def sem_acento(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


@router.get("/unidades")
async def listar_unidades(eu: EuAtual, db: DB) -> list[dict]:
    ultimas = await ultimas_contagens(db)
    unidades = (await db.scalars(select(Unidade).where(Unidade.id.in_(eu.unidades)).order_by(Unidade.nome))).all()
    return [view_unidade(u, ultimas.get(u.id)) for u in unidades]


class AlteracaoUnidade(BaseModel):
    encerramento: str | None = None
    frequencia_dias: int | None = None


@router.patch("/unidades/{id}", dependencies=[exigir("unidades.gerenciar")])
async def alterar_unidade(id: str, corpo: AlteracaoUnidade, eu: EuAtual, db: DB) -> dict:
    u = await db.get(Unidade, uuid_ou_404(id, "Unidade não encontrada."))
    if u is None:
        raise HTTPException(404, "Unidade não encontrada.")
    antes = {"encerramento": u.encerramento, "frequencia_dias": u.frequencia_dias}
    if corpo.encerramento is not None:
        if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", corpo.encerramento):
            raise HTTPException(422, "Horário inválido. Use HH:MM.")
        u.encerramento = corpo.encerramento
    if corpo.frequencia_dias is not None:
        if corpo.frequencia_dias < 1:
            raise HTTPException(422, "A frequência precisa ser de pelo menos 1 dia.")
        u.frequencia_dias = corpo.frequencia_dias
    auditoria.registrar(db, eu, "unidade.alterar", "unidade", u.id, antes=antes,
                        depois={"encerramento": u.encerramento, "frequencia_dias": u.frequencia_dias})
    await db.commit()
    return view_unidade(u, (await ultimas_contagens(db)).get(u.id))


@router.get("/categorias")
async def listar_categorias(_: EuAtual, db: DB) -> list[dict]:
    categorias = (await db.scalars(select(Categoria).order_by(Categoria.nome))).all()
    return [{"id": str(c.id), "nome": c.nome} for c in categorias]


@router.get("/produtos")
async def listar_produtos(_: EuAtual, db: DB, busca: str = "", categoria: str = "") -> list[dict]:
    consulta = select(Produto).order_by(Produto.codigo)
    if categoria:
        consulta = consulta.where(Produto.categoria_id == uuid_ou_404(categoria, "Categoria não encontrada."))
    produtos = (await db.scalars(consulta)).all()
    termo = sem_acento(busca.strip())
    if termo:
        produtos = [p for p in produtos if termo in sem_acento(f"{p.codigo} {p.nome}")]
    unidades = await ids_unidades(db)
    saldos, minimos, consumos = await mapas_de_estoque(db)
    return [view_produto(p, unidades, saldos, minimos, consumos) for p in produtos]


@router.get("/produtos/{id}")
async def detalhar_produto(id: str, eu: EuAtual, db: DB) -> dict:
    p = await db.get(Produto, uuid_ou_404(id, "Produto não encontrado."))
    if p is None:
        raise HTTPException(404, "Produto não encontrado.")
    unidades = await ids_unidades(db)
    saldos, minimos, consumos = await mapas_de_estoque(db)
    lotes = (await db.scalars(select(Lote).where(Lote.produto_id == p.id, Lote.unidade_id.in_(eu.unidades))
                              .order_by(Lote.validade))).all()
    precos = await db.execute(
        select(ItemCotacao.preco, Cotacao.id, Cotacao.aprovada_em, Cotacao.criado_em, Fornecedor.id, Fornecedor.nome)
        .join(Cotacao, Cotacao.id == ItemCotacao.cotacao_id)
        .outerjoin(Fornecedor, Fornecedor.id == Cotacao.fornecedor_id)
        .where(ItemCotacao.produto_id == p.id, ItemCotacao.preco.is_not(None),
               Cotacao.status.in_(["aprovada", "recebida"])))
    lista_precos = sorted(({
        "fornecedor_id": str(fid) if fid else "", "fornecedor": fnome or "—", "preco": preco,
        "data": iso(aprovada or criada), "cotacao_id": str(cid),
    } for preco, cid, aprovada, criada, fid, fnome in precos.all()), key=lambda x: x["data"] or "", reverse=True)
    return {
        **view_produto(p, unidades, saldos, minimos, consumos),
        "lotes": [{"id": str(lote.id), "produto_id": str(lote.produto_id), "unidade_id": str(lote.unidade_id),
                   "numero": lote.numero, "validade": iso(lote.validade), "quantidade": lote.quantidade}
                  for lote in lotes],
        "precos": lista_precos,
    }


@router.put("/produtos/{id}/minimos", dependencies=[exigir("catalogo.editar")])
async def salvar_minimos(id: str, eu: EuAtual, db: DB, minimos: dict[str, float] = Body(...)) -> dict:  # noqa: B008
    p = await db.get(Produto, uuid_ou_404(id, "Produto não encontrado."))
    if p is None:
        raise HTTPException(404, "Produto não encontrado.")
    if any(v < 0 for v in minimos.values()):
        raise HTTPException(422, "O mínimo não pode ser negativo.")
    for unidade, valor in minimos.items():
        u = uuid_ou_404(unidade, "Unidade não encontrada.")
        if not eu.ve(u):
            raise HTTPException(403, "Esta unidade não está liberada para você.")
        atual = await db.get(EstoqueMinimo, (p.id, u))
        if atual is None:
            db.add(EstoqueMinimo(produto_id=p.id, unidade_id=u, quantidade=valor))
        else:
            atual.quantidade = valor
    auditoria.registrar(db, eu, "produto.minimos", "produto", p.id, minimos=minimos)
    await db.commit()
    saldos, mins, consumos = await mapas_de_estoque(db)
    return view_produto(p, await ids_unidades(db), saldos, mins, consumos)
