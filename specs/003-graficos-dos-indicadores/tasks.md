# Tarefas: Gráficos do histórico nos indicadores

## Fase 1 — Dados e componentes

- [X] T001 Tipos `SerieRelatorio` e rota simulada `/relatorios/serie` (dia e mês, por categoria)
- [X] T002 `components/graficos/GraficoSerie.tsx`: área, colunas, tabela e lista de partes; token `--grafico`

## Fase 2 — Telas

- [X] T003 `Kpi` clicável com o botão "Gráfico"; janela `features/relatorios/GraficoDialog.tsx`
- [X] T004 Relatórios: Entradas, Saídas e Gasto abrem o histórico
- [ ] T005 Painel: histórico de abaixo do mínimo e divergências por contagem

## Fase 3 — Verificação

- [X] T006 Teste: abrir, trocar tipo, tabela e escala por mês sem datas inválidas
- [ ] T007 Conferir no navegador (mouse e toque)
