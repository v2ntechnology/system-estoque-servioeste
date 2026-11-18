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
| `src/lib/unidade.tsx` | Unidade ativa da sidebar (`""` = todas), guardada em `estoque-unidade`. |
| `src/features/<área>/api.ts` | Hooks do TanStack Query por área; chave de query = recurso (`["contagens", unidade]`). |
| `src/features/contagens/fila.ts` | Fila da contagem no aparelho (offline). |
| `src/pages/` | Uma página por rota; rotas em `src/rotas.tsx`. |
| `src/components/` | `ui/` (componentes base, `medidor`), `layout/` (AppShell, AppRail, Sidebar, UserMenu, RequirePapel), `form/`. |
| `src/mocks/` | Dados simulados (ver capítulo 12). |
| `src/dev/` + `dev-tools/` | Área do desenvolvedor (`/dev`). |

## Moldura e cores (spec 002)

- `components/layout/AppShell.tsx`: cartão à esquerda com `AppRail` (barra de apps, lista em `apps.ts`; em dev
  aponta para as portas locais, em produção para `/<slug>/`) e `Sidebar` (grupos em `navegacao.ts`, contadores do
  `GET /painel`, seletor de unidade, `UserMenu` no pé, abrindo para cima). Até `lg` (1024 px) vira barra fina com
  gaveta. A moldura é a do Radar (`IconRail` + painel).
- Cores (constituição 2.0.0, princípio XI): `--primary` preto/branco (botão principal); `--brand` verde só em
  selecionado, foco e hover; `Badge` `brand`/`warning`/`destructive` e `Faixa` são neutros com ponto ou ícone
  colorido; `Kpi` nunca colore o valor. `--warning` e `--destructive` só indicam situação e entram em gráficos.
- `components/ui/medidor.tsx`: semicírculo com tracinhos; `features/catalogo/util.ts::situacao` (abaixo do mínimo =
  crítica, até 1,5× = atenção, acima = boa, `null` = não contado).
- Entrada/saída: `components/ui/movimento.tsx` (`SeloMovimento`, `QtdMovimento`), verde e vermelho em todo lugar.
- Sem barra de rolagem: regra global em `index.css`.
- Listas com resumo ao lado: Cotações (`?cotacao=`) e Contagens (`?contagem=`); no celular o painel cobre a lista.
- Referências aprovadas em `docs/img/design/referencias/`.

## Gráficos (spec 003)

`components/graficos/GraficoSerie.tsx`: `GraficoSerie` (área ou colunas, SVG próprio, cruz e tooltip, mede a largura
com `ResizeObserver`), `TabelaSerie` e `ListaPartes` (no lugar de pizza). Cor no token `--grafico` (#6ca33c),
validada com o script da skill dataviz nos dois temas. `Kpi` com `onAbrir` vira botão; a janela é
`features/relatorios/GraficoDialog.tsx`, que lê `GET /relatorios/serie` e converte os pontos pela escala da resposta.

## Fluxo de dados

Tela → hook de `features/<área>/api.ts` → `lib/api.ts` → `/api/v1/...`. Hoje quem responde é o MSW; depois, a API.
As telas nunca importam `src/mocks`.

## Identidade e permissões

Sem login próprio (núcleo IV). `GET /api/v1/eu` devolve a pessoa (id do Hub, nome, e-mail, papéis do Estoque e
unidades liberadas). A sidebar mostra só as telas dos papéis da pessoa; `RequirePapel` protege as rotas;
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
`GET /cotacoes/sugestoes`, `GET /relatorios/serie?unidade&metrica=entradas|saidas|gasto&escala=dia|mes&mes`, `GET|POST /modelos-cotacao`, `POST /cotacoes/{id}/enviar`,
`GET /fornecedores/{id}/cotacoes`, `PATCH /importacao/{id}/linhas/{linha}`.
