from sqlalchemy import select

from app.models import Auditoria


async def test_catalogo_traz_saldo_minimo_e_nao_contado(client, como, cenario):
    r = await client.get("/api/v1/produtos?busca=alcool", headers=como("admin"))  # busca sem acento acha "Álcool"
    [p] = r.json()
    q, res = str(cenario["queimados"]), str(cenario["resende"])
    assert p["saldos"] == {q: 40, res: None}  # Resende nunca contou: None, não zero
    assert p["minimos"][q] == 10 and p["embalagem"] == {"nome": "caixa", "quantidade": 12}


async def test_minimo_so_com_papel_de_catalogo(client, como, cenario):
    url = f"/api/v1/produtos/{cenario['alcool']}/minimos"
    corpo = {str(cenario["queimados"]): 25}
    assert (await client.put(url, json=corpo, headers=como("contador"))).status_code == 403
    r = await client.put(url, json=corpo, headers=como("comprador"))
    assert r.status_code == 200 and r.json()["minimos"][str(cenario["queimados"])] == 25


async def test_movimentacao_muda_o_saldo_e_audita(client, como, cenario, sessionmaker):
    base = {"produto_id": str(cenario["alcool"]), "unidade_id": str(cenario["queimados"]), "observacao": ""}
    assert (await client.post("/api/v1/movimentacoes", json={**base, "tipo": "saida", "quantidade": 15},
                              headers=como("contador"))).status_code == 200
    entrada = {**base, "tipo": "entrada", "quantidade": 5}
    await client.post("/api/v1/movimentacoes", json=entrada, headers=como("contador"))
    [p] = (await client.get("/api/v1/produtos?busca=LIM-001", headers=como("admin"))).json()
    assert p["saldos"][str(cenario["queimados"])] == 30
    async with sessionmaker() as s:
        acoes = (await s.scalars(select(Auditoria.acao))).all()
    assert "movimentacao.saida" in acoes and "movimentacao.entrada" in acoes


async def test_movimentacao_em_unidade_nao_liberada_e_recusada(client, como, cenario):
    corpo = {"produto_id": str(cenario["alcool"]), "unidade_id": str(cenario["resende"]), "tipo": "saida",
             "quantidade": 1}
    r = await client.post("/api/v1/movimentacoes", json=corpo, headers=como("contador"))
    assert r.status_code == 403


async def test_aprovador_nao_registra_movimentacao(client, como, cenario):
    corpo = {"produto_id": str(cenario["alcool"]), "unidade_id": str(cenario["queimados"]), "tipo": "saida",
             "quantidade": 1}
    r = await client.post("/api/v1/movimentacoes", json=corpo, headers=como("aprovador"))
    assert r.status_code == 403 and r.json()["detail"] == "Seu papel não permite esta ação."


async def test_painel_lista_abaixo_do_minimo(client, como, cenario):
    base = {"produto_id": str(cenario["alcool"]), "unidade_id": str(cenario["queimados"]), "tipo": "saida"}
    await client.post("/api/v1/movimentacoes", json={**base, "quantidade": 35}, headers=como("contador"))
    r = (await client.get("/api/v1/painel", headers=como("contador"))).json()
    assert [(i["produto_id"], i["saldo"], i["minimo"]) for i in r["abaixo_minimo"]] == [(str(cenario["alcool"]), 5, 10)]
    assert r["contagens"][0]["aberta_id"] is None
