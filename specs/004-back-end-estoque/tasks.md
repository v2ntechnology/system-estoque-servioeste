# Tarefas: Back-end do estoque

## Fase 1 — Fundação

- [X] T001 `system-servioeste-estoque-back/` com pyproject, ruff, pytest, Dockerfile e `infra/docker-compose.yml`
- [X] T002 Config, banco, CSRF, `GET /api/health`
- [X] T003 Identidade do Hub e perfil local (`deps.py`), `GET /api/v1/eu`, CLI `dar-acesso`
- [X] T004 Modelos e migração `0001_inicial`

## Fase 2 — Regras (testes antes)

- [X] T005 Testes de `regras.py`: divergência, sugestão, consumo, não contado ≠ zero
- [X] T006 `regras.py` com os testes verdes

## Fase 3 — Estoque (História 2)

- [X] T007 Unidades, categorias, produtos e mínimos
- [X] T008 Contagens: abrir, itens em lote, finalizar com divergências e saldo
- [X] T009 Movimentações e painel
- [X] T010 Auditoria na mesma transação
- [X] T011 Testes de rotas e permissões

## Fase 4 — Dados de exemplo (História 4)

- [X] T012 `make seed` com unidades, produtos, 120 dias de história, contagens, lotes e pessoas

## Fase 5 — Compras, relatórios e importação (História 3)

- [X] T013 Fornecedores, modelos, sugestões e cotações (etapas, anexos, recebimento)
- [X] T014 Relatório mensal e séries dos gráficos
- [X] T015 Importação com prévia, associação e confirmação: leitura do `.xlsx` pelo nome das colunas
  (`services/planilha.py`); planilha de cotação vira cotação em rascunho. Falta conferir com uma planilha real.

## Fase 6 — Integração

- [X] T016 Makefile (`up`, `api-local`, `seed`, `test`, `lint`) e documentação técnica
- [ ] T017 Conferir as telas com `make front` ligado à API (rotas conferidas por curl pelo proxy do Vite; falta o
  navegador)
- [X] T018 Rodar com PostgreSQL (`make up`, `make seed`): migração, dados de exemplo e fluxo de cotação conferidos
