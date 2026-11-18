"""Relatório mensal, séries dos gráficos (spec 003) e importação de planilhas."""
import calendar
import uuid
from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import DB, EuAtual, exigir, uuid_ou_404
from app.core.tempo import BRASILIA, agora, com_fuso, hoje
from app.models import (
    Contagem,
    Cotacao,
    EventoCotacao,
    Importacao,
    ItemContagem,
    ItemCotacao,
    Movimentacao,
    Produto,
    Saldo,
)
from app.services import auditoria, planilha

router = APIRouter(prefix="/api/v1")


def mes_anterior(mes: str) -> str:
    a, m = map(int, mes.split("-"))
    return f"{a - 1}-12" if m == 1 else f"{a}-{m - 1:02d}"


def dia_local(d: datetime) -> date:
    return com_fuso(d).astimezone(BRASILIA).date()


async def _unidade(eu, unidade: str) -> uuid.UUID:
    u = uuid_ou_404(unidade, "Unidade não encontrada.") if unidade else (eu.unidades[0] if eu.unidades else None)
    if u is None or not eu.ve(u):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    return u


async def _precos(db) -> tuple[dict[tuple[str, uuid.UUID], float], dict[uuid.UUID, float]]:
    """Preço de cada item por cotação e o último preço aprovado de cada produto (para valorar entradas manuais)."""
    linhas = (await db.execute(
        select(ItemCotacao.cotacao_id, ItemCotacao.produto_id, ItemCotacao.preco, Cotacao.aprovada_em)
        .join(Cotacao, Cotacao.id == ItemCotacao.cotacao_id)
        .where(ItemCotacao.preco.is_not(None), Cotacao.status.in_(["aprovada", "recebida"]))
        .order_by(Cotacao.aprovada_em))).all()
    por_cotacao = {(str(c), p): preco for c, p, preco, _ in linhas}
    ultimo = {p: preco for _, p, preco, _ in linhas}
    return por_cotacao, ultimo


def _valor(m: Movimentacao, por_cotacao, ultimo) -> float:
    if m.origem == "cotacao" and m.referencia and (m.referencia, m.produto_id) in por_cotacao:
        return m.quantidade * por_cotacao[(m.referencia, m.produto_id)]
    return m.quantidade * ultimo.get(m.produto_id, 0)


@router.get("/relatorios/mensal")
async def mensal(eu: EuAtual, db: DB, unidade: str = "", mes: str = "") -> dict:
    u = await _unidade(eu, unidade)
    mes = mes or hoje().strftime("%Y-%m")
    anterior = mes_anterior(mes)
    movs = (await db.scalars(select(Movimentacao).where(Movimentacao.unidade_id == u))).all()
    saldos = {s.produto_id: s.quantidade for s in (await db.scalars(select(Saldo).where(Saldo.unidade_id == u))).all()}
    por_cotacao, ultimo = await _precos(db)
    do_mes = [m for m in movs if dia_local(m.data).strftime("%Y-%m") == mes]
    do_anterior = [m for m in movs if dia_local(m.data).strftime("%Y-%m") == anterior]

    def saldo_no_fim(produto: uuid.UUID, ref: str) -> float | None:
        """Volta do saldo atual pelas movimentações depois do mês."""
        atual = saldos.get(produto)
        if atual is None:
            return None
        depois = [m for m in movs if m.produto_id == produto and dia_local(m.data).strftime("%Y-%m") > ref]
        return max(0.0, atual - sum(m.quantidade if m.tipo == "entrada" else -m.quantidade for m in depois))

    def gasto(lista) -> float:
        return round(sum(_valor(m, por_cotacao, ultimo) for m in lista if m.tipo == "entrada"), 2)

    linhas = []
    for p in (await db.scalars(select(Produto).order_by(Produto.codigo))).all():
        doc = [m for m in do_mes if m.produto_id == p.id]
        fim, fim_anterior = saldo_no_fim(p.id, mes), saldo_no_fim(p.id, anterior)
        linhas.append({"produto_id": str(p.id), "saldo_inicial": fim_anterior, "saldo_final": fim,
                       "saldo_mes_anterior": fim_anterior,
                       "entradas": sum(m.quantidade for m in doc if m.tipo == "entrada"),
                       "saidas": sum(m.quantidade for m in doc if m.tipo == "saida")})
    return {
        "unidade_id": str(u), "mes": mes, "linhas": linhas,
        "totais": {"entradas": sum(m.quantidade for m in do_mes if m.tipo == "entrada"),
                   "saidas": sum(m.quantidade for m in do_mes if m.tipo == "saida"),
                   "gasto": gasto(do_mes), "gasto_mes_anterior": gasto(do_anterior)},
    }


