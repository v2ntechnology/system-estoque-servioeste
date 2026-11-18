"""Dependências das rotas: banco, pessoa da sessão (vinda do Hub) e permissão do papel.

Identidade (núcleo IV, contrato do Hub): o Caddy repassa `X-Hub-User-Id`, `-Email`, `-Name` (percent-encoding) e
`-Role`. O Estoque guarda só um perfil local com o mesmo id (papéis e unidades). Em desenvolvimento, sem os cabeçalhos,
usa a pessoa `DEV_USUARIO_*`; em produção isso não existe e a resposta é 401 (spec 004, research D2).
"""
import uuid
from dataclasses import dataclass
from typing import Annotated
from urllib.parse import unquote

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.models import Pessoa, PessoaUnidade, Unidade
from app.papeis import pode

DB = Annotated[AsyncSession, Depends(get_db)]


@dataclass
class Eu:
    id: uuid.UUID
    nome: str
    email: str
    papeis: list[str]
    unidades: list[uuid.UUID]

    def ve(self, unidade_id: uuid.UUID) -> bool:
        return unidade_id in self.unidades

    def json(self) -> dict:
        return {"id": str(self.id), "nome": self.nome, "email": self.email, "papeis": self.papeis,
                "unidades": [str(u) for u in self.unidades]}


def _identidade(request: Request) -> tuple[uuid.UUID, str, str, str]:
    h = request.headers
    bruto = h.get("x-hub-user-id")
    if not bruto:
        s = get_settings()
        if s.is_production:
            raise HTTPException(401, "Sessão do Hub não encontrada. Entre pelo Hub de novo.")
        return s.dev_usuario_id, s.dev_usuario_email, s.dev_usuario_nome, s.dev_usuario_papel_hub
    try:
        pessoa_id = uuid.UUID(bruto)
    except ValueError as e:
        raise HTTPException(401, "Identidade do Hub inválida.") from e
    email = h.get("x-hub-user-email", "")
    return pessoa_id, email, unquote(h.get("x-hub-user-name", "")) or email, h.get("x-hub-user-role", "usuario")


async def pessoa_atual(request: Request, db: DB) -> Eu:
    pessoa_id, email, nome, papel_hub = _identidade(request)
    pessoa = await db.get(Pessoa, pessoa_id)
    if pessoa is None:
        pessoa = Pessoa(id=pessoa_id, email=email, nome=nome, papeis=[])
        db.add(pessoa)
        await db.commit()
    elif (pessoa.email, pessoa.nome) != (email, nome):
        pessoa.email, pessoa.nome = email, nome
        await db.commit()

    papeis = list(pessoa.papeis or [])
    # Quem administra o Hub administra o Estoque (spec 004, história 1).
    if papel_hub == "admin" and "administrador" not in papeis:
        papeis.append("administrador")
    if "administrador" in papeis:
        unidades = list((await db.scalars(select(Unidade.id).order_by(Unidade.nome))).all())
    else:
        unidades = list((await db.scalars(
            select(PessoaUnidade.unidade_id).join(Unidade, Unidade.id == PessoaUnidade.unidade_id)
            .where(PessoaUnidade.pessoa_id == pessoa_id).order_by(Unidade.nome))).all())
    return Eu(id=pessoa_id, nome=nome, email=email, papeis=papeis, unidades=unidades)


EuAtual = Annotated[Eu, Depends(pessoa_atual)]


def exigir(acao: str):
    """Dependência que recusa com 403 quando nenhum papel da pessoa permite a ação."""

    async def _conferir(eu: EuAtual) -> Eu:
        if not pode(eu.papeis, acao):
            raise HTTPException(403, "Seu papel não permite esta ação.")
        return eu

    return Depends(_conferir)


def unidades_visiveis(eu: Eu, unidade: str | None) -> list[uuid.UUID]:
    """Unidades liberadas, opcionalmente filtradas por ?unidade= (uma unidade não liberada vira lista vazia)."""
    if not unidade:
        return eu.unidades
    try:
        u = uuid.UUID(unidade)
    except ValueError:
        return []
    return [u] if eu.ve(u) else []


def uuid_ou_404(valor: str, mensagem: str) -> uuid.UUID:
    try:
        return uuid.UUID(valor)
    except ValueError as e:
        raise HTTPException(404, mensagem) from e
