# Pesquisa e decisões: spec 004

## D1 — Os simulados são a especificação executável
Cada rota da API reproduz o handler de `src/mocks/handlers/` (mesmos campos, mensagens e códigos). Mudou um, muda o
outro. Os testes da API usam os mesmos casos de `tests/regras.test.ts` do front.

## D2 — Identidade
Cabeçalhos `X-Hub-User-Id` (UUID), `-Email`, `-Name` (percent-encoding UTF-8) e `-Role` (`admin`|`usuario`), como no
contrato do Hub (spec 001-checagem-acesso do Hub). Perfil local `pessoas` com o mesmo id, criado no primeiro acesso.
Hub `admin` → papel `administrador`. Em desenvolvimento, sem cabeçalhos, usa `DEV_USUARIO_*` do `.env`; com
`ENVIRONMENT=production` o fallback não existe e a resposta é 401.

## D3 — Saldo guardado, não recalculado
Tabela `saldos` (produto × unidade, `NULL` = nunca contado), atualizada na mesma transação da movimentação e da
finalização da contagem, como nos simulados. Recalcular a partir do histórico fica para relatórios.

## D4 — Quantidades
`Numeric(14,3)` devolvendo `float` (`asdecimal=False`): aceita 1,5 L e não perde precisão no banco.

## D5 — Banco sem Docker no dia a dia
Os testes usam SQLite em memória (como no Hub). `make api-local` usa SQLite em arquivo só para conferir telas quando o
Docker Desktop está desligado; o oficial é PostgreSQL (`make up`).
