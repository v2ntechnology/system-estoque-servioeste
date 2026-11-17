# Especificação: Telas de demonstração do estoque e das cotações

**Pasta da spec**: `specs/001-demonstracao-telas`

**Criada em**: 2026-11-17

**Situação**: Em implementação

**Pedido**: "Vamos começar pelo front usando apenas dados simulados, só para demonstrar o app para o pessoal da
Servioeste. Layout (cores, fonte, logo) e tecnologias iguais aos do Hub e do Ponto."

## Contexto

A Servioeste controla o estoque de cada unidade (Queimados, Resende, Barra do Piraí…) em planilhas de Excel copiadas a
cada contagem, e faz as cotações em planilhas enviadas pelo WhatsApp (ver `docs/Minimundo — Sistema de Estoque e
Cotações Servioeste.pdf` e a documentação técnica em `docs/`). Antes de construir o back-end, a equipe precisa mostrar
o sistema funcionando, com dados de exemplo, para validar o fluxo com quem usa as planilhas hoje (constituição,
princípio VII). Esta spec cobre **só as telas**, com dados simulados que respondem como a API responderá.

## Histórias de usuário

### História 1 — Painel inicial (P1)

Ao abrir o sistema, a pessoa vê o que precisa de atenção: itens abaixo do mínimo, contagens pendentes ou atrasadas,
cotações em aberto, divergências da última contagem e lotes perto do vencimento, sempre das unidades liberadas a ela.

**Teste independente**: abrir `/`; os cartões mostram números coerentes com os dados de exemplo e levam à tela de
detalhe.

**Cenários de aceitação**:
1. **Dado** que há produtos abaixo do mínimo em Queimados, **quando** a pessoa abre o painel, **então** vê a lista com
   o saldo, o mínimo e a falta de cada um.
2. **Dado** que Resende não conta há mais tempo do que o calendário prevê, **então** a unidade aparece como atrasada.
3. **Dado** que a pessoa só tem a unidade Queimados liberada, **então** nada de outras unidades aparece.

### História 2 — Contagem pelo celular (P1)

O contador abre a contagem da sua unidade, vê a lista de produtos por categoria, busca pelo nome ou código e digita as
quantidades. Campo vazio é "não contado"; zero só quando digitado. Pode escrever observação e anexar foto em cada
linha. A tela mostra quantos itens faltam, avisa quando o expediente está para acabar e há itens sem contagem, e
continua funcionando sem internet (o que foi digitado fica guardado no aparelho e é enviado quando o sinal volta).

**Teste independente**: abrir uma contagem no celular (ou com a janela estreita), preencher alguns itens, deixar outros
vazios, recarregar a página e ver que nada se perdeu; finalizar e ver as divergências.

**Cenários de aceitação**:
1. **Dado** uma contagem aberta, **quando** a pessoa digita `0` num produto, **então** ele conta como contado (zero) e
   o contador de "faltam" diminui; **quando** apaga o valor, **então** volta a "não contado".
2. **Dado** que faltam itens e o encerramento da unidade está a 5 minutos ou menos, **então** aparece o aviso com a
   quantidade de itens não contados.
3. **Dado** que a conexão caiu, **então** a tela mostra "Sem conexão: as quantidades ficam guardadas neste aparelho" e
   segue aceitando digitação; quando volta, mostra que sincronizou.
4. **Dado** que um produto caiu de 40 para 10 entre contagens sem saída registrada, **quando** a contagem é
   finalizada, **então** ele aparece como divergência para conferência.
5. **Dado** que ainda há itens não contados, **quando** a pessoa tenta finalizar, **então** o sistema pede confirmação
   dizendo quantos ficam sem contagem (eles não viram zero).

### História 3 — Cotação do rascunho ao recebimento (P1)

O comprador monta uma cotação escolhendo produtos do catálogo ou partindo das sugestões (itens abaixo do mínimo e
consumo) ou de um modelo salvo (ex.: material de limpeza). Gera o PDF para enviar a quem vai cotar, anexa propostas,
nota fiscal e boleto, e acompanha a etapa: rascunho → enviada → aprovada → recebida. O aprovador aprova (fica o nome e
a data). Ao marcar como recebida, a entrada no estoque é gerada.

**Teste independente**: criar uma cotação a partir das sugestões, gerar o PDF, enviar, aprovar com o perfil de
aprovador, marcar como recebida e ver a entrada nas movimentações e o saldo do produto aumentar.

**Cenários de aceitação**:
1. **Dado** produtos abaixo do mínimo, **quando** o comprador cria a cotação pelas sugestões, **então** as quantidades
   sugeridas cobrem a falta até o mínimo mais o consumo do mês.
2. **Dado** uma cotação enviada, **quando** uma pessoa sem o papel de aprovador a abre, **então** não vê o botão
   Aprovar.
3. **Dado** uma cotação aprovada, **quando** é marcada como recebida, **então** cada item vira uma entrada na unidade
   da cotação e o histórico mostra quem fez e quando.
4. **Dado** um produto já comprado antes, **então** a linha mostra o último preço aprovado e o fornecedor.

### História 4 — Catálogo, movimentações e relatórios (P2)

