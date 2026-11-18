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
- [x] Primeiro envio ao GitHub (`v2ntechnology/system-estoque-servioeste`).

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

## Etapa 1b — Novo visual (spec 002)

- [x] Sidebar do Radar com barra de aplicativos e regra de cores preto, branco e verde.
- [x] Catálogo, Cotações, Contagens, Produto e Painel nas referências aprovadas.
- [x] Entrada verde e saída vermelha; nenhuma barra de rolagem.
- [ ] Levar as demais telas (Movimentações, Fornecedores, Relatórios, Importação, Unidades) ao estilo de lista.
- [ ] Lista de aplicativos vinda do Hub, só com os liberados para a pessoa.
- [x] Gráficos do histórico nos indicadores dos Relatórios (spec 003).
- [ ] Gráficos nos indicadores do Painel (histórico de abaixo do mínimo e divergências por contagem).

## Etapa 2 — Back-end (specs 004 e 005)

- [x] `system-servioeste-estoque-back`: FastAPI + PostgreSQL + Alembic com o contrato de `src/lib/tipos.ts` (spec 004).
- [x] Identidade pelo contrato do Hub (`X-Hub-User-*`), perfil local com papéis e unidades.
- [x] Regras com testes antes: saldo, divergência, consumo médio e confirmação da importação.
- [x] Testes da leitura de planilhas (`tests/test_planilha.py`).
- [ ] Conferir a importação com uma planilha real da Servioeste.
- [x] Auditoria na mesma transação; contagens e aprovações imutáveis.
- [x] Rodar com PostgreSQL no Docker (`make up`, `make seed`).
- [ ] Conferir as telas no navegador e no celular com `make front` (ou `make front-rede`).
- [x] Importação real das planilhas `.xlsx` (openpyxl), achando as colunas pelo nome.
- [ ] PDF da cotação gerado no servidor (WeasyPrint) — próxima spec (006), com teste.
- [x] Fotos e anexos em pasta própria no servidor (spec 005).
- [ ] Tarefas agendadas (APScheduler): aviso de contagem, atrasos, validade, consumo, resumo semanal por e-mail.
- [x] `make front` usa a API; os simulados ficam só para a demonstração (`make front-mock`).

## Etapa 3 — Offline real e produção (Proposta)

- [ ] PWA com service worker e fila da contagem em IndexedDB.
- [ ] Docker Compose + Caddy, entrada no domínio único `/estoque/`.
- [ ] CI com testes e lint a cada alteração; backups automáticos e criptografados.

## Em estudo

- [ ] Etiquetas com QR code nas prateleiras abrindo o produto na contagem.
