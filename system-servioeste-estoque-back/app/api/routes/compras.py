"""Fornecedores, modelos, sugestões e cotações (rascunho → enviada → aprovada → recebida). Mesmo comportamento de
`src/mocks/handlers/compras.ts`. Aprovação e recebimento gravam auditoria; nada é apagado (princípio IX).
"""
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import DB, Eu, EuAtual, exigir, unidades_visiveis, uuid_ou_404
from app.core.tempo import agora
from app.models import (
    AnexoCotacao,
    Cotacao,
    EventoCotacao,
    Fornecedor,
    ItemCotacao,
    ModeloCotacao,
    Movimentacao,
    Produto,
)
from app.regras import sugerir_compra
from app.services import arquivos, auditoria
from app.services.compras import itens_por_cotacao, view_cotacao, view_resumo
from app.services.estoque import aplicar_movimentacao, mapas_de_estoque

router = APIRouter(prefix="/api/v1")

NOME_ANEXO = {"proposta": "a proposta", "nota_fiscal": "a nota fiscal", "boleto": "o boleto"}


def view_fornecedor(f: Fornecedor) -> dict:
    return {"id": str(f.id), "nome": f.nome, "contato": f.contato, "telefone": f.telefone, "categorias": f.categorias}


# ---------------------------------------------------------------- fornecedores

@router.get("/fornecedores")
async def listar_fornecedores(_: EuAtual, db: DB) -> list[dict]:
    return [view_fornecedor(f) for f in (await db.scalars(select(Fornecedor).order_by(Fornecedor.nome))).all()]


class NovoFornecedor(BaseModel):
    nome: str
    contato: str = ""
    telefone: str = ""
    categorias: list[str] = []


@router.post("/fornecedores", dependencies=[exigir("cotacao.montar")])
async def criar_fornecedor(corpo: NovoFornecedor, eu: EuAtual, db: DB) -> dict:
    if not corpo.nome.strip():
        raise HTTPException(422, "Informe o nome do fornecedor.")
    f = Fornecedor(nome=corpo.nome.strip(), contato=corpo.contato, telefone=corpo.telefone, categorias=corpo.categorias)
    db.add(f)
    await db.flush()
    auditoria.registrar(db, eu, "fornecedor.criar", "fornecedor", f.id, nome=f.nome)
    await db.commit()
    return view_fornecedor(f)


@router.get("/fornecedores/{id}/cotacoes")
async def cotacoes_do_fornecedor(id: str, eu: EuAtual, db: DB) -> list[dict]:
    fid = uuid_ou_404(id, "Fornecedor não encontrado.")
    lista = (await db.scalars(select(Cotacao).where(Cotacao.fornecedor_id == fid, Cotacao.unidade_id.in_(eu.unidades))
                              .order_by(Cotacao.numero.desc()))).all()
    itens = await itens_por_cotacao(db, [c.id for c in lista])
    return [view_resumo(c, itens[c.id]) for c in lista]


# ---------------------------------------------------------------- sugestões e modelos

@router.get("/cotacoes/sugestoes")
async def sugestoes(eu: EuAtual, db: DB, unidade: str = "") -> list[dict]:
    u = uuid_ou_404(unidade, "Unidade não encontrada.") if unidade else (eu.unidades[0] if eu.unidades else None)
    if u is None or not eu.ve(u):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    saldos, minimos, consumos = await mapas_de_estoque(db)
    resultado = []
    for p in (await db.scalars(select(Produto).order_by(Produto.codigo))).all():
        saldo, minimo, consumo = saldos.get((p.id, u)), minimos.get((p.id, u), 0), consumos.get((p.id, u), 0)
        sugerido = sugerir_compra(saldo, minimo, consumo, p.embalagem_quantidade)
        if saldo is not None and saldo < minimo and sugerido > 0:
            resultado.append({"produto_id": str(p.id), "saldo": saldo, "minimo": minimo, "consumo_mensal": consumo,
                              "sugerido": sugerido})
    return resultado


@router.get("/modelos-cotacao")
async def listar_modelos(_: EuAtual, db: DB) -> list[dict]:
    modelos = (await db.scalars(select(ModeloCotacao).order_by(ModeloCotacao.nome))).all()
    return [{"id": str(m.id), "nome": m.nome, "itens": m.itens} for m in modelos]


class ItemQtd(BaseModel):
    produto_id: uuid.UUID
    quantidade: float


class NovoModelo(BaseModel):
    nome: str
    itens: list[ItemQtd]


