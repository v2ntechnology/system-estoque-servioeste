"""Cotação do rascunho ao recebimento, com papéis, sugestão e entrada no estoque."""
from sqlalchemy import select

from app.models import Auditoria


async def criar_fornecedor(client, como):
    r = await client.post("/api/v1/fornecedores", json={"nome": "Fornecedor Exemplo", "categorias": []},
                          headers=como("comprador"))
    assert r.status_code == 200
    return r.json()["id"]


async def test_fluxo_completo_gera_entrada_e_preco_aprovado(client, como, cenario, sessionmaker):
    q = str(cenario["queimados"])
    r = await client.post("/api/v1/cotacoes", headers=como("comprador"), json={
        "titulo": "Limpeza", "unidade_id": q, "itens": [{"produto_id": str(cenario["alcool"]), "quantidade": 24}]})
    assert r.status_code == 200
    c = r.json()
    assert c["numero"] == 1 and c["status"] == "rascunho" and c["total"] is None

    enviada = (await client.post(f"/api/v1/cotacoes/{c['id']}/enviar", headers=como("comprador"))).json()
    assert enviada["status"] == "enviada"
    fornecedor = await criar_fornecedor(client, como)
    await client.patch(f"/api/v1/cotacoes/{c['id']}", headers=como("comprador"), json={
        "fornecedor_id": fornecedor, "itens": [{"produto_id": str(cenario["alcool"]), "quantidade": 24, "preco": 8.9}]})

    # Comprador não aprova; aprovador sim.
    assert (await client.post(f"/api/v1/cotacoes/{c['id']}/aprovar", headers=como("comprador"))).status_code == 403
    aprovada = (await client.post(f"/api/v1/cotacoes/{c['id']}/aprovar", headers=como("aprovador"))).json()
    assert aprovada["status"] == "aprovada" and aprovada["aprovada_por"] == "Aprovador" and aprovada["total"] == 213.6

    # Aprovada não muda mais.
    r = await client.patch(f"/api/v1/cotacoes/{c['id']}", headers=como("comprador"), json={"observacao": "x"})
    assert r.status_code == 409

    recebida = (await client.post(f"/api/v1/cotacoes/{c['id']}/receber", headers=como("comprador"))).json()
    assert recebida["status"] == "recebida"
    assert [e["descricao"] for e in recebida["eventos"]][-1] == "Marcou como recebida e gerou a entrada no estoque"

    produto = (await client.get(f"/api/v1/produtos/{cenario['alcool']}", headers=como("admin"))).json()
    assert produto["saldos"][q] == 64  # 40 + 24
    assert produto["precos"][0]["preco"] == 8.9 and produto["precos"][0]["fornecedor"] == "Fornecedor Exemplo"
    movs = (await client.get(f"/api/v1/movimentacoes?produto={cenario['alcool']}", headers=como("admin"))).json()
    assert movs[0]["origem"] == "cotacao" and movs[0]["referencia"] == c["id"]

    async with sessionmaker() as s:
        acoes = set((await s.scalars(select(Auditoria.acao))).all())
    assert {"cotacao.criar", "cotacao.aprovar", "cotacao.receber"} <= acoes


async def test_aprovar_exige_fornecedor_e_precos(client, como, cenario):
    c = (await client.post("/api/v1/cotacoes", headers=como("comprador"), json={
        "titulo": "X", "unidade_id": str(cenario["queimados"]),
        "itens": [{"produto_id": str(cenario["papel"]), "quantidade": 8}]})).json()
    await client.post(f"/api/v1/cotacoes/{c['id']}/enviar", headers=como("comprador"))
    r = await client.post(f"/api/v1/cotacoes/{c['id']}/aprovar", headers=como("aprovador"))
    assert r.status_code == 422 and "fornecedor" in r.json()["detail"]


async def test_rascunho_sem_itens_nao_e_enviado(client, como, cenario):
    c = (await client.post("/api/v1/cotacoes", headers=como("comprador"),
                           json={"titulo": "Vazia", "unidade_id": str(cenario["queimados"])})).json()
    assert (await client.post(f"/api/v1/cotacoes/{c['id']}/enviar", headers=como("comprador"))).status_code == 422


async def test_sugestao_arredonda_para_a_embalagem(client, como, cenario):
    q = str(cenario["queimados"])
    base = {"produto_id": str(cenario["alcool"]), "unidade_id": q, "tipo": "saida"}
    await client.post("/api/v1/movimentacoes", json={**base, "quantidade": 36}, headers=como("contador"))
    [s] = (await client.get(f"/api/v1/cotacoes/sugestoes?unidade={q}", headers=como("comprador"))).json()
    # saldo 4, mínimo 10, consumo 36/90×30 = 12 → falta 18 → caixa de 12 → 24
    assert (s["saldo"], s["minimo"], s["consumo_mensal"], s["sugerido"]) == (4, 10, 12, 24)


async def test_anexo_registra_evento(client, como, cenario):
    c = (await client.post("/api/v1/cotacoes", headers=como("comprador"),
                           json={"titulo": "Com anexo", "unidade_id": str(cenario["queimados"])})).json()
    r = await client.post(f"/api/v1/cotacoes/{c['id']}/anexos", headers=como("comprador"),
                          data={"tipo": "proposta"},
                          files={"arquivo": ("proposta.pdf", b"%PDF-1.4", "application/pdf")})
    assert r.status_code == 200
    assert r.json()["anexos"][0]["nome"] == "proposta.pdf"
