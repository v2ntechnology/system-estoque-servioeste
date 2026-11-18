# Especificação: Gráficos do histórico nos indicadores

**Pasta da spec**: `specs/003-graficos-dos-indicadores` · **Criada em**: 2026-11-18 · **Situação**: Em implementação

**Pedido**: "Quero um botão nos cards que têm histórico de número em relação a mês e dia: quando clica no card,
mostra o gráfico. Algo parecido com isso (área), mas pode ser de coluna onde for interessante, de pizza…"

Referência: `docs/img/design/referencias/grafico-de-area.png`.

## História 1 — Ver o histórico de um indicador (P1)

Nos Relatórios, os cartões Entradas, Saídas e Gasto mostram o botão "Gráfico". Clicar no cartão abre o histórico da
unidade: **por dia** do mês escolhido ou **por mês** (6 meses até ele), em **área** (tendência, como a referência),
**colunas** (comparar dia a dia ou mês a mês) ou **tabela** (os números). Abaixo, a divisão do período **por
categoria** em lista de barras.

**Aceitação**: o gráfico mostra um tooltip com o valor e a data ao passar o mouse ou o dedo; trocar a escala não mostra
datas inválidas; a tabela tem uma linha por dia ou por mês.

## Decisões

- **Sem pizza**: para dividir um total em partes, a lista de barras (nome, barra, valor e %) é mais fácil de comparar
  que fatias parecidas (orientação de gráficos da equipe). A pizza fica de fora até haver um caso com 2 ou 3 partes
  bem diferentes.
- **Uma série, uma cor**: token `--grafico` (#6ca33c), validado nos dois temas; como o contraste no tema claro é
  2,95:1, a tabela fica sempre a um clique (princípio XI: cores de situação só em gráficos).
- Rota simulada `GET /relatorios/serie?unidade&metrica=entradas|saidas|gasto&escala=dia|mes&mes=AAAA-MM`.

## Fora do escopo

Gráficos nos indicadores do Painel e da Contagem (precisam de histórico próprio: abaixo do mínimo e divergências por
contagem) — próxima etapa.