@router.get("/relatorios/serie")
async def serie(eu: EuAtual, db: DB, unidade: str = "", metrica: str = "saidas", escala: str = "dia",
                mes: str = "") -> dict:
    if metrica not in ("entradas", "saidas", "gasto") or escala not in ("dia", "mes"):
        raise HTTPException(422, "Métrica ou escala inválida.")
    u = await _unidade(eu, unidade)
    mes = mes or hoje().strftime("%Y-%m")
    if escala == "dia":
        a, m = map(int, mes.split("-"))
        periodos = [d.isoformat() for d in (date(a, m, n) for n in range(1, calendar.monthrange(a, m)[1] + 1))
                    if d <= hoje()]
    else:
        periodos, atual = [], mes
        for _ in range(6):
            periodos.insert(0, atual)
            atual = mes_anterior(atual)
    tipo = "saida" if metrica == "saidas" else "entrada"
    por_cotacao, ultimo = await _precos(db)
    categoria = {p.id: str(p.categoria_id) for p in (await db.scalars(select(Produto))).all()}

    def chave(m: Movimentacao) -> str:
        d = dia_local(m.data)
        return d.isoformat() if escala == "dia" else d.strftime("%Y-%m")

    def valor(m: Movimentacao) -> float:
        return _valor(m, por_cotacao, ultimo) if metrica == "gasto" else m.quantidade

    movs = [m for m in (await db.scalars(select(Movimentacao).where(Movimentacao.unidade_id == u,
                                                                    Movimentacao.tipo == tipo))).all()
            if chave(m) in periodos]
    pontos: dict[str, float] = defaultdict(float)
    cats: dict[str, float] = defaultdict(float)
    for m in movs:
        pontos[chave(m)] += valor(m)
        cats[categoria.get(m.produto_id, "?")] += valor(m)
    arred = (lambda v: round(v, 2)) if metrica == "gasto" else (lambda v: v)
    return {
        "metrica": metrica, "escala": escala, "unidade_id": str(u),
        "pontos": [{"periodo": p, "valor": arred(pontos.get(p, 0))} for p in periodos],
        "por_categoria": sorted(({"categoria_id": c, "valor": arred(v)} for c, v in cats.items()),
                                key=lambda x: x["valor"], reverse=True),
    }


# ---------------------------------------------------------------- importação

def view_previa(i: Importacao) -> dict:
    return {"id": str(i.id), "arquivo": i.arquivo, "tipo": i.tipo, "unidade_id": str(i.unidade_id),
            "responsavel": i.responsavel, "data": i.data.isoformat(), "linhas": i.linhas}


