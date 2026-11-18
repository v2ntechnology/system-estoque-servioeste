import uuid

from app.core.config import get_settings
from tests.conftest import hub


async def test_saude(client):
    r = await client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


async def test_admin_do_hub_e_administrador_e_ve_todas_as_unidades(client, como, cenario):
    r = await client.get("/api/v1/eu", headers=como("admin"))
    assert r.status_code == 200
    eu = r.json()
    assert eu["papeis"] == ["administrador"]
    assert set(eu["unidades"]) == {str(cenario["queimados"]), str(cenario["resende"])}


async def test_pessoa_nova_entra_sem_papel_e_sem_unidade(client, cenario):
    r = await client.get("/api/v1/eu", headers=hub(uuid.uuid4(), nome="João Ávila"))
    assert r.json()["papeis"] == [] and r.json()["unidades"] == []
    assert r.json()["nome"] == "João Ávila"  # nome chega em percent-encoding UTF-8


async def test_contador_so_ve_a_sua_unidade(client, como, cenario):
    r = await client.get("/api/v1/unidades", headers=como("contador"))
    assert [u["nome"] for u in r.json()] == ["Queimados"]


async def test_sem_cabecalho_em_producao_e_401(client, cenario, monkeypatch):
    monkeypatch.setattr(get_settings(), "environment", "production")
    r = await client.get("/api/v1/eu")
    assert r.status_code == 401


async def test_sem_cabecalho_em_desenvolvimento_usa_a_pessoa_de_dev(client, cenario):
    r = await client.get("/api/v1/eu")
    assert r.status_code == 200 and r.json()["email"] == get_settings().dev_usuario_email


async def test_origem_de_outro_site_e_recusada(client, como, cenario):
    r = await client.post("/api/v1/movimentacoes", headers={**como("admin"), "Origin": "https://malicioso.example"},
                          json={})
    assert r.status_code == 403 and r.json()["detail"] == "Origem não permitida."
