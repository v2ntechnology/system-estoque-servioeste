"""arquivos (fotos da contagem e anexos de cotação) e vínculo do anexo com o arquivo

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-18
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "arquivos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("tipo", sa.String(length=60), nullable=False),
        sa.Column("tamanho", sa.Integer(), nullable=False),
        sa.Column("caminho", sa.String(length=255), nullable=False),
        sa.Column("unidade_id", sa.Uuid(), nullable=False),
        sa.Column("autor", sa.String(length=160), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["unidade_id"], ["unidades.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_arquivos_unidade_id", "arquivos", ["unidade_id"])
    # batch: o SQLite (api-local) não aceita ALTER de chave estrangeira; no Postgres vira ALTER TABLE normal.
    with op.batch_alter_table("anexos_cotacao") as t:
        t.add_column(sa.Column("arquivo_id", sa.Uuid(), nullable=True))
        t.create_foreign_key("fk_anexos_cotacao_arquivo", "arquivos", ["arquivo_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("anexos_cotacao") as t:
        t.drop_constraint("fk_anexos_cotacao_arquivo", type_="foreignkey")
        t.drop_column("arquivo_id")
    op.drop_index("ix_arquivos_unidade_id", table_name="arquivos")
    op.drop_table("arquivos")
