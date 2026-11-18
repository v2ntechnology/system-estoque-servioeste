"""Fotos da contagem e anexos de cotação no servidor (spec 005)."""
import pytest

from app.services.arquivos import tipo_pelo_conteudo

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF = b"%PDF-1.7\n" + b"0" * 64


@pytest.mark.parametrize(("inicio", "tipo"), [
    (JPEG, "image/jpeg"), (PNG, "image/png"), (b"RIFF\x00\x00\x00\x00WEBPVP8 ", "image/webp"),
    (b"\x00\x00\x00\x18ftypheic", "image/heic"), (PDF, "application/pdf"), (b"MZ\x90\x00", None), (b"<html>", None),
])
def test_tipo_e_conferido_pelo_conteudo(inicio, tipo):
    assert tipo_pelo_conteudo(inicio[:16]) == tipo


async def enviar_foto(client, como, cenario, conteudo=JPEG, nome="prateleira.jpg", quem="contador",
                      unidade="queimados"):
    return await client.post("/api/v1/arquivos", headers=como(quem), data={"unidade_id": str(cenario[unidade])},
                             files={"arquivo": (nome, conteudo, "application/octet-stream")})


async def test_foto_e_guardada_e_aberta_por_quem_ve_a_unidade(client, como, cenario):
    r = await enviar_foto(client, como, cenario)
    assert r.status_code == 200, r.text
    foto = r.json()
    assert foto["nome"] == "prateleira.jpg" and foto["tipo"] == "image/jpeg" and foto["url"].endswith(foto["id"])
    aberta = await client.get(foto["url"], headers=como("contador"))
    assert aberta.status_code == 200 and aberta.content == JPEG and aberta.headers["content-type"] == "image/jpeg"
    # Resende não é do contador: o arquivo de lá some para ele.
    outra = await enviar_foto(client, como, cenario, quem="admin", unidade="resende")
    assert (await client.get(outra.json()["url"], headers=como("contador"))).status_code == 404


async def test_extensao_falsa_e_recusada(client, como, cenario):
    r = await enviar_foto(client, como, cenario, conteudo=b"MZ\x90\x00 programa", nome="foto.jpg")
    assert r.status_code == 422 and "Tipo de arquivo" in r.json()["detail"]


async def test_pdf_nao_vale_como_foto_e_tamanho_tem_limite(client, como, cenario, monkeypatch):
    assert (await enviar_foto(client, como, cenario, conteudo=PDF, nome="x.pdf")).status_code == 422
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "arquivo_max_bytes", 32)
    assert (await enviar_foto(client, como, cenario)).status_code == 413


async def test_aprovador_nao_envia_foto_de_contagem(client, como, cenario):
    assert (await enviar_foto(client, como, cenario, quem="aprovador")).status_code == 403


async def test_foto_no_item_da_contagem_traz_a_url(client, como, cenario):
    foto = (await enviar_foto(client, como, cenario)).json()
    c = (await client.post("/api/v1/contagens", json={"unidade_id": str(cenario["queimados"])},
                           headers=como("contador"))).json()
    url = f"/api/v1/contagens/{c['id']}/itens"
    r = await client.patch(url, json={"itens": [{"produto_id": str(cenario["alcool"]), "foto": foto["id"]}]},
                           headers=como("contador"))
    item = next(i for i in r.json()["itens"] if i["produto_id"] == str(cenario["alcool"]))
    assert item["foto"] == foto["id"] and item["foto_url"] == foto["url"]
    assert item["quantidade"] is None  # foto sozinha não conta o item (princípio VIII)
    # Foto de outra unidade não pode ser usada aqui.
    outra = (await enviar_foto(client, como, cenario, quem="admin", unidade="resende")).json()
    r = await client.patch(url, json={"itens": [{"produto_id": str(cenario["papel"]), "foto": outra["id"]}]},
                           headers=como("contador"))
    assert r.status_code == 422


async def test_anexo_da_cotacao_pode_ser_baixado(client, como, cenario):
    c = (await client.post("/api/v1/cotacoes", headers=como("comprador"),
                           json={"titulo": "Com anexo", "unidade_id": str(cenario["queimados"])})).json()
    r = await client.post(f"/api/v1/cotacoes/{c['id']}/anexos", headers=como("comprador"), data={"tipo": "nota_fiscal"},
                          files={"arquivo": ("nf-123.pdf", PDF, "application/pdf")})
    anexo = r.json()["anexos"][0]
    baixado = await client.get(anexo["url"], headers=como("comprador"))
    assert baixado.content == PDF and "attachment" in baixado.headers["content-disposition"]
    falso = await client.post(f"/api/v1/cotacoes/{c['id']}/anexos", headers=como("comprador"), data={"tipo": "boleto"},
                              files={"arquivo": ("boleto.pdf", b"nao sou pdf", "application/pdf")})
    assert falso.status_code == 422
