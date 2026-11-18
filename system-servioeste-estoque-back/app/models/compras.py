"""Fornecedores, cotações (itens, anexos, eventos) e modelos de cotação."""
import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import Dinheiro, Qtd, criado_em, pk


class Fornecedor(Base):
    __tablename__ = "fornecedores"
    id: Mapped[uuid.UUID] = pk()
    nome: Mapped[str] = mapped_column(sa.String(200))
    contato: Mapped[str] = mapped_column(sa.String(120), default="")
    telefone: Mapped[str] = mapped_column(sa.String(40), default="")
    categorias: Mapped[list[str]] = mapped_column(sa.JSON, default=list)  # ids de categorias


class Cotacao(Base):
    __tablename__ = "cotacoes"
    id: Mapped[uuid.UUID] = pk()
    numero: Mapped[int] = mapped_column(sa.Integer, unique=True)
    titulo: Mapped[str] = mapped_column(sa.String(200))
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id"), index=True)
    status: Mapped[str] = mapped_column(sa.String(10), default="rascunho")  # rascunho|enviada|aprovada|recebida
    fornecedor_id: Mapped[uuid.UUID | None] = mapped_column(sa.ForeignKey("fornecedores.id"))
    observacao: Mapped[str] = mapped_column(sa.Text, default="")
    aprovada_por: Mapped[str | None] = mapped_column(sa.String(160))
    aprovada_em: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    criado_em: Mapped[datetime] = criado_em()


class ItemCotacao(Base):
    __tablename__ = "itens_cotacao"
    cotacao_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("cotacoes.id", ondelete="CASCADE"), primary_key=True)
    produto_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("produtos.id"), primary_key=True)
    ordem: Mapped[int] = mapped_column(sa.Integer, default=0)
    quantidade: Mapped[float] = mapped_column(Qtd)
    preco: Mapped[float | None] = mapped_column(Dinheiro)


class AnexoCotacao(Base):
    __tablename__ = "anexos_cotacao"
    id: Mapped[uuid.UUID] = pk()
    cotacao_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("cotacoes.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(sa.String(12))  # proposta | nota_fiscal | boleto
    nome: Mapped[str] = mapped_column(sa.String(255))
    arquivo_id: Mapped[uuid.UUID | None] = mapped_column(sa.ForeignKey("arquivos.id"))
    autor: Mapped[str] = mapped_column(sa.String(160))
    enviado_em: Mapped[datetime] = criado_em()


class EventoCotacao(Base):
    __tablename__ = "eventos_cotacao"
    id: Mapped[uuid.UUID] = pk()
    cotacao_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("cotacoes.id", ondelete="CASCADE"), index=True)
    autor: Mapped[str] = mapped_column(sa.String(160))
    descricao: Mapped[str] = mapped_column(sa.String(255))
    data: Mapped[datetime] = criado_em()


class ModeloCotacao(Base):
    __tablename__ = "modelos_cotacao"
    id: Mapped[uuid.UUID] = pk()
    nome: Mapped[str] = mapped_column(sa.String(120))
    # [{"produto_id": "...", "quantidade": 12}]
    itens: Mapped[list[dict]] = mapped_column(sa.JSON, default=list)
