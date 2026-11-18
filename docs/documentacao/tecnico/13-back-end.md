# 13. Back-end (spec 004)

## Stack e pastas

`system-servioeste-estoque-back/`, no padrão do Hub: FastAPI async, SQLAlchemy 2 async (asyncpg no PostgreSQL,
aiosqlite nos testes), Alembic, pydantic-settings, ruff com as regras `S`, pytest.

| Pasta | Conteúdo |
| --- | --- |
| `app/main.py` | App, CSRF por `Origin`, cabeçalhos de segurança, routers. `/api/docs` só fora de produção. |
| `app/api/deps.py` | `DB`, `EuAtual` (pessoa vinda do Hub), `exigir(acao)`, `unidades_visiveis`. |
| `app/api/routes/` | `eu` (+ `/api/health`), `cadastros`, `contagens`, `movimentacoes`, `painel`, `compras`, `relatorios`. |
| `app/models/` | Tabelas: pessoas, unidades, catálogo, mínimos, saldos, lotes, contagens, movimentações, cotações, importação e auditoria. |
| `app/regras.py` | Regras puras (iguais a `src/mocks/regras.ts`, com os mesmos testes). |
| `app/papeis.py` | Papéis e ações (iguais a `src/lib/papeis.ts`). |
| `app/services/` | Visões no formato de `src/lib/tipos.ts`, saldo e auditoria. |
| `app/seed.py`, `app/cli.py` | Dados de exemplo e linha de comando (`seed`, `dar-acesso`). |
| `alembic/versions/` | Migrações numeradas à mão (`0001_inicial.py`); migração aplicada não é editada. |

## Contrato

As rotas são as de `src/lib/tipos.ts` em `/api/v1`, com o mesmo comportamento dos handlers simulados
(`src/mocks/handlers/`): mudou um, muda o outro. Erros em `{ "detail": "…" }`, em português.

## Identidade (contrato do Hub)

O Caddy repassa `X-Hub-User-Id`, `-Email`, `-Name` (percent-encoding UTF-8) e `-Role`. O Estoque guarda o perfil
local (`pessoas`) com o mesmo id, criado no primeiro acesso, com os papéis e as unidades. Administrador do Hub é
administrador do Estoque e vê todas as unidades. Em desenvolvimento, sem cabeçalhos, vale a pessoa `DEV_USUARIO_*`
(a Ana dos dados de exemplo); com `ENVIRONMENT=production` a resposta é 401.

Dar acesso: a pessoa abre o Estoque pelo Hub uma vez e depois
`python -m app.cli dar-acesso --email x@y --papel contador --unidade Queimados` (pode repetir `--papel` e `--unidade`).

## Regras que a API garante

- Quantidade `NULL` = não contado em todo o caminho (item, saldo, importação); zero só quando digitado.
- Saldo guardado em `saldos`, mudado na mesma transação da movimentação, da finalização da contagem, do recebimento
  da cotação e da importação.
- Contagem finalizada, movimentação e aprovação não são apagadas; não há rota para isso.
- Auditoria (`auditoria`) na mesma transação: abrir e finalizar contagem, movimentação, mínimos, unidade,
  fornecedor, cotação criada, aprovada e recebida, importação confirmada.
- **Importação**: `POST /importacao/planilha` responde 501 até a spec da leitura do `.xlsx` (o formato real das
  planilhas da Servioeste ainda não foi conferido). Associação e confirmação de uma prévia já funcionam.
- Anexos de cotação: só o registro (nome, tipo, autor); guardar o arquivo no servidor tem spec própria.

## Comandos

```bash
make install-back   # venv com uv (Python 3.12)
make test-back      # pytest (SQLite em memória)
make lint-back      # ruff
make up             # Postgres (:5435) + API (:8004) no Docker, com alembic upgrade head
make seed           # dados de exemplo no Postgres do Docker
make api-local      # sem Docker: API com SQLite em arquivo (estoque-dev.db), só para conferir telas
make seed-local     # dados de exemplo no SQLite do api-local
make front          # telas ligadas à API (sem simulados)
```

Teste isolado: `cd system-servioeste-estoque-back && .venv/bin/pytest tests/test_contagens.py -k divergencia`.
Migração nova: `DATABASE_URL=sqlite+aiosqlite:///./x.db .venv/bin/alembic revision --autogenerate --rev-id 0002 -m nome`,
revisar o arquivo e conferir com `alembic check`.