@router.post("/modelos-cotacao", dependencies=[exigir("cotacao.montar")])
async def criar_modelo(corpo: NovoModelo, _: EuAtual, db: DB) -> dict:
    if not corpo.nome.strip():
        raise HTTPException(422, "Dê um nome ao modelo.")
    if not corpo.itens:
        raise HTTPException(422, "O modelo precisa de pelo menos um item.")
    m = ModeloCotacao(nome=corpo.nome.strip(),
                      itens=[{"produto_id": str(i.produto_id), "quantidade": i.quantidade} for i in corpo.itens])
    db.add(m)
    await db.commit()
    return {"id": str(m.id), "nome": m.nome, "itens": m.itens}


# ---------------------------------------------------------------- cotações

class ItemEntrada(BaseModel):
    produto_id: uuid.UUID
    quantidade: float
    preco: float | None = None


async def _validar_itens(db, itens: list[ItemEntrada]) -> None:
    for i in itens:
        if await db.get(Produto, i.produto_id) is None:
            raise HTTPException(422, "Há um produto que não está no catálogo.")
        if i.quantidade <= 0:
            raise HTTPException(422, "Toda quantidade precisa ser maior que zero.")
        if i.preco is not None and i.preco < 0:
            raise HTTPException(422, "Preço inválido.")


async def _trocar_itens(db, c: Cotacao, itens: list[ItemEntrada]) -> None:
    for atual in (await db.scalars(select(ItemCotacao).where(ItemCotacao.cotacao_id == c.id))).all():
        await db.delete(atual)  # itens de cotação em aberto podem mudar; a cotação em si nunca é apagada
    await db.flush()
    vistos: set[uuid.UUID] = set()
    for ordem, i in enumerate(itens):
        if i.produto_id in vistos:
            continue
        vistos.add(i.produto_id)
        db.add(ItemCotacao(cotacao_id=c.id, produto_id=i.produto_id, ordem=ordem, quantidade=i.quantidade,
                           preco=i.preco))


def _evento(db, c: Cotacao, eu: Eu, descricao: str) -> None:
    db.add(EventoCotacao(cotacao_id=c.id, autor=eu.nome, descricao=descricao))


async def _cotacao(db, eu: Eu, id: str) -> Cotacao:
    c = await db.get(Cotacao, uuid_ou_404(id, "Cotação não encontrada."))
    if c is None or not eu.ve(c.unidade_id):
        raise HTTPException(404, "Cotação não encontrada.")
    return c


@router.get("/cotacoes")
async def listar_cotacoes(eu: EuAtual, db: DB, unidade: str = "", status: str = "") -> list[dict]:
    consulta = select(Cotacao).where(Cotacao.unidade_id.in_(unidades_visiveis(eu, unidade)))
    if status:
        consulta = consulta.where(Cotacao.status == status)
    lista = (await db.scalars(consulta.order_by(Cotacao.numero.desc()))).all()
    itens = await itens_por_cotacao(db, [c.id for c in lista])
    return [view_resumo(c, itens[c.id]) for c in lista]


class NovaCotacao(BaseModel):
    titulo: str
    unidade_id: uuid.UUID
    itens: list[ItemEntrada] = []


@router.post("/cotacoes", dependencies=[exigir("cotacao.montar")])
async def criar_cotacao(corpo: NovaCotacao, eu: EuAtual, db: DB) -> dict:
    if not eu.ve(corpo.unidade_id):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    if not corpo.titulo.strip():
        raise HTTPException(422, "Dê um título à cotação.")
    await _validar_itens(db, corpo.itens)
    numero = (await db.scalar(select(func.max(Cotacao.numero))) or 0) + 1
    c = Cotacao(numero=numero, titulo=corpo.titulo.strip(), unidade_id=corpo.unidade_id)
    db.add(c)
    await db.flush()
    await _trocar_itens(db, c, corpo.itens)
    _evento(db, c, eu, "Criou a cotação")
    auditoria.registrar(db, eu, "cotacao.criar", "cotacao", c.id, numero=numero)
    await db.commit()
    return await view_cotacao(db, c)


@router.get("/cotacoes/{id}")
async def detalhar_cotacao(id: str, eu: EuAtual, db: DB) -> dict:
    return await view_cotacao(db, await _cotacao(db, eu, id))


class AlteracaoCotacao(BaseModel):
    titulo: str | None = None
    fornecedor_id: uuid.UUID | None = None
    observacao: str | None = None
    itens: list[ItemEntrada] | None = None


