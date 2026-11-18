"""Leitura das planilhas atuais da Servioeste (spec 004, T015).

O formato segue a documentação técnica: a "Declaração de Estoque" tem as colunas código, produto, contagem, unidade de
medida e observação, com unidade, responsável e data no cabeçalho; a planilha de cotação tem material, quantidade e
valor. A leitura **acha as colunas pelo nome** (com variações comuns), então colunas fora de ordem ou linhas a mais no
topo não quebram. Campo de quantidade vazio = não contado, nunca zero (princípio VIII).
"""
import io
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime

from openpyxl import load_workbook

LIMITE_BYTES = 5 * 1024 * 1024
LINHAS_DE_CABECALHO = 30  # o cabeçalho das colunas precisa estar nas primeiras linhas

# Nomes aceitos para cada coluna (já sem acento e em minúsculas).
COLUNAS = {
    "codigo": ("codigo", "cod", "cod.", "codigo do produto", "ref", "referencia"),
    "nome": ("produto", "material", "descricao", "item", "nome", "descricao do produto"),
    "quantidade": ("contagem", "quantidade", "qtd", "qtde", "quant", "quant.", "qtd.", "estoque", "saldo"),
    "medida": ("unidade de medida", "un", "und", "unid", "unid.", "medida", "u.m.", "um"),
    "observacao": ("observacao", "observacoes", "obs", "obs."),
    "valor": ("valor", "preco", "valor unitario", "preco unitario", "valor un", "vl unit", "valor unit"),
}
ROTULOS = {"unidade": ("unidade", "filial", "local"), "responsavel": ("responsavel", "conferente", "contador"),
           "data": ("data", "data da contagem")}


class PlanilhaInvalida(ValueError):
    """Mensagem pronta para mostrar à pessoa."""


@dataclass
class LinhaLida:
    linha: int
    codigo: str | None
    nome: str
    quantidade: float | None
    medida: str
    observacao: str
    valor: float | None = None
    erro: str | None = None


@dataclass
class Leitura:
    linhas: list[LinhaLida]
    unidade: str | None = None
    responsavel: str | None = None
    data: date | None = None
    avisos: list[str] = field(default_factory=list)


def normalizar(texto: object) -> str:
    t = unicodedata.normalize("NFD", str(texto or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", t.strip().lower().rstrip(":"))


def _texto(v: object) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def _numero(v: object, coluna: str) -> tuple[float | None, str | None]:
    """(valor, erro). Vazio -> (None, None): não contado. Aceita 1,5 e 1.234,5."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None, None
    if isinstance(v, bool):
        return None, f"Valor \"{v}\" não é um número (coluna {coluna})."
    if isinstance(v, int | float):
        return (float(v), None) if v >= 0 else (None, f"Valor negativo na coluna {coluna}.")
    t = str(v).strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", t):  # 1.234,5
        t = t.replace(".", "")
    t = t.replace(",", ".")
    if not re.fullmatch(r"\d+(\.\d+)?", t):
        return None, f"Valor \"{v}\" não é um número (coluna {coluna})."
    return float(t), None


def _data(v: object) -> date | None:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", str(v or ""))
    if not m:
        return None
    d, mes, a = map(int, m.groups())
    try:
        return date(a + 2000 if a < 100 else a, mes, d)
    except ValueError:
        return None


def _achar_cabecalho(linhas: list[tuple]) -> tuple[int, dict[str, int]]:
    for i, valores in enumerate(linhas[:LINHAS_DE_CABECALHO]):
        mapa: dict[str, int] = {}
        for j, v in enumerate(valores):
            n = normalizar(v)
            for chave, nomes in COLUNAS.items():
                if chave not in mapa and n in nomes:
                    mapa[chave] = j
        if "nome" in mapa and "quantidade" in mapa:
            return i, mapa
    raise PlanilhaInvalida("Não encontrei o cabeçalho da planilha: preciso de uma linha com as colunas "
                           "\"Produto\" (ou \"Material\") e \"Contagem\" (ou \"Quantidade\").")


def _rotulos(linhas: list[tuple], ate: int) -> dict[str, object]:
    """Procura "Unidade: X", "Responsável: Y" e "Data: Z" acima do cabeçalho (na mesma célula ou na do lado)."""
    achados: dict[str, object] = {}
    for valores in linhas[:ate]:
        for j, v in enumerate(valores):
            if v is None:
                continue
            bruto = str(v)
            rotulo, _, resto = bruto.partition(":")
            n = normalizar(rotulo)
            for chave, nomes in ROTULOS.items():
                if chave in achados or n not in nomes:
                    continue
                if resto.strip():
                    achados[chave] = resto.strip()
                else:
                    vizinho = next((x for x in valores[j + 1:] if x not in (None, "")), None)
                    if vizinho is not None:
                        achados[chave] = vizinho
    return achados


def ler(conteudo: bytes, tipo: str) -> Leitura:
    if len(conteudo) > LIMITE_BYTES:
        raise PlanilhaInvalida("A planilha passa de 5 MB. Envie só a aba da contagem.")
    try:
        livro = load_workbook(io.BytesIO(conteudo), read_only=True, data_only=True)
    except Exception as e:  # openpyxl levanta vários tipos para arquivo corrompido ou que não é .xlsx
        raise PlanilhaInvalida("Não consegui abrir o arquivo. Salve a planilha como .xlsx e envie de novo.") from e
    try:
        aba = livro.worksheets[0]
        linhas = [tuple(r) for r in aba.iter_rows(values_only=True)]
    finally:
        livro.close()
    i_cab, col = _achar_cabecalho(linhas)
    rot = _rotulos(linhas, i_cab)
    nome_qtd = "Contagem" if tipo == "declaracao_estoque" else "Quantidade"
    lidas: list[LinhaLida] = []
    vazias = 0
    for numero, valores in enumerate(linhas[i_cab + 1:], start=i_cab + 2):
        celula = lambda chave, v=valores: v[col[chave]] if chave in col and col[chave] < len(v) else None  # noqa: E731
        nome = _texto(celula("nome"))
        if not nome:
            vazias += 1
            if vazias >= 3:
                break
            continue
        vazias = 0
        if normalizar(nome) in ("total", "totais"):
            continue
        qtd, erro = _numero(celula("quantidade"), nome_qtd)
        valor, erro_valor = _numero(celula("valor"), "Valor") if "valor" in col else (None, None)
        lidas.append(LinhaLida(linha=numero, codigo=_texto(celula("codigo")) or None, nome=nome, quantidade=qtd,
                               medida=_texto(celula("medida")).upper(), observacao=_texto(celula("observacao")),
                               valor=valor, erro=erro or erro_valor))
    if not lidas:
        raise PlanilhaInvalida("A planilha não tem nenhum produto abaixo do cabeçalho.")
    leitura = Leitura(linhas=lidas, unidade=_texto(rot.get("unidade")) or None,
                      responsavel=_texto(rot.get("responsavel")) or None, data=_data(rot.get("data")))
    if tipo == "cotacao" and "valor" not in col:
        leitura.avisos.append("A planilha não tem a coluna \"Valor\": os preços ficam para preencher na cotação.")
    return leitura
