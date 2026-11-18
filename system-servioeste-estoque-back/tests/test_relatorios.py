from datetime import date

from app.core.tempo import hoje
from app.models import Importacao


async def test_serie_por_dia_e_por_mes(client, como, cenario):
    q = str(cenario["queimados"])
    base = {"produto_id": str(cenario["alcool"]), "unidade_id": q, "tipo": "saida"}
    await client.post("/api/v1/movimentacoes", json={**base, "quantidade": 3}, headers=como("contador"))
    await client.post("/api/v1/movimentacoes", json={**base, "quantidade": 2}, headers=como("contador"))
    mes = hoje().strftime("%Y-%m")
    dia = (await client.get(f"/api/v1/relatorios/serie?unidade={q}&metrica=saidas&escala=dia&mes={mes}",
                            headers=como("comprador"))).json()
    assert dia["pontos"][-1] == {"periodo": hoje().isoformat(), "valor": 5}
    assert len(dia["pontos"]) == hoje().day
    assert dia["por_categoria"] == [{"categoria_id": str(cenario["categoria"]), "valor": 5}]
    meses = (await client.get(f"/api/v1/relatorios/serie?unidade={q}&metrica=saidas&escala=mes&mes={mes}",
                              headers=como("comprador"))).json()
    assert len(meses["pontos"]) == 6 and meses["pontos"][-1] == {"periodo": mes, "valor": 5}


async def test_mensal_soma_entradas_e_saidas(client, como, cenario):
    q = str(cenario["queimados"])
    base = {"produto_id": str(cenario["alcool"]), "unidade_id": q}
    saida = {**base, "tipo": "saida", "quantidade": 10}
    await client.post("/api/v1/movimentacoes", json=saida, headers=como("contador"))
    r = (await client.get(f"/api/v1/relatorios/mensal?unidade={q}", headers=como("comprador"))).json()
    assert r["totais"]["saidas"] == 10
    alcool = next(linha for linha in r["linhas"] if linha["produto_id"] == str(cenario["alcool"]))
    assert alcool["saidas"] == 10 and alcool["saldo_final"] == 30


async def test_unidade_nao_liberada_e_recusada(client, como, cenario):
    r = await client.get(f"/api/v1/relatorios/mensal?unidade={cenario['resende']}", headers=como("contador"))
    assert r.status_code == 403


async def test_envio_de_planilha_ainda_nao_disponivel(client, como, cenario):
    r = await client.post("/api/v1/importacao/planilha", headers=como("admin"),
                          files={"arquivo": ("declaracao.xlsx", b"x", "application/octet-stream")})
    assert r.status_code == 501


async def test_confirmar_previa_cria_contagem_sem_transformar_vazio_em_zero(client, como, cenario, sessionmaker):
    linhas = [
        {"linha": 6, "codigo": "LIM-001", "nome": "ALCOOL", "quantidade": 12, "medida": "UN", "observacao": "",
         "produto_id": str(cenario["alcool"]), "situacao": "ok", "erro": None},
        {"linha": 7, "codigo": None, "nome": "PAPEL", "quantidade": 30, "medida": "RL", "observacao": "",
         "produto_id": None, "situacao": "associar", "erro": None},
        {"linha": 8, "codigo": "X", "nome": "CANETA", "quantidade": None, "medida": "UN", "observacao": "dez",
         "produto_id": None, "situacao": "erro", "erro": "Quantidade inválida."},
    ]
    async with sessionmaker() as s:
        previa = Importacao(arquivo="declaracao.xlsx", tipo="declaracao_estoque", unidade_id=cenario["queimados"],
                            responsavel="Admin", data=date(2026, 11, 10), linhas=linhas)
        s.add(previa)
        await s.commit()
        pid = previa.id
    r = await client.post(f"/api/v1/importacao/{pid}/confirmar", headers=como("admin"))
    assert r.status_code == 422  # ainda falta associar a linha 7
    r = await client.patch(f"/api/v1/importacao/{pid}/linhas/7", json={"produto_id": str(cenario["papel"])},
                           headers=como("admin"))
    assert r.json()["linhas"][1]["situacao"] == "ok"
    r = (await client.post(f"/api/v1/importacao/{pid}/confirmar", headers=como("admin"))).json()
    assert r["itens_importados"] == 2 and r["ignorados"] == 1
    c = (await client.get(f"/api/v1/contagens/{r['contagem_id']}", headers=como("admin"))).json()
    assert c["situacao"] == "finalizada" and c["contados"] == 2
