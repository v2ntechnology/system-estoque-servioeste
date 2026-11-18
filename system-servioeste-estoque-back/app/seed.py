"""Dados de exemplo no banco (spec 004, história 4). Tudo fictício, como em `src/mocks/dados.ts`: a mesma lista de
produtos e a mesma ideia de 120 dias de história (saídas, reposições e contagens), com sorteio de semente fixa e datas
relativas a hoje. A Ana (administradora) tem o mesmo id da pessoa de desenvolvimento (`DEV_USUARIO_ID`).
"""
import random
import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tempo import BRASILIA, hoje
from app.models import (
    AnexoCotacao,
    Categoria,
    Contagem,
    Cotacao,
    Divergencia,
    EstoqueMinimo,
    EventoCotacao,
    Fornecedor,
    ItemContagem,
    ItemCotacao,
    Lote,
    ModeloCotacao,
    Movimentacao,
    Pessoa,
    PessoaUnidade,
    Produto,
    Saldo,
    Unidade,
)
from app.regras import ItemContado, Mov, calcular_divergencias

PESSOAS = [  # (id, nome, e-mail, papéis, unidades)
    ("00000000-0000-4000-8000-000000000001", "Ana Paula Souza", "ana.souza@exemplo.com.br", ["administrador"], None),
    ("00000000-0000-4000-8000-000000000002", "Carlos Henrique Lima", "carlos.lima@exemplo.com.br", ["contador"],
     ["Queimados"]),
    ("00000000-0000-4000-8000-000000000003", "Mariana Costa", "mariana.costa@exemplo.com.br", ["comprador"], None),
    ("00000000-0000-4000-8000-000000000004", "Roberto Alves", "roberto.alves@exemplo.com.br", ["aprovador"], None),
]
UNIDADES = [("Queimados", "17:00", 7, 1.0), ("Resende", "17:00", 15, 0.6), ("Barra do Piraí", "16:30", 30, 0.4)]
CATEGORIAS = ["Sacos", "Contentores", "EPI", "Limpeza", "Escritório", "Copa"]
# código, nome, categoria, medida, embalagem, validade, mínimo, consumo mensal (Queimados), preço
PRODUTOS = [
    ("SAC-001", "Saco branco leitoso infectante 100 L", "Sacos", "UN", ("pacote", 100), False, 400, 500, 0.85),
    ("SAC-002", "Saco branco leitoso infectante 50 L", "Sacos", "UN", ("pacote", 100), False, 300, 350, 0.6),
    ("SAC-003", "Saco preto 100 L", "Sacos", "UN", ("pacote", 100), False, 200, 260, 0.45),
    ("SAC-004", "Saco laranja para químicos 50 L", "Sacos", "UN", ("pacote", 50), False, 50, 40, 1.1),
    ("CON-001", "Contentor 240 L com tampa", "Contentores", "UN", None, False, 6, 3, 289.9),
    ("CON-002", "Contentor 120 L com tampa", "Contentores", "UN", None, False, 8, 4, 189.9),
    ("CON-003", "Caixa coletora de perfurocortante 13 L", "Contentores", "UN", ("caixa", 20), False, 60, 70, 4.9),
    ("EPI-001", "Luva nitrílica descartável (M)", "EPI", "CX", None, True, 10, 12, 32.5),
    ("EPI-002", "Máscara PFF2", "EPI", "UN", ("caixa", 20), True, 40, 50, 2.8),
    ("EPI-003", "Avental impermeável", "EPI", "UN", None, False, 10, 6, 24.9),
    ("EPI-004", "Botina de segurança", "EPI", "PR", None, False, 4, 2, 89.9),
    ("LIM-001", "Álcool 70% 1 L", "Limpeza", "UN", ("caixa", 12), True, 24, 30, 8.9),
    ("LIM-002", "Desinfetante hospitalar 5 L", "Limpeza", "GL", None, True, 6, 8, 39.9),
    ("LIM-003", "Água sanitária 2 L", "Limpeza", "UN", ("fardo", 6), False, 12, 14, 6.5),
    ("LIM-004", "Detergente neutro 500 mL", "Limpeza", "UN", ("caixa", 24), False, 24, 20, 2.9),
    ("LIM-005", "Papel higiênico rolo 300 m", "Limpeza", "RL", ("pacote", 8), False, 48, 64, 3.2),
    ("LIM-006", "Papel toalha interfolhado (pacote 1000 fls)", "Limpeza", "PCT", None, False, 10, 12, 18.9),
    ("LIM-007", "Sabonete líquido 5 L", "Limpeza", "GL", None, False, 3, 3, 34.9),
    ("ESC-001", "Papel A4 (resma 500 fls)", "Escritório", "RES", ("caixa", 10), False, 10, 8, 27.9),
    ("ESC-002", "Caneta esferográfica azul", "Escritório", "UN", ("caixa", 50), False, 20, 15, 1.2),
    ("ESC-003", "Etiqueta adesiva para identificação", "Escritório", "FL", None, False, 50, 40, 0.9),
    ("COP-001", "Copo descartável 200 mL", "Copa", "UN", ("pacote", 100), False, 300, 400, 0.08),
    ("COP-002", "Café torrado e moído 500 g", "Copa", "PCT", None, True, 6, 10, 18.5),
    ("COP-003", "Açúcar refinado 1 kg", "Copa", "PCT", None, False, 4, 6, 4.9),
]
FORNECEDORES = [
    ("Limpa Bem Distribuidora (exemplo)", "Juliana", "(21) 90000-0001", ["Limpeza", "Copa"]),
    ("Embalagens Vale do Paraíba (exemplo)", "Marcos", "(24) 90000-0002", ["Sacos", "Contentores"]),
    ("Proteção Total EPI (exemplo)", "Fernanda", "(21) 90000-0003", ["EPI"]),
    ("Papelaria Central (exemplo)", "Rafael", "(24) 90000-0004", ["Escritório"]),
]
DIAS_CONTAGEM = {"Queimados": list(range(119, 0, -7)), "Resende": [110, 95, 80, 65, 50, 35, 21],
                 "Barra do Piraí": [115, 85, 55, 25]}
