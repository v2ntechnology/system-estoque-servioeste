# 12. Dados simulados e área do desenvolvedor

## Dados simulados (MSW)

Ligados só com `VITE_MOCK=true` em desenvolvimento (`make front-mock`). O `main.tsx` importa `src/mocks/browser.ts`
dentro de `if (import.meta.env.DEV && VITE_MOCK)`, e o service worker é servido pelo plugin `mswSoEmDev` do
`vite.config.ts`, direto do `node_modules`. `scripts/check-no-mocks.sh` falha se o build tiver MSW ou `/dev`.

| Arquivo | Papel |
| --- | --- |
| `mocks/dados.ts` | Gera os dados de exemplo: 3 unidades, 24 produtos, 120 dias de saídas e reposições, contagens, lotes, cotações, modelos e 4 pessoas. Sorteio com semente fixa e datas relativas a hoje. |
| `mocks/db.ts` | Estado em memória salvo em `estoque-mock-db`; visões montadas como a API fará (`verProduto`, `verUnidade`...). |
| `mocks/regras.ts` | Regras puras (divergência, sugestão, consumo, progresso). |
| `mocks/util.ts` | `rota(fn, { acao, lista })`: sem conexão simulada, espera, pessoa, permissão e `?cenario=vazio\|erro`. |
| `mocks/handlers/` | Rotas `/api/v1` por área. |
| `mocks/DemoMenu.tsx` | Itens do menu só na demonstração. |

### Menu "Demonstração"

No menu (ícone ☰), com os simulados ligados:

- **Ver como**: Ana (administradora), Carlos (contador de Queimados), Mariana (compradora), Roberto (aprovador);
- **Simular sem conexão**: a "API" passa a falhar como sem rede (a contagem guarda no aparelho);
- **Simular fim do expediente**: o encerramento das unidades vira "daqui a 4 minutos";
- **Restaurar dados de exemplo**.

`?cenario=vazio` ou `?cenario=erro` na URL mostram os estados vazio e de erro das listas.

## Área do desenvolvedor (`/dev`)

Só em `make front`/`make front-mock`; não existe no build. Lê `docs/`, `specs/`, a constituição e o README por
`import.meta.glob` e o `git log` pelo plugin `dev-tools/plugin.ts` (`/__dev/commits`).

| Aba | Fonte |
| --- | --- |
| Visão geral | `docs/backlog.md` + últimos commits |
| Implementação | `specs/*/` (etapas do Spec Kit) e `tasks.md` (tarefas `- [X] T001` por fase `## ...`) |
| Backlog | `docs/backlog.md` (formato `## Etapa N — Nome` + `- [ ] item`) |
| Histórico | `git log` (feat = nova funcionalidade; fix/refactor/perf/style = atualização; docs; resto = manutenção) |
| Changelog | `docs/changelog.md` |
| Documentos | `docs/`, `specs/`, constituição e README |
