# Modelo de dados: spec 001

O contrato fica em `system-servioeste-estoque-front/src/lib/tipos.ts` (fonte da verdade nesta fase; vira o
`openapi.yaml` do back-end). Resumo das entidades e regras:

| Entidade | Campos principais | Regras |
| --- | --- | --- |
| Eu (pessoa) | id (do Hub), nome, e-mail, papéis, unidades | Identidade vem do Hub; papéis e unidades são do Estoque. |
| Unidade | nome, encerramento (HH:MM), frequência (dias), última e próxima contagem, atrasada | Atrasada quando a próxima já passou. |
| Categoria | nome | — |
| Produto | código, nome, categoria, medida, embalagem, controla validade, saldos, mínimos e consumo por unidade | Saldo `null` = nunca contado na unidade. |
| Lote | produto, unidade, número, validade, quantidade | Alerta com 30 dias ou menos. |
| Contagem | unidade, data, responsável, situação (aberta/finalizada), itens, divergências | Uma aberta por unidade; finalizada não muda. |
| ItemContagem | produto, quantidade (`null` = não contado), observação, foto | Vazio nunca vira zero. |
| Divergência | anterior, entradas, saídas, esperado, contado | Falta > 10% e ≥ 2 unidades. |
| Movimentação | tipo (entrada/saída), produto, unidade, quantidade, data, origem (manual/cotação/importação), autor | Nunca apagada. |
| Cotação | número, título, unidade, status, fornecedor, itens, anexos, eventos, aprovação | Rascunho → enviada → aprovada → recebida; aprovar exige fornecedor e preços; receber gera entradas. |
| ItemCotação | produto, quantidade, preço | — |
| ModeloCotação | nome, itens | — |
| Fornecedor | nome, contato, telefone, categorias | — |
| Prévia de importação | arquivo, tipo, unidade, linhas (ok/novo/associar/erro) | Só grava ao confirmar; "associar" bloqueia a confirmação. |
