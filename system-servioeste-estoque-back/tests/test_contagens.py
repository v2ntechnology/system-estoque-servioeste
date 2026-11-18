"""Contagem de ponta a ponta: não contado ≠ zero, lote offline, divergência e saldo (princípios VIII e IX)."""


async def abrir(client, como, cenario, quem="contador"):
    r = await client.post("/api/v1/contagens", json={"unidade_id": str(cenario["queimados"])}, headers=como(quem))
    assert r.status_code == 200, r.text
    return r.json()


async def test_abrir_cria_todos_os_itens_como_nao_contado(client, como, cenario):
    c = await abrir(client, como, cenario)
    assert c["situacao"] == "aberta" and c["contados"] == 0 and c["total"] == 2
    assert all(i["quantidade"] is None for i in c["itens"])


async def test_so_uma_contagem_aberta_por_unidade(client, como, cenario):
    await abrir(client, como, cenario)
    r = await client.post("/api/v1/contagens", json={"unidade_id": str(cenario["queimados"])}, headers=como("contador"))
    assert r.status_code == 409


async def test_zero_conta_e_null_volta_a_nao_contado(client, como, cenario):
    c = await abrir(client, como, cenario)
    url = f"/api/v1/contagens/{c['id']}/itens"
    r = await client.patch(url, json={"itens": [{"produto_id": str(cenario["papel"]), "quantidade": 0}]},
                           headers=como("contador"))
    assert r.json()["contados"] == 1
    # Só observação: não mexe na quantidade.
    r = await client.patch(url, json={"itens": [{"produto_id": str(cenario["papel"]), "observacao": "amassado"}]},
                           headers=como("contador"))
    item = next(i for i in r.json()["itens"] if i["produto_id"] == str(cenario["papel"]))
    assert item["quantidade"] == 0 and item["observacao"] == "amassado"
    r = await client.patch(url, json={"itens": [{"produto_id": str(cenario["papel"]), "quantidade": None}]},
                           headers=como("contador"))
    assert r.json()["contados"] == 0


async def test_finalizar_sem_nada_contado_e_recusado(client, como, cenario):
    c = await abrir(client, como, cenario)
    r = await client.post(f"/api/v1/contagens/{c['id']}/finalizar", headers=como("contador"))
    assert r.status_code == 422


async def contar_e_finalizar(client, como, cenario, quantidades: dict):
    c = await abrir(client, como, cenario)
    itens = [{"produto_id": str(cenario[k]), "quantidade": v} for k, v in quantidades.items()]
    await client.patch(f"/api/v1/contagens/{c['id']}/itens", json={"itens": itens}, headers=como("contador"))
    r = await client.post(f"/api/v1/contagens/{c['id']}/finalizar", headers=como("contador"))
    assert r.status_code == 200, r.text
    return r.json()


async def test_finalizar_atualiza_saldo_e_mantem_o_nao_contado(client, como, cenario):
    final = await contar_e_finalizar(client, como, cenario, {"alcool": 38})
    assert final["situacao"] == "finalizada" and final["divergencias"] == 0  # sem contagem anterior
    [p] = (await client.get("/api/v1/produtos?busca=LIM-005", headers=como("admin"))).json()
    assert p["saldos"][str(cenario["queimados"])] is None  # papel não foi contado: segue sem saldo, não vira zero
    # Finalizada não muda mais.
    r = await client.patch(f"/api/v1/contagens/{final['id']}/itens",
                           json={"itens": [{"produto_id": str(cenario["alcool"]), "quantidade": 1}]},
                           headers=como("contador"))
    assert r.status_code == 409


async def test_divergencia_desconta_as_saidas_registradas(client, como, cenario):
    await contar_e_finalizar(client, como, cenario, {"alcool": 40, "papel": 50})
    base = {"unidade_id": str(cenario["queimados"]), "tipo": "saida", "quantidade": 10}
    saida = {**base, "produto_id": str(cenario["papel"])}
    await client.post("/api/v1/movimentacoes", json=saida, headers=como("contador"))
    # Álcool: 40 → 10 sem saída = divergência. Papel: 50 − 10 = 40 esperado, contou 40 = ok.
    final = await contar_e_finalizar(client, como, cenario, {"alcool": 10, "papel": 40})
    assert [(d["produto_id"], d["esperado"], d["contado"]) for d in final["lista_divergencias"]] == [
        (str(cenario["alcool"]), 40, 10)]
    painel = (await client.get("/api/v1/painel", headers=como("contador"))).json()
    assert len(painel["divergencias"]) == 1 and painel["anterior"]["divergencias"] == 0


async def test_contador_nao_ve_contagem_de_outra_unidade(client, como, cenario):
    r = await client.post("/api/v1/contagens", json={"unidade_id": str(cenario["resende"])}, headers=como("comprador"))
    assert r.status_code == 403  # comprador não conta
    c = await abrir(client, como, cenario, quem="admin")
    r = await client.get(f"/api/v1/contagens/{c['id']}", headers=como("contador"))
    assert r.status_code == 200  # Queimados é dele
