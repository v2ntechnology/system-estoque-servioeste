from app.core.config import get_settings
from app.seed import semear


async def test_seed_gera_a_demonstracao_e_a_ana_e_a_pessoa_de_dev(client, sessionmaker):
    async with sessionmaker() as s:
        assert "gravados" in await semear(s)
        assert "já tem dados" in await semear(s)  # não duplica
    eu = (await client.get("/api/v1/eu")).json()  # sem cabeçalho: pessoa de desenvolvimento
    assert eu["id"] == str(get_settings().dev_usuario_id) and eu["papeis"] == ["administrador"]
    assert len(eu["unidades"]) == 3
    painel = (await client.get("/api/v1/painel")).json()
    assert painel["divergencias"] and painel["cotacoes_abertas"] and any(c["aberta_id"] for c in painel["contagens"])
    assert len((await client.get("/api/v1/produtos")).json()) == 24
