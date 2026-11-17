# Histórico de alterações

Registro diário do que foi adicionado, alterado e removido no projeto. A entrada mais recente fica no topo.

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
