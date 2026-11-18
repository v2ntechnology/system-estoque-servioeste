# Pesquisa e decisões: spec 002

## D1 — Moldura do Radar no lugar da barra do topo
**Decisão**: barra de apps (`AppRail`) + sidebar (`Sidebar`) num cartão à esquerda, como o `IconRail` do Radar.
**Por quê**: pedido da equipe; a barra de apps deixa a pessoa trocar de aplicativo sem voltar ao Hub.

## D2 — Lista de apps fixa nesta fase
**Decisão**: `apps.ts` com Hub, Estoque, Radar, Ponto e Resíduos (portas locais em dev, `/<slug>/` em produção).
**Depois**: vem do Hub (`GET /api/apps`), só com os apps liberados para a pessoa.

## D3 — Cores
**Decisão**: preto, branco e cinza; botão principal preto (`--primary`, como no Radar); verde só em selecionado,
foco e hover; selos e faixas neutros com ponto ou ícone colorido; entrada verde e saída vermelha
(`components/ui/movimento.tsx`). Constituição 2.0.0 → 2.1.1.

## D4 — Sem barra de rolagem
**Decisão**: regra global em `index.css` (`scrollbar-width: none` e `::-webkit-scrollbar`), mantendo a rolagem por
mouse, toque e teclado.

## D5 — Resumo ao lado das listas
**Decisão**: Cotações e Contagens abrem o resumo à direita, com o id na URL (`?cotacao=`, `?contagem=`); no
celular, por cima da lista. **Por quê**: ver a lista e o detalhe ao mesmo tempo (referência
`lista-com-detalhe-ao-lado.png`) e poder mandar o link.

## D6 — Situação do estoque
**Decisão**: abaixo do mínimo = crítica; até 1,5× o mínimo = atenção; acima = boa; sem contagem = não contado
(`features/catalogo/util.ts::situacao`). O medidor enche com 2× o mínimo.

## D7 — Testes e o AbortSignal
**Decisão**: `tests/setup.ts` descarta o `signal` do `Request`, porque o react-router passa o AbortSignal do jsdom e
o `fetch` do Node 26 o recusa; sem isso, qualquer mudança de URL quebra o teste.
