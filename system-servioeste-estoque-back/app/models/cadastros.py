"""Pessoas (perfil local do Hub), unidades, catálogo, mínimos, saldos e lotes."""
import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import Qtd, criado_em, pk


class Pessoa(Base):
    """Perfil local com o mesmo id do Hub: só o que é do Estoque (papéis e unidades). Sem senha (núcleo IV)."""

    __tablename__ = "pessoas"
    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True)
    email: Mapped[str] = mapped_column(sa.String(255))
    nome: Mapped[str] = mapped_column(sa.String(160))
    # Lista de papéis: contador, comprador, aprovador, administrador.
    papeis: Mapped[list[str]] = mapped_column(sa.JSON, default=list)
    criado_em: Mapped[datetime] = criado_em()


class PessoaUnidade(Base):
    __tablename__ = "pessoa_unidades"
    pessoa_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("pessoas.id", ondelete="CASCADE"), primary_key=True)
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id", ondelete="CASCADE"), primary_key=True)


class Unidade(Base):
    __tablename__ = "unidades"
    id: Mapped[uuid.UUID] = pk()
    nome: Mapped[str] = mapped_column(sa.String(120), unique=True)
    encerramento: Mapped[str] = mapped_column(sa.String(5), default="17:00")  # "HH:MM"
    frequencia_dias: Mapped[int] = mapped_column(sa.Integer, default=7)


class Categoria(Base):
    __tablename__ = "categorias"
    id: Mapped[uuid.UUID] = pk()
    nome: Mapped[str] = mapped_column(sa.String(80), unique=True)


class Produto(Base):
    __tablename__ = "produtos"
    id: Mapped[uuid.UUID] = pk()
    codigo: Mapped[str] = mapped_column(sa.String(40), unique=True)
    nome: Mapped[str] = mapped_column(sa.String(200))
    categoria_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("categorias.id"))
    medida: Mapped[str] = mapped_column(sa.String(10))
    embalagem_nome: Mapped[str | None] = mapped_column(sa.String(40))
    embalagem_quantidade: Mapped[float | None] = mapped_column(Qtd)
    controla_validade: Mapped[bool] = mapped_column(sa.Boolean, default=False)


class EstoqueMinimo(Base):
    __tablename__ = "estoque_minimos"
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id", ondelete="CASCADE"), primary_key=True)
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id", ondelete="CASCADE"), primary_key=True)
    quantidade: Mapped[float] = mapped_column(Qtd, default=0)


class Saldo(Base):
    """Saldo atual por produto e unidade. `quantidade` NULL = nunca contado (princípio VIII; research D3)."""

    __tablename__ = "saldos"
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id", ondelete="CASCADE"), primary_key=True)
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id", ondelete="CASCADE"), primary_key=True)
    quantidade: Mapped[float | None] = mapped_column(Qtd)


class Lote(Base):
    __tablename__ = "lotes"
    id: Mapped[uuid.UUID] = pk()
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id", ondelete="CASCADE"), index=True)
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id", ondelete="CASCADE"))
    numero: Mapped[str] = mapped_column(sa.String(60))
    validade: Mapped[date] = mapped_column(sa.Date)
    quantidade: Mapped[float] = mapped_column(Qtd, default=0)
