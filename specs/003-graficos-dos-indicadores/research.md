# Pesquisa e decisões: spec 003

## D1 — Formas do gráfico
**Decisão**: área (tendência, como a referência), colunas (comparar períodos) e tabela (os números), escolhidas na
janela. Uma série por vez, então sem legenda: o título nomeia.

## D2 — Sem pizza
**Decisão**: a divisão por categoria é uma lista de barras (nome, barra, valor e %), do maior para o menor.
**Por quê**: a orientação de gráficos desaconselha pizza para comparar partes de tamanho parecido.

## D3 — Cor
**Decisão**: token `--grafico` = #6ca33c nos dois temas. O validador de paleta aprovou a faixa de luminosidade nos dois;
o #7fb84e (verde do tema escuro) ficou claro demais para gráfico. No tema claro o contraste é 2,95:1, então a
tabela fica sempre a um clique.

## D4 — Trocar a escala sem ler errado
**Decisão**: os pontos são convertidos pela escala da **resposta** (`data.escala`), porque a série anterior fica na
tela enquanto a nova carrega. Antes disso aparecia "Invalid Date" ao trocar para "Por mês" (achado pelo teste).
