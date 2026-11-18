"""Linha de comando do Estoque.

    python -m app.cli seed                                   # dados de exemplo (banco vazio)
    python -m app.cli dar-acesso --email x@y --papel contador --unidade Queimados
"""
import argparse
import asyncio

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Pessoa, PessoaUnidade, Unidade
from app.papeis import PAPEIS
from app.seed import semear


async def _seed() -> None:
    async with SessionLocal() as db:
        print(await semear(db))


async def _dar_acesso(email: str, papeis: list[str], unidades: list[str]) -> None:
    """A pessoa precisa ter entrado uma vez pelo Hub (o perfil local nasce no primeiro acesso)."""
    async with SessionLocal() as db:
        pessoa = await db.scalar(select(Pessoa).where(Pessoa.email == email))
        if pessoa is None:
            raise SystemExit(f"Ninguém com o e-mail {email}. Peça para a pessoa abrir o Estoque pelo Hub uma vez.")
        invalidos = [p for p in papeis if p not in PAPEIS]
        if invalidos:
            raise SystemExit(f"Papel inválido: {', '.join(invalidos)}. Use: {', '.join(PAPEIS)}.")
        pessoa.papeis = sorted(set(pessoa.papeis or []) | set(papeis))
        for nome in unidades:
            u = await db.scalar(select(Unidade).where(Unidade.nome == nome))
            if u is None:
                raise SystemExit(f"Unidade não encontrada: {nome}.")
            if await db.get(PessoaUnidade, (pessoa.id, u.id)) is None:
                db.add(PessoaUnidade(pessoa_id=pessoa.id, unidade_id=u.id))
        await db.commit()
        novas = ", ".join(unidades) or "—"
        print(f"{pessoa.nome}: papéis {', '.join(pessoa.papeis)}; unidades acrescentadas: {novas}.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="comando", required=True)
    sub.add_parser("seed", help="grava os dados de exemplo num banco vazio")
    acesso = sub.add_parser("dar-acesso", help="dá papéis e unidades a uma pessoa")
    acesso.add_argument("--email", required=True)
    acesso.add_argument("--papel", action="append", default=[], help="contador, comprador, aprovador ou administrador")
    acesso.add_argument("--unidade", action="append", default=[], help="nome da unidade (pode repetir)")
    args = parser.parse_args()
    if args.comando == "seed":
        asyncio.run(_seed())
    else:
        asyncio.run(_dar_acesso(args.email, args.papel, args.unidade))


if __name__ == "__main__":
    main()
