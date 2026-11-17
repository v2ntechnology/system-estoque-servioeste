# Backlog e plano de desenvolvimento

Legenda: [x] feito · [ ] a fazer. Itens marcados **Proposta** ainda não foram debatidos e podem mudar.

## Etapa 0 — Organização do projeto

- [x] Minimundo e documentação técnica do sistema.
- [x] Spec Kit e constituição (núcleo comum às automações Servioeste + princípios do Estoque).
- [x] Regra de commit: prefixo em inglês, descrição em português, sem coautor de IA.
- [x] Front-end na stack e no visual do Hub e do Ponto (`system-servioeste-estoque-front`).
- [x] Testes (Vitest), lint (ESLint), `Makefile` e checagem de simulados no build.
- [x] Documentação em `docs/` com PDF do manual e da documentação técnica, rotina `/encerrar-dia`.
- [x] Área do desenvolvedor (`/dev`): visão geral, implementação, backlog, histórico, changelog e documentos.
- [ ] Primeiro envio ao GitHub (`v2ntechnology/system-estoque-servioeste`).

## Etapa 1 — Telas de demonstração com dados simulados (spec 001)

- [x] Painel com abaixo do mínimo, contagens atrasadas, cotações em aberto, divergências e validade.
- [x] Contagem pelo celular: não contado ≠ zero, observação, foto, progresso, aviso de fim de expediente.
- [x] Contagem sem internet (fila no aparelho e envio em lote).
- [x] Divergência ao finalizar a contagem.
- [x] Catálogo com mínimos por unidade, lotes e últimos preços.
- [x] Movimentações (entradas e saídas).
- [x] Cotações do rascunho ao recebimento, com sugestões, modelos, anexos, aprovação e PDF para impressão.
- [x] Fornecedores.
- [x] Relatório mensal com comparação e exportação (CSV nesta fase).
- [x] Importação com pré-visualização, associação ao catálogo e confirmação.
- [x] Unidades: encerramento e frequência de contagem.
- [x] Menu de demonstração: ver como cada papel, simular sem conexão e fim de expediente.
- [ ] Apresentar à Servioeste seguindo o roteiro da demonstração e anotar os ajustes.
- [ ] Responder os pontos em aberto (campo vazio, quem aprova, frequência das contagens, planilhas de saída).

## Etapa 2 — Back-end (Proposta)

- [ ] `system-servioeste-estoque-back`: FastAPI + PostgreSQL + Alembic, contrato `openapi.yaml` e tipos gerados no front.
- [ ] Identidade pelo contrato do Hub (`X-Hub-User-*`), perfil local com papéis e unidades.
- [ ] Regras com testes antes: importação, saldo, divergência, consumo médio e PDF.
- [ ] Auditoria na mesma transação; contagens e aprovações imutáveis.
- [ ] Importação real das planilhas (pandas/openpyxl) e PDF real (WeasyPrint).
- [ ] Fotos e anexos em pasta própria no servidor.
- [ ] Tarefas agendadas (APScheduler): aviso de contagem, atrasos, validade, consumo, resumo semanal por e-mail.
- [ ] Trocar os dados simulados pela API e remover o MSW do fluxo normal.

## Etapa 3 — Offline real e produção (Proposta)

- [ ] PWA com service worker e fila da contagem em IndexedDB.
- [ ] Docker Compose + Caddy, entrada no domínio único `/estoque/`.
- [ ] CI com testes e lint a cada alteração; backups automáticos e criptografados.

## Em estudo

- [ ] Etiquetas com QR code nas prateleiras abrindo o produto na contagem.
