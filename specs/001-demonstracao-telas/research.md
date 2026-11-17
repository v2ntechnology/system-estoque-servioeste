# Pesquisa e decisões: spec 001

## D1 — Dados simulados por MSW

**Decisão**: handlers do MSW em `src/mocks/handlers/` respondem às rotas `/api/v1/...` da documentação técnica.
**Por quê**: as telas e os hooks já falam HTTP; quando a API existir, basta desligar o MSW (princípio VII). É o mesmo
padrão do Ponto. **Alternativa recusada**: funções de mock importadas pelos componentes (exigiria reescrever as telas).

## D2 — Estado dos simulados no navegador

**Decisão**: o "banco" simulado fica em memória e é salvo em `localStorage` (`estoque-mock-db`). O menu de
demonstração tem "Restaurar dados de exemplo".
**Por quê**: a demonstração precisa sobreviver a um recarregar (contagem, cotação aprovada…).

## D3 — Pessoa e papéis sem login

**Decisão**: `GET /api/v1/eu` devolve a pessoa (nome, papéis, unidades). Nos simulados, o menu troca entre quatro
pessoas de exemplo (administradora, contador de Queimados, compradora, aprovador).
**Por quê**: núcleo IV (o login é do Hub) e RF-03 (mostrar cada papel na demonstração).

## D4 — Contagem offline

**Decisão**: cada alteração da contagem vai primeiro para uma fila no `localStorage` (`estoque-fila-contagem-<id>`) e
é enviada em lote (`PATCH /contagens/{id}/itens`) quando há conexão. O menu de demonstração simula "sem conexão" (o
MSW passa a responder com erro de rede).
**Por quê**: mostrar o comportamento sem depender de PWA. IndexedDB e service worker da aplicação entram na spec do
offline real, como manda a documentação técnica.

## D5 — Aviso de fim de expediente

**Decisão**: a tela compara a hora atual com o `encerramento` da unidade (ex.: `17:00`) a cada 30 s; faltando 5 min ou
menos e havendo itens não contados, mostra o aviso. O menu de demonstração "simula fim de expediente" (o handler passa
a devolver o encerramento para daqui a 4 min).

## D6 — Divergência

**Decisão**: para cada item contado com contagem anterior: `esperado = anterior + entradas − saídas` no intervalo;
divergência quando `contado < esperado` em mais de 10% e pelo menos 2 unidades. Regra em `src/mocks/regras.ts`, com
teste; vai para o back-end na spec seguinte.

## D7 — Sugestão de compra

**Decisão**: `sugerido = max(0, mínimo + consumo médio mensal − saldo)`, arredondado para cima no múltiplo da
embalagem quando houver.

## D8 — PDF da cotação

**Decisão**: rota `/cotacoes/{id}/pdf` com layout de impressão (logo, itens, quantidades) e botão "Imprimir / salvar
PDF". O PDF gerado no servidor (WeasyPrint) entra com o back-end.
