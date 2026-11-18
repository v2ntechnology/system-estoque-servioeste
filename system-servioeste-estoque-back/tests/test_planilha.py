"""Leitura real das planilhas (spec 004, T015), com arquivos montados aqui mesmo no formato da documentação técnica."""
import io
from datetime import date

import pytest
from openpyxl import Workbook

from app.services import planilha


def xlsx(linhas: list[list]) -> bytes:
    wb = Workbook()
    for r in linhas:
        wb.active.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


DECLARACAO = [
    ["DECLARAÇÃO DE ESTOQUE"],
    ["Unidade:", "Queimados"],
    ["Responsável: Carlos Henrique Lima"],
    ["Data", "10/11/2026"],
    [],
    ["Produto", "Código", "Contagem", "UN", "Observação"],  # colunas fora da ordem da documentação
    ["ÁLCOOL 70% 1 L", "LIM-001", 12, "un", ""],
    ["PAPEL HIGIÊNICO", None, "1,5", "RL", "faltou um fardo"],
    ["Caneta azul", "ESC-002", "dez", "UN", ""],
    ["Detergente", "LIM-004", None, "UN", ""],  # vazio = não contado
    ["Desengordurante 5 L", "LIM-099", 4, "GL", ""],
    ["Total", None, 18, None, None],
]


def test_leitor_acha_colunas_e_cabecalho_pelo_nome():
    leitura = planilha.ler(xlsx(DECLARACAO), "declaracao_estoque")
    cabecalho = (leitura.unidade, leitura.responsavel, leitura.data)
    assert cabecalho == ("Queimados", "Carlos Henrique Lima", date(2026, 11, 10))
    nomes = [x.nome for x in leitura.linhas]
    assert "Total" not in nomes and len(nomes) == 5
    alcool, papel, caneta, detergente, _ = leitura.linhas
    assert (alcool.linha, alcool.codigo, alcool.quantidade, alcool.medida) == (7, "LIM-001", 12, "UN")
    assert papel.quantidade == 1.5 and papel.codigo is None and papel.observacao == "faltou um fardo"
    assert caneta.quantidade is None and "não é um número" in caneta.erro
    assert detergente.quantidade is None and detergente.erro is None  # não contado, não é erro nem zero


def test_planilha_sem_cabecalho_e_recusada():
    with pytest.raises(planilha.PlanilhaInvalida, match="cabeçalho"):
        planilha.ler(xlsx([["a", "b"], [1, 2]]), "declaracao_estoque")


def test_arquivo_que_nao_e_xlsx_e_recusado():
    with pytest.raises(planilha.PlanilhaInvalida, match=".xlsx"):
        planilha.ler(b"isto nao e uma planilha", "declaracao_estoque")


async def test_envio_classifica_contra_o_catalogo_e_confirmar_vira_contagem(client, como, cenario):
    r = await client.post("/api/v1/importacao/planilha", headers=como("admin"),
                          data={"tipo": "declaracao_estoque", "unidade_id": str(cenario["queimados"])},
                          files={"arquivo": ("declaracao.xlsx", xlsx(DECLARACAO), "application/octet-stream")})
    assert r.status_code == 200, r.text
    previa = r.json()
    situacao = {x["nome"]: x["situacao"] for x in previa["linhas"]}
    assert situacao == {"ÁLCOOL 70% 1 L": "ok", "PAPEL HIGIÊNICO": "ok", "Caneta azul": "erro", "Detergente": "novo",
                        "Desengordurante 5 L": "novo"}
    assert previa["responsavel"] == "Carlos Henrique Lima" and previa["data"] == "2026-11-10"
    resultado = (await client.post(f"/api/v1/importacao/{previa['id']}/confirmar", headers=como("admin"))).json()
    assert resultado["produtos_criados"] == 2 and resultado["ignorados"] == 1
    c = (await client.get(f"/api/v1/contagens/{resultado['contagem_id']}", headers=como("admin"))).json()
    assert c["data"] == "2026-11-10" and c["contados"] == 3  # álcool, papel e desengordurante; detergente vazio
    produtos = (await client.get("/api/v1/produtos?busca=LIM-004", headers=como("admin"))).json()
    assert produtos[0]["saldos"][str(cenario["queimados"])] is None  # criado pela planilha, mas não contado


async def test_planilha_de_cotacao_vira_cotacao_em_rascunho(client, como, cenario):
    arquivo = xlsx([["Material", "Quantidade", "Valor"], ["Álcool 70% 1 L", 24, "8,90"], ["Item sem cadastro", 5, 10]])
    previa = (await client.post("/api/v1/importacao/planilha", headers=como("admin"),
                                data={"tipo": "cotacao", "unidade_id": str(cenario["queimados"])},
                                files={"arquivo": ("cotacao.xlsx", arquivo, "application/octet-stream")})).json()
    assert [x["situacao"] for x in previa["linhas"]] == ["ok", "associar"]
    await client.patch(f"/api/v1/importacao/{previa['id']}/linhas/3", json={"produto_id": str(cenario["papel"])},
                       headers=como("admin"))
    resultado = (await client.post(f"/api/v1/importacao/{previa['id']}/confirmar", headers=como("admin"))).json()
    cot = (await client.get(f"/api/v1/cotacoes/{resultado['cotacao_id']}", headers=como("admin"))).json()
    assert cot["status"] == "rascunho" and [(i["quantidade"], i["preco"]) for i in cot["itens"]] == [(24, 8.9), (5, 10)]


async def test_xls_antigo_e_recusado_com_orientacao(client, como, cenario):
    r = await client.post("/api/v1/importacao/planilha", headers=como("admin"),
                          files={"arquivo": ("antiga.xls", b"x", "application/vnd.ms-excel")})
    assert r.status_code == 422 and "Salvar como" in r.json()["detail"]


async def test_contador_nao_importa(client, como, cenario):
    r = await client.post("/api/v1/importacao/planilha", headers=como("contador"),
                          files={"arquivo": ("d.xlsx", xlsx(DECLARACAO), "application/octet-stream")})
    assert r.status_code == 403
