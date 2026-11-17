# Tarefas: Telas de demonstração do estoque e das cotações

**Spec**: `spec.md` · **Plano**: `plan.md` · Ordem do princípio VII: telas com dados simulados → validação com a
Servioeste. Back-end fica para a próxima spec. `[P]` = pode ser feita em paralelo.

## Fase 1 — Base do projeto

- [X] T001 Spec Kit, constituição 1.0.0 e `git init` com o remoto do GitHub
- [X] T002 Front-end com a base do Ponto/Resíduos: configs, tokens de cor, Rubik, logo, componentes de UI
- [X] T003 Porta 5177, proxy `/api` → 8004, MSW servido só no dev (`mswSoEmDev`) e `scripts/check-no-mocks.sh`
- [X] T004 Contrato `src/lib/tipos.ts`, cliente `src/lib/api.ts`, papéis `src/lib/papeis.ts`, unidade ativa

## Fase 2 — Dados simulados

- [X] T005 Regras puras em `src/mocks/regras.ts` (divergência, sugestão, consumo, progresso)
- [X] T006 Geração dos dados de exemplo (`src/mocks/dados.ts`) e estado persistido (`src/mocks/db.ts`)
- [X] T007 [P] Handlers de cadastros, estoque (contagens, movimentações, painel), compras e relatórios/importação
- [X] T008 Menu de demonstração (ver como, sem conexão, fim de expediente, restaurar)

## Fase 3 — Telas P1

- [X] T009 Moldura: AppShell, TopBar com abas por papel e seletor de unidade, UserMenu, RequirePapel
- [X] T010 [US1] Painel com os cinco indicadores
- [X] T011 [US2] Contagens: calendário por unidade e histórico
- [X] T012 [US2] Contagem: celular, não contado ≠ zero, obs., foto, progresso, aviso de expediente
- [X] T013 [US2] Fila offline da contagem (`features/contagens/fila.ts`) e envio em lote
- [X] T014 [US2] Contagem finalizada (só leitura) com divergências
- [X] T015 [P] [US3] Cotações: lista, nova (sugestões, modelo, catálogo), detalhe com etapas, anexos e histórico
- [X] T016 [P] [US3] PDF da cotação (página de impressão) e Fornecedores

## Fase 4 — Telas P2

- [X] T017 [P] [US4] Catálogo e produto (mínimos, lotes, preços, movimentações)
- [X] T018 [P] [US4] Movimentações (lista e registro)
- [X] T019 [P] [US4] Relatório mensal com comparação e exportação CSV
- [X] T020 [P] [US5] Importação com prévia, associação e confirmação
- [X] T021 [P] Unidades (encerramento e frequência)
- [X] T022 [US6] Área do desenvolvedor: visão geral, implementação, backlog, histórico, changelog, documentos

## Fase 5 — Verificação e documentação

- [X] T023 Testes: regras, fila, telas (painel, papéis, contagem, cotação) com `msw/node`
- [X] T024 `make test`, `make lint` e `make check-no-mocks` verdes
- [X] T025 `docs/`: manual do cliente, documentação técnica, backlog, changelog, PDFs e `/encerrar-dia`
- [ ] T026 Rodar o `quickstart.md` no navegador (computador e celular)
- [ ] T027 Apresentar à Servioeste e registrar os ajustes pedidos no backlog
