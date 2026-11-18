"""Entradas e saídas por unidade. Nunca apagadas (princípio IX)."""
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, EuAtual, exigir, unidades_visiveis, uuid_ou_404
from app.core.tempo import agora
from app.models import Movimentacao, Produto
from app.services import auditoria
from app.services.estoque import aplicar_movimentacao, view_movimentacao

router = APIRouter(prefix="/api/v1")


@router.get("/movimentacoes")
async def listar(eu: EuAtual, db: DB, unidade: str = "", tipo: str = "", produto: str = "") -> list[dict]:
    consulta = select(Movimentacao).where(Movimentacao.unidade_id.in_(unidades_visiveis(eu, unidade)))
    if tipo in ("entrada", "saida"):
        consulta = consulta.where(Movimentacao.tipo == tipo)
    if produto:
        consulta = consulta.where(Movimentacao.produto_id == uuid_ou_404(produto, "Produto não encontrado."))
    lista = (await db.scalars(consulta.order_by(Movimentacao.data.desc()).limit(300))).all()
    return [view_movimentacao(m) for m in lista]


class NovaMovimentacao(BaseModel):
    tipo: str
    produto_id: uuid.UUID
    unidade_id: uuid.UUID
    quantidade: float
    observacao: str = ""


@router.post("/movimentacoes", dependencies=[exigir("movimentacao.registrar")])
async def registrar(corpo: NovaMovimentacao, eu: EuAtual, db: DB) -> dict:
    if corpo.tipo not in ("entrada", "saida"):
        raise HTTPException(422, "Tipo inválido: use entrada ou saída.")
    if not eu.ve(corpo.unidade_id):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    if await db.get(Produto, corpo.produto_id) is None:
        raise HTTPException(422, "Escolha um produto do catálogo.")
    if corpo.quantidade <= 0:
        raise HTTPException(422, "A quantidade precisa ser maior que zero.")
    m = Movimentacao(tipo=corpo.tipo, produto_id=corpo.produto_id, unidade_id=corpo.unidade_id,
                     quantidade=corpo.quantidade, data=agora(), origem="manual", observacao=corpo.observacao,
                     autor=eu.nome, autor_id=eu.id)
    db.add(m)
    await db.flush()
    await aplicar_movimentacao(db, m)
    auditoria.registrar(db, eu, f"movimentacao.{corpo.tipo}", "movimentacao", m.id, quantidade=corpo.quantidade)
    await db.commit()
    return view_movimentacao(m)
