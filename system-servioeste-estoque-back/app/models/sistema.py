"""Auditoria e prévias de importação."""
import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import criado_em, pk


class Auditoria(Base):
    """Quem fez o quê e quando. Gravada na mesma transação da mudança (núcleo III)."""

    __tablename__ = "auditoria"
    id: Mapped[uuid.UUID] = pk()
    pessoa_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid(), index=True)
    pessoa_nome: Mapped[str] = mapped_column(sa.String(160))
    acao: Mapped[str] = mapped_column(sa.String(60))
    entidade: Mapped[str] = mapped_column(sa.String(40))
    entidade_id: Mapped[str | None] = mapped_column(sa.String(64))
    detalhes: Mapped[dict] = mapped_column(sa.JSON, default=dict)
    criado_em: Mapped[datetime] = criado_em()


class Arquivo(Base):
    """Foto da contagem ou anexo de cotação guardado em `ARQUIVOS_DIR` com nome sorteado (spec 005)."""

    __tablename__ = "arquivos"
    id: Mapped[uuid.UUID] = pk()
    nome: Mapped[str] = mapped_column(sa.String(255))  # nome original, só para mostrar
    tipo: Mapped[str] = mapped_column(sa.String(60))  # tipo conferido pelo conteúdo (image/jpeg, application/pdf…)
    tamanho: Mapped[int] = mapped_column(sa.Integer)
    caminho: Mapped[str] = mapped_column(sa.String(255))  # relativo a ARQUIVOS_DIR
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id"), index=True)
    autor: Mapped[str] = mapped_column(sa.String(160))
    criado_em: Mapped[datetime] = criado_em()


class Importacao(Base):
    """Prévia de uma planilha enviada; só vira dados ao confirmar."""

    __tablename__ = "importacoes"
    id: Mapped[uuid.UUID] = pk()
    arquivo: Mapped[str] = mapped_column(sa.String(255))
    tipo: Mapped[str] = mapped_column(sa.String(24))  # declaracao_estoque | cotacao
    unidade_id: Mapped[uuid.UUID] = mapped_column(sa.ForeignKey("unidades.id"))
    responsavel: Mapped[str] = mapped_column(sa.String(160))
    data: Mapped[date] = mapped_column(sa.Date)
    linhas: Mapped[list[dict]] = mapped_column(sa.JSON, default=list)
    criado_em: Mapped[datetime] = criado_em()
