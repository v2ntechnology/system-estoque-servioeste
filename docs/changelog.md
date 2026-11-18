# Histórico de alterações

Registro diário do que foi adicionado, alterado e removido no projeto. A entrada mais recente fica no topo.

## 2026-11-18

### Adicionado

- Spec 002 (`specs/002-sidebar-e-cores/`) e referências visuais aprovadas em `docs/img/design/referencias/`.
- **Barra de aplicativos** à esquerda para ir do Estoque ao Radar, ao Ponto, ao Resíduos e ao Hub.
- **Catálogo** no estilo da referência: estatísticas do estoque, medidor de situação (Boa, Atenção, Crítica) e
  paginação.
- **Cotações** e **Contagens** com o resumo da escolhida aberto ao lado da lista, com link próprio.
- Indicadores de contagem: unidades em dia, em andamento, divergências e acurácia do estoque.
- Botões − e + na contagem, com atalho de embalagem.
- **Gráficos** nos indicadores dos Relatórios (spec 003): Entradas, Saídas e Gasto abrem o histórico por dia ou por
  mês, em área, colunas ou tabela, com a divisão por categoria.

### Alterado

- A barra do topo deu lugar à **sidebar do Radar**, com as telas agrupadas e contadores do que precisa de atenção.
- Cores: só preto, branco e cinza, com verde para o que está selecionado; nada de amarelo fora dos indicadores de
  situação. Entrada de estoque em verde e saída em vermelho em todas as telas. Constituição 2.1.1.
- Nenhuma barra de rolagem aparece mais no sistema.
- Painel com indicadores no novo estilo (tendência em relação à contagem anterior) e a lista de itens abaixo do
  mínimo com cobertura e falta.
- Histórico de contagens mais leve, agrupado por mês; detalhe do produto com resumo, cobertura em dias e mínimo
  editável pelo lápis; contagem em lista compacta agrupada por categoria.
- Painel: contagens com um só indicador por unidade e o progresso da contagem aberta; divergências com esperado →
  contado e quanto sumiu; cotações com as quatro etapas em tracinhos; lotes sem vencimento próximo viram uma linha.

## 2026-11-17

### Adicionado

- Spec Kit com a constituição 1.0.0: as seções de núcleo comuns às automações da Servioeste e cinco princípios do
  Estoque (telas primeiro com dados simulados, não contado não é zero, o histórico não se apaga, cada pessoa vê só as
  suas unidades e funções, visual do Hub pensado para o celular).
- Spec 001 (`specs/001-demonstracao-telas/`): telas de demonstração com dados de exemplo.
- **Painel** com itens abaixo do mínimo, contagens atrasadas, cotações em aberto, divergências e validade.
- **Contagem pelo celular**: busca, categorias, "Faltam N", observação e foto por item, campo vazio como "não
  contado", aviso 5 minutos antes do fim do expediente, funcionamento sem internet e divergências ao finalizar.
- **Cotações** do rascunho ao recebimento: sugestões pelo mínimo e consumo, modelos, último preço aprovado, anexos,
  aprovação com nome e data, PDF para impressão e entrada automática no estoque ao receber.
- **Catálogo**, **Movimentações**, **Fornecedores**, **Relatórios** (com exportação), **Importação** das planilhas
  com pré-visualização e **Unidades**.
- Menu de demonstração para ver o sistema como cada papel e simular falta de conexão e fim de expediente.
- Área do desenvolvedor (`/dev`) com implementação, backlog, histórico, changelog e documentos.
- Manual do sistema e documentação técnica, também em PDF, e a rotina `/encerrar-dia`.
- Código publicado no repositório do GitHub da equipe (`v2ntechnology/system-estoque-servioeste`).