Catálogo único com código, nome, unidade de medida, categoria, embalagem (ex.: pacote com 8 rolos), mínimo por unidade
e lotes com validade. Registro de entradas e saídas por unidade, com saldo esperado e consumo médio mensal. Relatório
mensal por unidade comparado ao mês anterior, com botão de exportar para Excel.

**Teste independente**: buscar "papel" no catálogo, abrir o produto, ver mínimos e lotes; registrar uma saída e ver o
saldo cair; abrir o relatório de outubro de Queimados e ver a variação em relação a setembro.

### História 5 — Importação das planilhas atuais (P2)

A pessoa envia uma planilha "Declaração de Estoque" ou de cotação e vê uma pré-visualização: o que será criado, o que
já existe, o que tem erro (linha, coluna e motivo) e os produtos sem código para associar ao catálogo. Só grava ao
confirmar.

**Teste independente**: escolher qualquer arquivo `.xlsx`; a pré-visualização de exemplo aparece com erros e
associações pendentes; confirmar mostra o resumo.

### História 6 — Área do desenvolvedor (P2)

Em desenvolvimento, `/dev` mostra a implementação (specs e tarefas), o backlog, o histórico de commits, o changelog e
os documentos do projeto, como no Ponto e no Resíduos. Nunca existe no build de produção.

## Casos-limite

- Pessoa sem nenhuma unidade liberada: telas mostram "Nenhuma unidade liberada" com orientação para pedir acesso no Hub.
- Contagem com todos os itens vazios: finalizar é recusado ("Nenhum item contado").
- Produto controlado por validade sem lote cadastrado na unidade: aparece sem alerta, com "sem lote".
- Cotação sem itens: não pode ser enviada.
- Quantidade negativa ou com texto: recusada no campo, com mensagem.
- Dados simulados: `?cenario=vazio` e `?cenario=erro` na URL mostram os estados vazio e de falha de qualquer lista.

## Requisitos funcionais

- **RF-01**: Barra do topo no padrão do Hub, com seletor da unidade ativa (só as liberadas) e menu do usuário.
- **RF-02**: Cada tela e ação aparece só para os papéis que a usam (contador, comprador, aprovador, administrador).
- **RF-03**: Em dados simulados, um seletor no menu troca a pessoa de exemplo, para demonstrar cada papel.
- **RF-04**: Painel com os cinco indicadores da história 1.
- **RF-05**: Lista de contagens por unidade com calendário (próxima data, atrasada) e abertura de contagem nova.
- **RF-06**: Tela de contagem otimizada para celular, com as regras da história 2 e progresso "X de Y contados".
- **RF-07**: Guardar a contagem em andamento no aparelho e sincronizar quando houver conexão.
- **RF-08**: Finalizar contagem calcula divergências (queda não explicada por saídas registradas).
- **RF-09**: Catálogo com busca por nome, código e categoria; detalhe com mínimos por unidade e lotes.
- **RF-10**: Movimentações (entradas e saídas) com filtro por unidade e tipo, e registro de saída/entrada manual.
- **RF-11**: Cotações com etapas, itens, sugestões, modelos, anexos, último preço aprovado, aprovação e recebimento.
- **RF-12**: PDF da cotação (versão para impressão/salvar como PDF pelo navegador nesta fase).
- **RF-13**: Cadastro de fornecedores com categorias e histórico de preços.
- **RF-14**: Relatório mensal por unidade com comparação ao mês anterior e exportação.
- **RF-15**: Importação com pré-visualização, erros, associação ao catálogo e confirmação.
- **RF-16**: Cadastro de unidades com horário de encerramento e frequência de contagem (administrador).
- **RF-17**: Toda lista tem estados de carregando, vazio e erro.
- **RF-18**: Área do desenvolvedor `/dev` só em desenvolvimento.

## Entidades

Unidade, Categoria, Produto, EstoqueMinimo, Lote, Contagem, ItemContagem, Movimentacao, Fornecedor, Cotacao,
ItemCotacao, ModeloCotacao, Anexo, Auditoria e Pessoa (perfil local com papéis e unidades). Detalhes em
`data-model.md`.

## Critérios de sucesso

- **CS-01**: A Servioeste consegue seguir o roteiro da demonstração (documentação técnica, "Roteiro da demonstração")
  do começo ao fim em cerca de 10 minutos, sem tela quebrada.
- **CS-02**: A contagem é usável num celular de 360 px de largura, sem rolagem horizontal.
- **CS-03**: Nenhuma tela mostra zero onde a pessoa não digitou nada.
- **CS-04**: O build de produção não contém dados simulados nem a área do desenvolvedor (`make check-no-mocks`).

## Fora do escopo

- API, banco, login (o Hub cuida), e-mail do resumo semanal, PDF gerado no servidor, leitura real de `.xlsx`.
- Itens "Fora do MVP" da constituição.

## Em aberto (com a Servioeste)

- Se campo vazio na planilha atual significa mesmo "não contado".
- Quem aprova as cotações hoje.
- Frequência real das contagens em cada unidade.
- Conteúdo das planilhas de saída (relatórios).
