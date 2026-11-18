"""Banco SQLite em memória (sem Alembic), cliente com Origin permitido e atalhos para montar o cenário."""
import uuid
from urllib.parse import quote

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.db import Base, get_db
from app.main import app
from app.models import Categoria, EstoqueMinimo, Pessoa, PessoaUnidade, Produto, Saldo, Unidade

ORIGIN = "http://localhost:5177"


@pytest.fixture(autouse=True)
def pasta_de_arquivos(tmp_path, monkeypatch):
    """Fotos e anexos dos testes vão para uma pasta temporária, nunca para a do projeto."""
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "arquivos_dir", str(tmp_path / "arquivos"))


@pytest.fixture
async def sessionmaker():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    # O SQLite não confere chaves estrangeiras por padrão; o Postgres confere. Ligamos para os testes pegarem a ordem
    # errada de gravação (achado na spec 005: anexo gravado antes do arquivo).
    @event.listens_for(engine.sync_engine, "connect")
    def _chaves_estrangeiras(conexao, _):
        conexao.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@pytest.fixture
async def client(sessionmaker):
    async def _db():
        async with sessionmaker() as s:
            yield s

    app.dependency_overrides[get_db] = _db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers={"Origin": ORIGIN}) as c:
        yield c
    app.dependency_overrides.clear()


def hub(pessoa_id: uuid.UUID, nome="Pessoa Teste", email="pessoa@exemplo.com.br", papel_hub="usuario") -> dict:
    """Cabeçalhos que o Caddy repassa depois do forward_auth do Hub."""
    return {"X-Hub-User-Id": str(pessoa_id), "X-Hub-User-Email": email, "X-Hub-User-Name": quote(nome, safe=""),
            "X-Hub-User-Role": papel_hub}


@pytest.fixture
async def cenario(sessionmaker):
    """Duas unidades, uma categoria, dois produtos (um com embalagem) e quatro pessoas, uma por papel."""
    async with sessionmaker() as s:
        q = Unidade(nome="Queimados", encerramento="17:00", frequencia_dias=7)
        r = Unidade(nome="Resende", encerramento="17:00", frequencia_dias=15)
        cat = Categoria(nome="Limpeza")
        s.add_all([q, r, cat])
        await s.flush()
        alcool = Produto(codigo="LIM-001", nome="Álcool 70% 1 L", categoria_id=cat.id, medida="UN",
                         embalagem_nome="caixa", embalagem_quantidade=12, controla_validade=True)
        papel = Produto(codigo="LIM-005", nome="Papel higiênico", categoria_id=cat.id, medida="RL")
        s.add_all([alcool, papel])
        await s.flush()
        for p in (alcool, papel):
            for u in (q, r):
                s.add(EstoqueMinimo(produto_id=p.id, unidade_id=u.id, quantidade=10))
        s.add(Saldo(produto_id=alcool.id, unidade_id=q.id, quantidade=40))
        pessoas = {}
        for papel_estoque, unidades in (("contador", [q]), ("comprador", [q, r]), ("aprovador", [q, r])):
            pessoa = Pessoa(id=uuid.uuid4(), email=f"{papel_estoque}@exemplo.com.br", nome=papel_estoque.title(),
                            papeis=[papel_estoque])
            s.add(pessoa)
            await s.flush()
            for u in unidades:
                s.add(PessoaUnidade(pessoa_id=pessoa.id, unidade_id=u.id))
            pessoas[papel_estoque] = pessoa.id
        await s.commit()
    return {"queimados": q.id, "resende": r.id, "categoria": cat.id, "alcool": alcool.id, "papel": papel.id,
            "admin": uuid.uuid4(), **pessoas}


@pytest.fixture
def como(cenario):
    """`como("contador")` devolve os cabeçalhos do Hub daquela pessoa; "admin" é administrador no Hub."""
    def _como(quem: str) -> dict:
        return hub(cenario[quem], nome=quem.title(), email=f"{quem}@exemplo.com.br",
                   papel_hub="admin" if quem == "admin" else "usuario")
    return _como
