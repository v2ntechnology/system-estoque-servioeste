"""Contagens, itens, divergências e movimentações. Nada aqui é apagado pela API (princípio IX)."""
import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import Qtd, criado_em, pk


class Contagem(Base):
    __tablename__ = "contagens"
    id: Mapped[uuid.UUID] = pk()
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id"), index=True)
    data: Mapped[date] = mapped_column(sa.Date)
    responsavel: Mapped[str] = mapped_column(sa.String(200))
    responsavel_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid())
    situacao: Mapped[str] = mapped_column(sa.String(12), default="aberta")  # aberta | finalizada
    finalizada_em: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    criado_em: Mapped[datetime] = criado_em()


class ItemContagem(Base):
    __tablename__ = "itens_contagem"
    contagem_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("contagens.id", ondelete="CASCADE"), primary_key=True)
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id"), primary_key=True)
    # NULL = não contado; zero só quando digitado (princípio VIII).
    quantidade: Mapped[float | None] = mapped_column(Qtd)
    observacao: Mapped[str] = mapped_column(sa.Text, default="")
    foto: Mapped[str | None] = mapped_column(sa.String(255))


class Divergencia(Base):
    __tablename__ = "divergencias"
    contagem_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("contagens.id", ondelete="CASCADE"), primary_key=True)
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id"), primary_key=True)
    anterior: Mapped[float] = mapped_column(Qtd)
    entradas: Mapped[float] = mapped_column(Qtd)
    saidas: Mapped[float] = mapped_column(Qtd)
    esperado: Mapped[float] = mapped_column(Qtd)
    contado: Mapped[float] = mapped_column(Qtd)


class Movimentacao(Base):
    __tablename__ = "movimentacoes"
    __table_args__ = (sa.Index("ix_mov_unidade_data", "unidade_id", "data"),)
    id: Mapped[uuid.UUID] = pk()
    tipo: Mapped[str] = mapped_column(sa.String(8))  # entrada | saida
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id"), index=True)
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id"))
    quantidade: Mapped[float] = mapped_column(Qtd)
    data: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
    origem: Mapped[str] = mapped_column(sa.String(12), default="manual")  # manual | cotacao | importacao
    referencia: Mapped[str | None] = mapped_column(sa.String(64))
    observacao: Mapped[str] = mapped_column(sa.Text, default="")
    autor: Mapped[str] = mapped_column(sa.String(160))
    autor_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid())
