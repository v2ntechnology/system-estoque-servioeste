from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Eu
from app.models import Auditoria


def registrar(db: AsyncSession, eu: Eu, acao: str, entidade: str, entidade_id: object = None, **detalhes) -> None:
    """Só faz `db.add`: quem chama faz o commit junto com a mudança auditada (mesmo padrão do Hub; núcleo III)."""
    db.add(Auditoria(pessoa_id=eu.id, pessoa_nome=eu.nome, acao=acao, entidade=entidade,
                     entidade_id=str(entidade_id) if entidade_id is not None else None, detalhes=detalhes))
