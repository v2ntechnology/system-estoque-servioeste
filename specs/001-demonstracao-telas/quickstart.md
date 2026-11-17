# Roteiro de validação: spec 001

Rodar `make front-mock` e abrir http://localhost:5177. Para o celular, usar as ferramentas do navegador em 360 px (ou
abrir pelo IP da máquina na mesma rede).

## A. Painel e papéis
1. Abre como **Ana** (administradora): todas as abas, seletor com as três unidades.
2. Painel mostra itens abaixo do mínimo, Resende atrasada, cotações 2/3/4 em aberto, divergências de Máscara PFF2 e
   Álcool 70% em Queimados e lotes vencendo.
3. Menu ☰ → Demonstração → **Carlos**: só Painel, Contagens, Catálogo e Movimentações; só Queimados.
4. Abrir `/cotacoes` como Carlos: "Sem acesso".

## B. Contagem (celular)
1. Como Carlos, em Contagens, **Abrir contagem de hoje** em Queimados.
2. Digitar `0` num produto: conta como contado. Apagar: volta a "Não contado" e a barra diminui.
3. Usar **+1 pacote** num produto com embalagem; escrever observação; escolher foto.
4. Menu → **Simular sem conexão**; digitar mais quantidades: aparece o aviso e o selo "guardada(s) no aparelho".
   Recarregar a página: nada se perde. Desligar a simulação: o selo vira "Tudo salvo".
5. Menu → **Simular fim do expediente**: aparece o aviso com quantos itens faltam.
6. **Finalizar contagem** com itens vazios: pede confirmação; depois, a contagem fica só leitura e os vazios
   continuam "Não contado".

## C. Cotação
1. Como **Mariana**, Nova cotação → Sugestões → salvar. Gerar PDF e imprimir/salvar.
2. Enviar para cotação, escolher fornecedor, preencher preços, anexar proposta.
3. Como **Roberto**, aprovar (aparece "Aprovada por Roberto Alves em …").
4. Como Mariana, **Marcar como recebida**: em Movimentações aparecem as entradas com origem "Cotação".

## D. Demais telas
1. Catálogo: buscar "papel", abrir o produto, mudar o mínimo de uma unidade.
2. Relatórios: Queimados, mês anterior, exportar e abrir o CSV no Excel.
3. Importação (como Ana): enviar qualquer `.xlsx`, associar as duas linhas sem código, confirmar; abrir a contagem
   criada.
4. Unidades: mudar o encerramento de Queimados.
5. Qualquer lista com `?cenario=vazio` e `?cenario=erro`.

## E. Produção
`make test` (inclui build e `check-no-mocks`) e `make lint` verdes.
