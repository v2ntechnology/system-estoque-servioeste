"""pessoas, unidades, catálogo, saldos, lotes, contagens, movimentações, cotações, importação e auditoria

Revision ID: 0001
Revises:
Create Date: 2026-11-18
"""
import sqlalchemy as sa
from alembic import op

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('auditoria',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('pessoa_id', sa.Uuid(), nullable=True),
    sa.Column('pessoa_nome', sa.String(length=160), nullable=False),
    sa.Column('acao', sa.String(length=60), nullable=False),
    sa.Column('entidade', sa.String(length=40), nullable=False),
    sa.Column('entidade_id', sa.String(length=64), nullable=True),
    sa.Column('detalhes', sa.JSON(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_auditoria_pessoa_id'), 'auditoria', ['pessoa_id'], unique=False)
    op.create_table('categorias',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=80), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('nome')
    )
    op.create_table('fornecedores',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=200), nullable=False),
    sa.Column('contato', sa.String(length=120), nullable=False),
    sa.Column('telefone', sa.String(length=40), nullable=False),
    sa.Column('categorias', sa.JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('modelos_cotacao',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=120), nullable=False),
    sa.Column('itens', sa.JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('pessoas',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('nome', sa.String(length=160), nullable=False),
    sa.Column('papeis', sa.JSON(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('unidades',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=120), nullable=False),
    sa.Column('encerramento', sa.String(length=5), nullable=False),
    sa.Column('frequencia_dias', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('nome')
    )
    op.create_table('contagens',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('data', sa.Date(), nullable=False),
    sa.Column('responsavel', sa.String(length=200), nullable=False),
    sa.Column('responsavel_id', sa.Uuid(), nullable=True),
    sa.Column('situacao', sa.String(length=12), nullable=False),
    sa.Column('finalizada_em', sa.DateTime(timezone=True), nullable=True),
    sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contagens_unidade_id'), 'contagens', ['unidade_id'], unique=False)
    op.create_table('cotacoes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('titulo', sa.String(length=200), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('fornecedor_id', sa.Uuid(), nullable=True),
    sa.Column('observacao', sa.Text(), nullable=False),
    sa.Column('aprovada_por', sa.String(length=160), nullable=True),
    sa.Column('aprovada_em', sa.DateTime(timezone=True), nullable=True),
    sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['fornecedor_id'], ['fornecedores.id'], ),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('numero')
    )
    op.create_index(op.f('ix_cotacoes_unidade_id'), 'cotacoes', ['unidade_id'], unique=False)
    op.create_table('importacoes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('arquivo', sa.String(length=255), nullable=False),
    sa.Column('tipo', sa.String(length=24), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('responsavel', sa.String(length=160), nullable=False),
    sa.Column('data', sa.Date(), nullable=False),
    sa.Column('linhas', sa.JSON(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('pessoa_unidades',
    sa.Column('pessoa_id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('pessoa_id', 'unidade_id')
    )
    op.create_table('produtos',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('codigo', sa.String(length=40), nullable=False),
    sa.Column('nome', sa.String(length=200), nullable=False),
    sa.Column('categoria_id', sa.Uuid(), nullable=False),
    sa.Column('medida', sa.String(length=10), nullable=False),
    sa.Column('embalagem_nome', sa.String(length=40), nullable=True),
    sa.Column('embalagem_quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=True),
    sa.Column('controla_validade', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['categoria_id'], ['categorias.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('codigo')
    )
    op.create_table('anexos_cotacao',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('cotacao_id', sa.Uuid(), nullable=False),
    sa.Column('tipo', sa.String(length=12), nullable=False),
    sa.Column('nome', sa.String(length=255), nullable=False),
    sa.Column('autor', sa.String(length=160), nullable=False),
    sa.Column('enviado_em', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['cotacao_id'], ['cotacoes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_anexos_cotacao_cotacao_id'), 'anexos_cotacao', ['cotacao_id'], unique=False)
    op.create_table('divergencias',
    sa.Column('contagem_id', sa.Uuid(), nullable=False),
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('anterior', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('entradas', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('saidas', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('esperado', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('contado', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.ForeignKeyConstraint(['contagem_id'], ['contagens.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ),
    sa.PrimaryKeyConstraint('contagem_id', 'produto_id')
    )
    op.create_table('estoque_minimos',
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('produto_id', 'unidade_id')
    )
    op.create_table('eventos_cotacao',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('cotacao_id', sa.Uuid(), nullable=False),
    sa.Column('autor', sa.String(length=160), nullable=False),
    sa.Column('descricao', sa.String(length=255), nullable=False),
    sa.Column('data', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['cotacao_id'], ['cotacoes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eventos_cotacao_cotacao_id'), 'eventos_cotacao', ['cotacao_id'], unique=False)
    op.create_table('itens_contagem',
    sa.Column('contagem_id', sa.Uuid(), nullable=False),
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=True),
    sa.Column('observacao', sa.Text(), nullable=False),
    sa.Column('foto', sa.String(length=255), nullable=True),
    sa.ForeignKeyConstraint(['contagem_id'], ['contagens.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ),
    sa.PrimaryKeyConstraint('contagem_id', 'produto_id')
    )
    op.create_table('itens_cotacao',
    sa.Column('cotacao_id', sa.Uuid(), nullable=False),
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('ordem', sa.Integer(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('preco', sa.Numeric(precision=14, scale=2, asdecimal=False), nullable=True),
    sa.ForeignKeyConstraint(['cotacao_id'], ['cotacoes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ),
    sa.PrimaryKeyConstraint('cotacao_id', 'produto_id')
    )
    op.create_table('lotes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('numero', sa.String(length=60), nullable=False),
    sa.Column('validade', sa.Date(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lotes_produto_id'), 'lotes', ['produto_id'], unique=False)
    op.create_table('movimentacoes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('tipo', sa.String(length=8), nullable=False),
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=False),
    sa.Column('data', sa.DateTime(timezone=True), nullable=False),
    sa.Column('origem', sa.String(length=12), nullable=False),
    sa.Column('referencia', sa.String(length=64), nullable=True),
    sa.Column('observacao', sa.Text(), nullable=False),
    sa.Column('autor', sa.String(length=160), nullable=False),
    sa.Column('autor_id', sa.Uuid(), nullable=True),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mov_unidade_data', 'movimentacoes', ['unidade_id', 'data'], unique=False)
    op.create_index(op.f('ix_movimentacoes_produto_id'), 'movimentacoes', ['produto_id'], unique=False)
    op.create_table('saldos',
    sa.Column('produto_id', sa.Uuid(), nullable=False),
    sa.Column('unidade_id', sa.Uuid(), nullable=False),
    sa.Column('quantidade', sa.Numeric(precision=14, scale=3, asdecimal=False), nullable=True),
    sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['unidade_id'], ['unidades.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('produto_id', 'unidade_id')
    )


def downgrade() -> None:
    op.drop_table('saldos')
    op.drop_index(op.f('ix_movimentacoes_produto_id'), table_name='movimentacoes')
    op.drop_index('ix_mov_unidade_data', table_name='movimentacoes')
    op.drop_table('movimentacoes')
    op.drop_index(op.f('ix_lotes_produto_id'), table_name='lotes')
    op.drop_table('lotes')
    op.drop_table('itens_cotacao')
    op.drop_table('itens_contagem')
    op.drop_index(op.f('ix_eventos_cotacao_cotacao_id'), table_name='eventos_cotacao')
    op.drop_table('eventos_cotacao')
    op.drop_table('estoque_minimos')
    op.drop_table('divergencias')
    op.drop_index(op.f('ix_anexos_cotacao_cotacao_id'), table_name='anexos_cotacao')
    op.drop_table('anexos_cotacao')
    op.drop_table('produtos')
    op.drop_table('pessoa_unidades')
    op.drop_table('importacoes')
    op.drop_index(op.f('ix_cotacoes_unidade_id'), table_name='cotacoes')
    op.drop_table('cotacoes')
    op.drop_index(op.f('ix_contagens_unidade_id'), table_name='contagens')
    op.drop_table('contagens')
    op.drop_table('unidades')
    op.drop_table('pessoas')
    op.drop_table('modelos_cotacao')
    op.drop_table('fornecedores')
    op.drop_table('categorias')
    op.drop_index(op.f('ix_auditoria_pessoa_id'), table_name='auditoria')
    op.drop_table('auditoria')
