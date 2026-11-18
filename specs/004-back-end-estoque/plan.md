# Plano: Back-end do estoque

**Spec**: `specs/004-back-end-estoque/spec.md` · **Data**: 2026-11-18

## Resumo

Nova pasta `system-servioeste-estoque-back/` no padrão do Hub: FastAPI async + SQLAlchemy 2 async + Alembic +
PostgreSQL, testes com pytest em SQLite em memória (aiosqlite), ruff com as regras `S`. Os handlers simulados
(`src/mocks/handlers/`) são a referência de comportamento: cada rota da API faz o que o handler faz.

## Contexto técnico

- Python 3.12, FastAPI, SQLAlchemy 2 (asyncpg em produção, aiosqlite nos testes), Alembic, pydantic-settings.
- Portas: API 8004, Postgres 5435 (`infra/docker-compose.yml`).
- Desenvolvimento sem Docker: `make api-local` sobe a API com SQLite em arquivo (`estoque-dev.db`), só para
  conferir telas; o banco oficial é o PostgreSQL.

## Verificação da constituição

| Princípio | Como cumpre |
| --- | --- |
| III Segurança | CSRF por `Origin`; identidade só por cabeçalho do Hub (fallback de dev bloqueado em produção); auditoria na transação; docs desligadas em produção. |
| IV Contrato do Hub | Sem login nem sessão: `X-Hub-User-*`; perfil local com o id do Hub; `GET /api/health`. |
| V Pronto é verificado | pytest em memória para regras, permissões e rotas; `make test` e `make lint`. |
| VI Stack | A mesma do Hub; nenhuma dependência fora da lista do Hub. |
| VII Frontend primeiro | As telas não mudam; `make front` passa a usar a API. Simulados seguem para a demonstração. |
| VIII Não contado ≠ zero | Quantidade `NULL` no banco; regras e testes cobrem vazio e zero. |
| IX Histórico | Sem rota de apagar contagem, movimentação ou aprovação; auditoria de alterações. |
| X Papéis e unidades | Dependência `exigir(acao)` e filtro de unidades em toda consulta. |

## Estrutura

```text
system-servioeste-estoque-back/
├── app/
│   ├── main.py            # app, CSRF, routers
│   ├── core/              # config, db
│   ├── api/deps.py        # DB, Eu (perfil local pela identidade do Hub), exigir(acao)
│   ├── api/routes/        # eu, cadastros, contagens, movimentacoes, painel, cotacoes, relatorios, importacao
│   ├── models/            # tabelas
│   ├── schemas.py         # respostas no formato de src/lib/tipos.ts
│   ├── regras.py          # divergência, sugestão, consumo (as mesmas de src/mocks/regras.ts)
│   ├── services/          # estoque (saldo, visões), auditoria
│   ├── seed.py            # dados de exemplo
│   └── cli.py             # seed, dar-acesso
├── alembic/versions/0001_inicial.py
└── tests/
```

## O que muda em `docs/`

Técnico: capítulo novo `13-back-end.md` (arquitetura, rotas, identidade, comandos); `11-desenvolvimento.md`.
README e Makefile. Manual do cliente: nada muda para quem usa (as telas são as mesmas).
