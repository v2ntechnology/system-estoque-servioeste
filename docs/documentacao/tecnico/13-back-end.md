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
- **Importação** (`app/services/planilha.py`, openpyxl): só `.xlsx` (até 5 MB, primeira aba). Acha a linha de
  cabeçalho nas 30 primeiras pelo **nome** das colunas (Código/Cód., Produto/Material/Descrição, Contagem/Quantidade/
  Qtd, Unidade de medida/UN, Observação/Obs., Valor/Preço) e lê "Unidade:", "Responsável:" e "Data:" acima dele
  (na mesma célula ou na do lado). Para em 3 linhas sem produto e ignora "Total". Quantidade vazia = não contado;
  texto ou negativo = linha com erro. Classificação: código conhecido = ok; código novo = novo (vira produto ao
  confirmar); sem código, acha pelo nome sem acento ou fica "associar". Confirmar uma Declaração cria a contagem
  finalizada (fora da planilha = não contado); uma planilha de cotação cria a cotação em rascunho com os preços.
  O formato foi tirado da documentação técnica: conferir com uma planilha real da Servioeste.
- **Fotos e anexos** (spec 005, `services/arquivos.py`, tabela `arquivos`): `POST /arquivos` (foto da contagem,
  só imagem) e o anexo da cotação gravam em `ARQUIVOS_DIR` (padrão `arquivos/`, fora do git; no Docker, volume
  `arquivos` em `/dados/arquivos`) com nome sorteado em pastas por mês. Tipo conferido pelos primeiros bytes (JPEG,
  PNG, WebP, HEIC, PDF), até 10 MB (`ARQUIVO_MAX_BYTES`). `GET /arquivos/{id}` só para quem vê a unidade do arquivo
  (senão 404); imagem em linha, PDF como download. O item da contagem guarda o id em `foto` e a resposta traz
  `foto_url`; o anexo traz `url`. `salvar` faz flush: o anexo aponta para o arquivo e o Postgres confere a ordem.

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

Testes: o SQLite dos testes liga `PRAGMA foreign_keys=ON` (como o Postgres) e grava os arquivos numa pasta temporária.

Teste isolado: `cd system-servioeste-estoque-back && .venv/bin/pytest tests/test_contagens.py -k divergencia`.
Migração nova: `DATABASE_URL=sqlite+aiosqlite:///./x.db .venv/bin/alembic revision --autogenerate --rev-id 0002 -m nome`,
revisar o arquivo e conferir com `alembic check`.