RESPONSAVEL = {"Queimados": "Carlos Henrique Lima", "Resende": "Ana Paula Souza", "Barra do Piraí": "Ana Paula Souza"}


def _quando(d: date, hora: int) -> datetime:
    return datetime.combine(d, time(hora), tzinfo=BRASILIA).astimezone(UTC)


async def semear(db: AsyncSession) -> str:
    if await db.scalar(select(Unidade.id).limit(1)):
        return "O banco já tem dados: nada foi feito. Para recomeçar, apague o banco (make down -v ou o arquivo)."
    r = random.Random(20261117)
    base = hoje()

    unidades = {nome: Unidade(nome=nome, encerramento=enc, frequencia_dias=freq) for nome, enc, freq, _ in UNIDADES}
    porte = {nome: p for nome, *_, p in UNIDADES}
    categorias = {nome: Categoria(nome=nome) for nome in CATEGORIAS}
    db.add_all([*unidades.values(), *categorias.values()])
    await db.flush()

    produtos: dict[str, Produto] = {}
    for cod, nome, cat, medida, emb, val, *_ in PRODUTOS:
        produtos[cod] = Produto(codigo=cod, nome=nome, categoria_id=categorias[cat].id, medida=medida,
                                embalagem_nome=emb[0] if emb else None, embalagem_quantidade=emb[1] if emb else None,
                                controla_validade=val)
    db.add_all(produtos.values())
    await db.flush()

    for pid, nome, email, papeis, nomes_unidades in PESSOAS:
        db.add(Pessoa(id=uuid.UUID(pid), nome=nome, email=email, papeis=papeis))
        await db.flush()
        for u in (nomes_unidades or list(unidades)):
            db.add(PessoaUnidade(pessoa_id=uuid.UUID(pid), unidade_id=unidades[u].id))

    minimo = {(linha[0], u): max(1, round(linha[6] * porte[u])) for linha in PRODUTOS for u in unidades}
    for (cod, u), q in minimo.items():
        db.add(EstoqueMinimo(produto_id=produtos[cod].id, unidade_id=unidades[u].id, quantidade=q))

    saldos_finais: dict[tuple[str, str], float | None] = {}
    for u, unidade in unidades.items():
        saldo = {cod: round(minimo[(cod, u)] * (1.6 + r.random())) for cod in produtos}
        anterior: dict[str, float | None] = {}
        movs_desde: list[Mov] = []
        ultima_dia = DIAS_CONTAGEM[u][-1]
        for dias in range(120, -1, -1):
            dia = base - timedelta(days=dias)
            for cod, *_, consumo_q, _preco in PRODUTOS:
                p = produtos[cod]
                consumo = consumo_q * porte[u]
                if dia.weekday() < 5 and r.random() < 0.45:
                    q = max(1, round(consumo / 10 * (0.5 + r.random())))
                    if saldo[cod] >= q:
                        saldo[cod] -= q
                        db.add(Movimentacao(tipo="saida", produto_id=p.id, unidade_id=unidade.id, quantidade=q,
                                            data=_quando(dia, 9 + r.randrange(8)), autor=RESPONSAVEL[u]))
                        movs_desde.append(Mov(cod, "saida", q))
                if dias > 12 and saldo[cod] < minimo[(cod, u)] and r.random() < 0.5:
                    passo = p.embalagem_quantidade or 1
                    q = -(-(minimo[(cod, u)] + consumo) // passo) * passo
                    saldo[cod] += q
                    db.add(Movimentacao(tipo="entrada", produto_id=p.id, unidade_id=unidade.id, quantidade=q,
                                        data=_quando(dia, 10), observacao="Reposição", autor="Mariana Costa"))
                    movs_desde.append(Mov(cod, "entrada", q))
            if dias in DIAS_CONTAGEM[u]:
                itens: dict[str, float | None] = dict(saldo)
                if dias == ultima_dia and u == "Queimados":  # dois itens sumiram sem saída registrada (divergência)
                    for cod in ("EPI-002", "LIM-001"):
                        itens[cod] = saldo[cod] = max(0, round(saldo[cod] * 0.4))
                if dias == ultima_dia and u == "Barra do Piraí":  # itens da copa ficaram sem contar
                    for cod in ("COP-001", "COP-002", "COP-003"):
                        itens[cod] = None
                c = Contagem(unidade_id=unidade.id, data=dia, responsavel=RESPONSAVEL[u], situacao="finalizada",
                             finalizada_em=_quando(dia, 16))
                db.add(c)
                await db.flush()
                divs = calcular_divergencias([ItemContado(k, v) for k, v in itens.items()], anterior, movs_desde)
                com_div = {d.produto_id for d in divs}
                for cod, qtd in itens.items():
                    db.add(ItemContagem(contagem_id=c.id, produto_id=produtos[cod].id, quantidade=qtd,
                                        observacao="Conferir: faltou na prateleira." if cod in com_div else ""))
                for d in divs:
                    db.add(Divergencia(contagem_id=c.id, produto_id=produtos[d.produto_id].id, anterior=d.anterior,
                                       entradas=d.entradas, saidas=d.saidas, esperado=d.esperado, contado=d.contado))
                anterior = {k: (v if v is not None else anterior.get(k)) for k, v in itens.items()}
                movs_desde = []
        for cod in produtos:
            saldos_finais[(cod, u)] = saldo[cod]

    # Contagem aberta hoje em Barra do Piraí, com metade dos itens contados.
    aberta = Contagem(unidade_id=unidades["Barra do Piraí"].id, data=base, responsavel="Ana Paula Souza")
    db.add(aberta)
    await db.flush()
    for i, cod in enumerate(produtos):
        qtd = saldos_finais[(cod, "Barra do Piraí")] if i % 2 == 0 else None
        db.add(ItemContagem(contagem_id=aberta.id, produto_id=produtos[cod].id, quantidade=qtd, observacao=""))

    for u, unidade in unidades.items():
        for cod, p in produtos.items():
            db.add(Saldo(produto_id=p.id, unidade_id=unidade.id, quantidade=saldos_finais[(cod, u)]))
            if p.controla_validade:
                db.add(Lote(produto_id=p.id, unidade_id=unidade.id, numero=f"L{r.randrange(10000, 99999)}",
                            validade=base + timedelta(days=round(10 + r.random() * 200)),
                            quantidade=saldos_finais[(cod, u)] or 0))

    fornecedores = {}
    for nome, contato, tel, cats in FORNECEDORES:
        fornecedores[nome.split()[0]] = f = Fornecedor(nome=nome, contato=contato, telefone=tel,
                                                     categorias=[str(categorias[c].id) for c in cats])
        db.add(f)
    await db.flush()

    preco = {linha[0]: linha[8] for linha in PRODUTOS}

    async def cotacao(numero, titulo, u, status, forn, criada, itens, com_preco=True):
        c = Cotacao(numero=numero, titulo=titulo, unidade_id=unidades[u].id, status=status,
                    fornecedor_id=fornecedores[forn].id if forn else None,
                    criado_em=_quando(base - timedelta(criada), 9))
        db.add(c)
        await db.flush()
        for ordem, (cod, q) in enumerate(itens):
            db.add(ItemCotacao(cotacao_id=c.id, produto_id=produtos[cod].id, ordem=ordem, quantidade=q,
                               preco=preco[cod] if com_preco else None))
        db.add(EventoCotacao(cotacao_id=c.id, autor="Mariana Costa", descricao="Criou a cotação", data=c.criado_em))
        if status != "rascunho":
            db.add(EventoCotacao(cotacao_id=c.id, autor="Mariana Costa", descricao="Enviou para cotação",
                                 data=_quando(base - timedelta(criada - 1), 11)))
            db.add(AnexoCotacao(cotacao_id=c.id, tipo="proposta", nome=f"proposta-{forn.lower()}.pdf",
                                autor="Mariana Costa", enviado_em=_quando(base - timedelta(criada - 2), 10)))
        if status in ("aprovada", "recebida"):
            c.aprovada_por, c.aprovada_em = "Roberto Alves", _quando(base - timedelta(criada - 3), 15)
            db.add(EventoCotacao(cotacao_id=c.id, autor="Roberto Alves", descricao="Aprovou", data=c.aprovada_em))
        return c

    c1 = await cotacao(1, "Material de limpeza — setembro", "Queimados", "recebida", "Limpa", 60,
                       [("LIM-001", 36), ("LIM-002", 10), ("LIM-003", 18), ("LIM-005", 96)])
    recebida_em = _quando(base - timedelta(50), 14)
    db.add(EventoCotacao(cotacao_id=c1.id, autor="Mariana Costa", data=recebida_em,
                         descricao="Marcou como recebida e gerou a entrada no estoque"))
    for cod, q in [("LIM-001", 36), ("LIM-002", 10), ("LIM-003", 18), ("LIM-005", 96)]:
        db.add(Movimentacao(tipo="entrada", produto_id=produtos[cod].id, unidade_id=unidades["Queimados"].id,
                            quantidade=q, data=recebida_em, origem="cotacao", referencia=str(c1.id),
                            observacao="Cotação nº 1", autor="Mariana Costa"))
    await cotacao(2, "Sacos infectantes — Resende", "Resende", "aprovada", "Embalagens", 9,
                  [("SAC-001", 500), ("SAC-002", 300), ("CON-003", 40)])
    await cotacao(3, "EPI — Queimados", "Queimados", "enviada", "Proteção", 4,
                  [("EPI-001", 20), ("EPI-002", 100), ("EPI-003", 10)])
    await cotacao(4, "Escritório — Barra do Piraí", "Barra do Piraí", "rascunho", None, 1,
                  [("ESC-001", 10), ("ESC-002", 50)], com_preco=False)

    for nome, itens in [
        ("Material de limpeza", [("LIM-001", 24), ("LIM-002", 6), ("LIM-003", 12), ("LIM-004", 24), ("LIM-005", 64),
                                 ("LIM-006", 10)]),
        ("Sacos e coletores", [("SAC-001", 500), ("SAC-002", 300), ("SAC-003", 200), ("CON-003", 40)]),
        ("Copa", [("COP-001", 500), ("COP-002", 10), ("COP-003", 6)]),
    ]:
        db.add(ModeloCotacao(nome=nome, itens=[{"produto_id": str(produtos[c].id), "quantidade": q} for c, q in itens]))

    await db.commit()
    return f"Dados de exemplo gravados: {len(unidades)} unidades, {len(produtos)} produtos e 120 dias de história."
