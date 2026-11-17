# 10. Arquitetura

## Stack

A mesma das outras automações da Servioeste (constituição, núcleo VI):

- **Front-end** (`system-servioeste-estoque-front/`): React 19, Vite 6, TypeScript, Tailwind 4, componentes no estilo
  shadcn/ui copiados do Ponto e do Resíduos, TanStack Query, react-router 7, lucide-react, fonte Rubik. Dados
  simulados com MSW.
- **Back-end** (a fazer, `system-servioeste-estoque-back/`): Python 3.12, FastAPI, SQLAlchemy async, Alembic,
  PostgreSQL; Excel com pandas e openpyxl; PDF com WeasyPrint; tarefas agendadas com APScheduler.
- **Infra** (a fazer): Docker Compose e Caddy, no domínio único `automacoes.servioeste.com.br/estoque/`.

## Onde está cada coisa (front-end)

| Pasta | Conteúdo |
| --- | --- |
| `src/lib/tipos.ts` | Contrato da API `/api/v1` (vira tipos gerados do `openapi.yaml` quando o back-end existir). |
| `src/lib/api.ts` | Cliente HTTP (`api`, `post`, `patch`, `put`, `query`), erro `ApiError(status, detail)`. |
| `src/lib/papeis.ts` | Papéis, ações e `pode(eu, acao)`. Só esconde na interface; quem decide é a API. |
| `src/lib/unidade.tsx` | Unidade ativa da barra do topo (`""` = todas), guardada em `estoque-unidade`. |
| `src/features/<área>/api.ts` | Hooks do TanStack Query por área; chave de query = recurso (`["contagens", unidade]`). |
| `src/features/contagens/fila.ts` | Fila da contagem no aparelho (offline). |
| `src/pages/` | Uma página por rota; rotas em `src/rotas.tsx`. |
| `src/components/` | `ui/` (componentes base), `layout/` (AppShell, TopBar, UserMenu, RequirePapel), `form/`. |
| `src/mocks/` | Dados simulados (ver capítulo 12). |
| `src/dev/` + `dev-tools/` | Área do desenvolvedor (`/dev`). |

## Fluxo de dados

Tela → hook de `features/<área>/api.ts` → `lib/api.ts` → `/api/v1/...`. Hoje quem responde é o MSW; depois, a API.
As telas nunca importam `src/mocks`.

## Identidade e permissões

Sem login próprio (núcleo IV). `GET /api/v1/eu` devolve a pessoa (id do Hub, nome, e-mail, papéis do Estoque e
unidades liberadas). A barra do topo mostra só as abas dos papéis da pessoa; `RequirePapel` protege as rotas;
"Voltar ao Hub" usa `VITE_HUB_URL`.

## Regras que valem em todo lugar

- **Não contado ≠ zero** (princípio VIII): quantidade `null` em todo o fluxo; `lerQuantidade("")` devolve `null`;
  `numero(null)` mostra "—".
- **Divergência**: `esperado = anterior + entradas − saídas`; aponta quando a falta passa de 10% e de 2 unidades
  (`src/mocks/regras.ts`, com teste; vai para o back-end com os mesmos casos).
- **Sugestão de compra**: `mínimo + consumo mensal − saldo`, arredondado para a embalagem.
- **Contagem finalizada** e aprovação de cotação não mudam mais (princípio IX).

## Rotas da API (contrato)

As da documentação técnica (`docs/Documentação Técnica — Estoque e Cotações Servioeste.md`), mais:
`GET /eu`, `GET /categorias`, `PATCH /unidades/{id}`, `GET /contagens`, `GET /contagens/{id}`,
`GET /cotacoes/sugestoes`, `GET|POST /modelos-cotacao`, `POST /cotacoes/{id}/enviar`,
`GET /fornecedores/{id}/cotacoes`, `PATCH /importacao/{id}/linhas/{linha}`.