@router.post("/importacao/planilha", dependencies=[exigir("importacao.usar")])
async def enviar_planilha(eu: EuAtual, db: DB, arquivo: UploadFile = File(...),  # noqa: B008
                          tipo: str = Form("declaracao_estoque"), unidade_id: str = Form("")) -> dict:
    """Lê a planilha e devolve a pré-visualização. Nada vira dado antes de confirmar."""
    if tipo not in ("declaracao_estoque", "cotacao"):
        raise HTTPException(422, "Tipo de planilha inválido.")
    if not (arquivo.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(422, "O arquivo precisa ser uma planilha do Excel (.xlsx). Planilhas .xls: abra no Excel "
                                 "e use Salvar como > Pasta de Trabalho do Excel.")
    u = await _unidade(eu, unidade_id)
    try:
        leitura = planilha.ler(await arquivo.read(), tipo)
    except planilha.PlanilhaInvalida as e:
        raise HTTPException(422, str(e)) from e

    produtos = (await db.scalars(select(Produto))).all()
    por_codigo = {p.codigo.strip().upper(): p for p in produtos}
    por_nome = {planilha.normalizar(p.nome): p for p in produtos}
    linhas = []
    for x in leitura.linhas:
        produto = por_codigo.get(x.codigo.strip().upper()) if x.codigo else por_nome.get(planilha.normalizar(x.nome))
        situacao = "erro" if x.erro else "ok" if produto else "novo" if x.codigo else "associar"
        linhas.append({"linha": x.linha, "codigo": x.codigo, "nome": x.nome, "quantidade": x.quantidade,
                       "medida": x.medida or (produto.medida if produto else ""), "observacao": x.observacao,
                       "valor": x.valor, "produto_id": str(produto.id) if produto and not x.erro else None,
                       "situacao": situacao, "erro": x.erro})
    previa = Importacao(arquivo=arquivo.filename or "planilha.xlsx", tipo=tipo, unidade_id=u, linhas=linhas,
                        responsavel=leitura.responsavel or eu.nome, data=leitura.data or hoje())
    db.add(previa)
    await db.commit()
    return view_previa(previa)


async def _previa(db, id: str) -> Importacao:
    i = await db.get(Importacao, uuid_ou_404(id, "Importação não encontrada."))
    if i is None:
        raise HTTPException(404, "Importação não encontrada.")
    return i


class Associacao(BaseModel):
    produto_id: uuid.UUID | None


@router.patch("/importacao/{id}/linhas/{linha}", dependencies=[exigir("importacao.usar")])
async def associar(id: str, linha: int, corpo: Associacao, db: DB) -> dict:
    previa = await _previa(db, id)
    linhas = [dict(x) for x in previa.linhas]
    alvo = next((x for x in linhas if x["linha"] == linha), None)
    if alvo is None:
        raise HTTPException(404, "Linha não encontrada.")
    if corpo.produto_id and await db.get(Produto, corpo.produto_id) is None:
        raise HTTPException(422, "Produto não encontrado.")
    alvo["produto_id"] = str(corpo.produto_id) if corpo.produto_id else None
    alvo["situacao"] = "ok" if corpo.produto_id else "associar"
    previa.linhas = linhas  # JSON novo: o SQLAlchemy só percebe a mudança trocando a lista
    await db.commit()
    return view_previa(previa)


@router.post("/importacao/{id}/confirmar", dependencies=[exigir("importacao.usar")])
async def confirmar(id: str, eu: EuAtual, db: DB) -> dict:
    previa = await _previa(db, id)
    if not eu.ve(previa.unidade_id):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    pendentes = sum(1 for x in previa.linhas if x["situacao"] == "associar")
    if pendentes:
        raise HTTPException(422, f"Associe ao catálogo os {pendentes} produto(s) sem código antes de confirmar.")
    produtos_criados = 0
    linhas = [dict(x) for x in previa.linhas]
    categoria_padrao = await db.scalar(select(Produto.categoria_id).limit(1))
    for x in (x for x in linhas if x["situacao"] == "novo"):
        if categoria_padrao is None:
            raise HTTPException(422, "Cadastre ao menos uma categoria antes de importar produtos novos.")
        p = Produto(codigo=x["codigo"] or f"IMP-{uuid.uuid4().hex[:6].upper()}", nome=x["nome"].capitalize(),
                    categoria_id=categoria_padrao, medida=x["medida"] or "UN")
        db.add(p)
        await db.flush()
        x["produto_id"] = str(p.id)
        produtos_criados += 1
    validas = [x for x in linhas if x["situacao"] != "erro" and x.get("produto_id")]
    contagem_id = None
    if previa.tipo == "declaracao_estoque":
        c = Contagem(unidade_id=previa.unidade_id, data=previa.data, situacao="finalizada", finalizada_em=agora(),
                     responsavel=f"{eu.nome} (importada de {previa.arquivo})", responsavel_id=eu.id)
        db.add(c)
        await db.flush()
        por_produto = {uuid.UUID(x["produto_id"]): x for x in validas}
        for pid in (await db.scalars(select(Produto.id))).all():
            x = por_produto.get(pid)
            qtd = x["quantidade"] if x else None  # fora da planilha = não contado, nunca zero (princípio VIII)
            db.add(ItemContagem(contagem_id=c.id, produto_id=pid, quantidade=qtd,
                                observacao=(x or {}).get("observacao", "")))
            if qtd is not None:
                saldo = await db.get(Saldo, (pid, previa.unidade_id))
                if saldo is None:
                    db.add(Saldo(produto_id=pid, unidade_id=previa.unidade_id, quantidade=qtd))
                else:
                    saldo.quantidade = qtd
        contagem_id = str(c.id)
    cotacao_id = None
    if previa.tipo == "cotacao":
        numero = (await db.scalar(select(func.max(Cotacao.numero))) or 0) + 1
        cot = Cotacao(numero=numero, titulo=f"Importada de {previa.arquivo}", unidade_id=previa.unidade_id)
        db.add(cot)
        await db.flush()
        vistos: set[str] = set()
        for ordem, x in enumerate(x for x in validas if x["quantidade"]):
            if x["produto_id"] in vistos:
                continue
            vistos.add(x["produto_id"])
            db.add(ItemCotacao(cotacao_id=cot.id, produto_id=uuid.UUID(x["produto_id"]), ordem=ordem,
                               quantidade=x["quantidade"], preco=x.get("valor")))
        db.add(EventoCotacao(cotacao_id=cot.id, autor=eu.nome,
                             descricao=f"Criou a cotação a partir de {previa.arquivo}"))
        cotacao_id = str(cot.id)
    auditoria.registrar(db, eu, "importacao.confirmar", "importacao", previa.id, arquivo=previa.arquivo,
                        itens=len(validas), produtos_criados=produtos_criados)
    await db.delete(previa)
    await db.commit()
    return {"produtos_criados": produtos_criados, "itens_importados": len(validas),
            "ignorados": len(linhas) - len(validas), "contagem_id": contagem_id, "cotacao_id": cotacao_id}
