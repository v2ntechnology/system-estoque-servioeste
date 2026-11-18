# 4. Painel, catálogo, movimentações e relatórios

## Painel

É a primeira tela. Mostra, para as unidades que você vê:

- itens **abaixo do mínimo**, com o saldo, quanto do mínimo está coberto e quanto falta;
- **contagens** atrasadas em relação ao calendário da unidade;
- **cotações em aberto**;
- **divergências** da última contagem;
- **lotes** que vencem nos próximos 30 dias.

Tocar em qualquer item abre o detalhe.

## Catálogo

Um catálogo único para todas as unidades. A lista mostra, para cada produto, o código, a categoria, o estoque, a
embalagem e a **situação**, com um medidor: **Boa** (verde, bem acima do mínimo), **Atenção** (perto do mínimo),
**Crítica** (abaixo do mínimo) ou **Não contado**. No alto ficam as estatísticas do estoque (produtos, abaixo do
mínimo, situação geral, consumo do mês e não contados), que podem ser recolhidas. Dá para buscar, filtrar por
categoria e ordenar por situação, nome ou saldo; a lista mostra 10 produtos por página. Ao abrir um
produto você vê a situação, o saldo, o mínimo, o consumo médio e a **cobertura** (quantos dias o saldo dura); o
estoque de cada unidade (o administrador e o comprador mudam o mínimo pelo lápis); as últimas movimentações; os
últimos preços aprovados; e os **lotes e validades**.

## Movimentações

Lista o que entrou e saiu de cada unidade. **Entrada aparece em verde** (↙) e **saída em vermelho** (↗), aqui e em
todas as telas. **Registrar** permite lançar uma entrada ou uma saída à mão. As entradas
das cotações recebidas aparecem sozinhas. Transferência entre unidades ainda não faz parte do sistema.

## Relatórios

Escolha a unidade e o mês para ver entradas, saídas, gasto e o saldo de cada produto, comparados ao mês anterior.
Tocar nos quadros **Entradas**, **Saídas** ou **Gasto** abre o **gráfico** do histórico: por dia do mês ou pelos
últimos 6 meses, em área, colunas ou tabela, com a divisão por categoria. **Exportar para Excel** baixa o relatório
para abrir no Excel. O resumo semanal por e-mail chega numa próxima etapa.

## Importação das planilhas atuais

Para não começar do zero, o administrador pode enviar uma planilha **Declaração de Estoque** ou de **cotação**:

1. escolha o tipo, a unidade e o arquivo;
2. confira a **pré-visualização**: o que está certo, os produtos novos, os que precisam ser **associados** a um
   produto do catálogo (quando a planilha não tem código) e as linhas com **erro** (que serão ignoradas);
3. toque em **Confirmar importação**. Nada é gravado antes disso.

A planilha precisa estar em **.xlsx** (no Excel: *Salvar como > Pasta de Trabalho do Excel*). O sistema acha
sozinho as colunas pelo nome (Código, Produto ou Material, Contagem ou Quantidade, Unidade de medida, Observação e,
na cotação, Valor) e lê a unidade, o responsável e a data do cabeçalho. Quantidade em branco continua "não
contado". Uma planilha de cotação vira uma cotação em rascunho, com os preços da planilha.

> Na demonstração (dados de exemplo), a pré-visualização mostra linhas de exemplo, qualquer que seja o arquivo.
