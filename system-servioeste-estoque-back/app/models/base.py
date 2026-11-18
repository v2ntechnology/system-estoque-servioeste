import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.core.tempo import agora

# Quantidades e valores: Numeric no banco, float no Python (spec 004, research D4).
Qtd = sa.Numeric(14, 3, asdecimal=False)
Dinheiro = sa.Numeric(14, 2, asdecimal=False)


def pk() -> Mapped[uuid.UUID]:
    return mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)


def criado_em() -> Mapped[datetime]:
    return mapped_column(sa.DateTime(timezone=True), default=agora, nullable=False)