@router.patch("/cotacoes/{id}", dependencies=[exigir("cotacao.montar")])
async def alterar_cotacao(id: str, corpo: AlteracaoCotacao, eu: EuAtual, db: DB) -> dict:
    c = await _cotacao(db, eu, id)
    if c.status in ("aprovada", "recebida"):
        raise HTTPException(409, "Cotação aprovada não pode mais ser alterada.")
    enviados = corpo.model_fields_set
    if corpo.itens is not None:
        await _validar_itens(db, corpo.itens)
        await _trocar_itens(db, c, corpo.itens)
    if corpo.titulo is not None and corpo.titulo.strip():
        c.titulo = corpo.titulo.strip()
    if "fornecedor_id" in enviados:
        if corpo.fornecedor_id and await db.get(Fornecedor, corpo.fornecedor_id) is None:
            raise HTTPException(422, "Fornecedor não encontrado.")
        c.fornecedor_id = corpo.fornecedor_id
    if corpo.observacao is not None:
        c.observacao = corpo.observacao
    await db.commit()
    return await view_cotacao(db, c)


@router.post("/cotacoes/{id}/enviar", dependencies=[exigir("cotacao.montar")])
async def enviar(id: str, eu: EuAtual, db: DB) -> dict:
    c = await _cotacao(db, eu, id)
    if c.status != "rascunho":
        raise HTTPException(409, "Só um rascunho pode ser enviado.")
    if not (await itens_por_cotacao(db, [c.id]))[c.id]:
        raise HTTPException(422, "Inclua pelo menos um item antes de enviar.")
    c.status = "enviada"
    _evento(db, c, eu, "Enviou para cotação")
    await db.commit()
    return await view_cotacao(db, c)


@router.post("/cotacoes/{id}/aprovar", dependencies=[exigir("cotacao.aprovar")])
async def aprovar(id: str, eu: EuAtual, db: DB) -> dict:
    c = await _cotacao(db, eu, id)
    if c.status != "enviada":
        raise HTTPException(409, "Só uma cotação enviada pode ser aprovada.")
    if not c.fornecedor_id:
        raise HTTPException(422, "Escolha o fornecedor antes de aprovar.")
    itens = (await itens_por_cotacao(db, [c.id]))[c.id]
    if any(i.preco is None for i in itens):
        raise HTTPException(422, "Informe o preço de todos os itens antes de aprovar.")
    c.status, c.aprovada_por, c.aprovada_em = "aprovada", eu.nome, agora()
    _evento(db, c, eu, "Aprovou")
    auditoria.registrar(db, eu, "cotacao.aprovar", "cotacao", c.id, numero=c.numero,
                        total=round(sum(i.quantidade * (i.preco or 0) for i in itens), 2))
    await db.commit()
    return await view_cotacao(db, c)


@router.post("/cotacoes/{id}/receber", dependencies=[exigir("cotacao.montar")])
async def receber(id: str, eu: EuAtual, db: DB) -> dict:
    c = await _cotacao(db, eu, id)
    if c.status != "aprovada":
        raise HTTPException(409, "Só uma cotação aprovada pode ser recebida.")
    for i in (await itens_por_cotacao(db, [c.id]))[c.id]:
        m = Movimentacao(tipo="entrada", produto_id=i.produto_id, unidade_id=c.unidade_id, quantidade=i.quantidade,
                         data=agora(), origem="cotacao", referencia=str(c.id), observacao=f"Cotação nº {c.numero}",
                         autor=eu.nome, autor_id=eu.id)
        db.add(m)
        await db.flush()
        await aplicar_movimentacao(db, m)
    c.status = "recebida"
    _evento(db, c, eu, "Marcou como recebida e gerou a entrada no estoque")
    auditoria.registrar(db, eu, "cotacao.receber", "cotacao", c.id, numero=c.numero)
    await db.commit()
    return await view_cotacao(db, c)


@router.post("/cotacoes/{id}/anexos")
async def anexar(id: str, eu: EuAtual, db: DB, tipo: str = Form(...), arquivo: UploadFile = File(...)) -> dict:  # noqa: B008
    """Guarda o anexo (proposta, nota fiscal ou boleto) na pasta do servidor (spec 005)."""
    c = await _cotacao(db, eu, id)
    if tipo not in NOME_ANEXO:
        raise HTTPException(422, "Tipo de anexo inválido.")
    guardado = await arquivos.salvar(db, eu, c.unidade_id, arquivo)
    nome = guardado.nome
    db.add(AnexoCotacao(cotacao_id=c.id, tipo=tipo, nome=nome, autor=eu.nome, arquivo_id=guardado.id))
    _evento(db, c, eu, f"Anexou {NOME_ANEXO[tipo]} ({nome})")
    await db.commit()
    return await view_cotacao(db, c)
