# Especificação: Barra de apps, sidebar e cores preto, branco e verde

**Pasta da spec**: `specs/002-sidebar-e-cores`

**Criada em**: 2026-11-18

**Situação**: Em implementação

**Pedido**: "Vamos usar a sidebar que está no Radar e não a navbar das outras aplicações. Do lado esquerdo da sidebar
ficam os aplicativos, para a pessoa ir de um app para o outro clicando no ícone. Mesmas paletas de cores, mas sempre
preto e branco, e verde só para o que está selecionado e hover. Nada de amarelo. Cores de sucesso, aviso e erro só
para indicar situação (como o medidor de desempenho do print) e em gráficos mais detalhados."

Referência aprovada: `docs/img/design/referencias/lista-de-produtos.png` (lista de produtos com estatísticas,
medidor de desempenho, estoque, preço e ações).

## Histórias de usuário

### História 1 — Navegar pela sidebar (P1)

A pessoa vê, à esquerda, a **barra de apps** (ícones dos aplicativos da Servioeste, com o Estoque marcado) e, ao lado,
a **sidebar do Estoque** com as telas agrupadas (Visão geral, Estoque, Compras, Análise, Administração), contadores
do que precisa de atenção, a unidade ativa e, no pé, a própria pessoa com o menu. No celular, a sidebar abre por um
botão de menu e fecha ao escolher a tela.

**Aceitação**: clicar num app da barra leva ao endereço dele no domínio único (`/radar/`, `/ponto/`…); a tela atual
aparece selecionada em verde; só aparecem as telas dos papéis da pessoa.

### História 2 — Lista do catálogo como a referência (P1)

O catálogo vira uma lista no estilo da referência: título grande, busca, ordenar, filtro e botão principal preto;
faixa de **estatísticas** recolhível (produtos ativos, abaixo do mínimo, situação geral com medidor, saídas no mês e
valor estimado); e uma linha por produto com ícone da categoria, nome e código, **medidor da situação do estoque**
(saldo em relação ao mínimo: Boa, Atenção, Crítica), saldo, mínimo, consumo, último preço e ações; com paginação.

### História 3 — Cores (P1)

Interface em preto, branco e cinza; verde só para selecionado, foco e hover. Sucesso, aviso e erro só em indicadores
de situação (medidor, pontinho do selo, ícone de alerta) e gráficos. Nenhum fundo, texto de valor ou botão amarelo.

### História 4 — Painel e cotações nas referências novas (P1)

- Indicadores do painel no estilo `indicadores.png`: rótulo, número grande e uma linha de detalhe com a tendência em
  relação à contagem anterior (seta verde quando melhora, vermelha quando piora).
- "Itens abaixo do mínimo" no estilo `listinha-com-barra.png`: produto, saldo, cobertura do mínimo (barra) e falta.
- Cotações no estilo `lista-com-detalhe-ao-lado.png`: ao clicar numa cotação, o resumo abre à direita (fornecedor,
  itens com preço, total e ações enviar, aprovar, receber, PDF e abrir), sem sair da lista; no celular, por cima.
- Nenhuma barra de rolagem visível em lugar nenhum.

## Requisitos

- **RF-01**: Barra de apps com Hub, Estoque, Radar, Ponto e Resíduos (lista fixa nesta fase; depois vem do Hub,
  só com os apps liberados para a pessoa).
- **RF-02**: Sidebar com grupos, contadores (abaixo do mínimo, contagens atrasadas ou em andamento, cotações em
  aberto), seletor de unidade e menu da pessoa (tema, demonstração, área do dev, voltar ao Hub).
- **RF-03**: Botão principal preto (branco no tema escuro); item selecionado e hover em verde.
- **RF-04**: Selos de situação neutros com um ponto colorido; faixas de aviso neutras com ícone colorido.
- **RF-05**: Catálogo no layout da referência, com medidor de situação e paginação de 10 itens.
- **RF-06**: No celular (até 1024 px), sidebar em gaveta; a contagem continua usável em 360 px.

## Fora do escopo

Lista de apps vinda do Hub, fotos de produto (o ícone da categoria fica no lugar), demais telas no novo estilo de
lista (entram aos poucos, seguindo a referência).
