# Tarefas: Barra de apps, sidebar e cores

## Fase 1 — Regras

- [X] T001 Spec 002, referência em `docs/img/design/referencias/` e constituição 2.0.0 (princípio XI)

## Fase 2 — Moldura

- [X] T002 Tokens: primário preto/branco; verde só selecionado, foco e hover
- [X] T003 Selos e faixas de situação neutros com ponto/ícone colorido; Kpi sem valor colorido
- [X] T004 `AppRail` com os apps da Servioeste e `Sidebar` com grupos, contadores, unidade e pessoa
- [X] T005 `AppShell` com a gaveta no celular; remover `TopBar`

## Fase 3 — Catálogo

- [X] T006 Componente `Medidor` e situação do estoque (Boa, Atenção, Crítica)
- [X] T007 Catálogo no layout da referência, com estatísticas recolhíveis e paginação

## Fase 3b — Referências novas

- [X] T011 Indicadores com tendência (`Kpi` + `Painel.anterior`)
- [X] T012 Listinha de "abaixo do mínimo" com cobertura e falta
- [X] T013 Cotações com resumo ao lado (`?cotacao=`), teste incluído
- [X] T014 Sem barra de rolagem em lugar nenhum (constituição 2.1.0)
- [X] T015 Contagens: indicadores (em dia, em andamento, divergências, acurácia), cartão por unidade com as últimas
  contagens e histórico com resumo ao lado (`?contagem=`)
- [X] T016 Histórico de contagens em linhas leves, agrupado por mês; barra de progresso neutra
- [X] T017 Entrada verde e saída vermelha em todas as telas (`components/ui/movimento.tsx`)
- [X] T018 Produto: resumo com situação e cobertura, estoque por unidade em listinha com mínimo editável no lápis
- [X] T020 Painel: contagens, divergências e cotações em listinha; validade vazia vira uma linha discreta
- [X] T019 Contagem: lista compacta agrupada por categoria, botões − e +, atalhos de embalagem, observação e foto

## Fase 4 — Verificação

- [X] T008 Testes ajustados à sidebar; `make test` e `make lint` verdes
- [X] T009 Docs: manual, técnico, backlog, changelog e PDFs
- [ ] T010 Conferir no navegador (computador e celular)
