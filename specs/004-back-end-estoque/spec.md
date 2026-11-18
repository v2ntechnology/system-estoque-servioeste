# Especificação: Back-end do estoque

**Pasta da spec**: `specs/004-back-end-estoque` · **Criada em**: 2026-11-18 · **Situação**: Em implementação

**Pedido**: "Seguimos com o back-end: criar a API, o banco e as regras, e trocar os dados simulados pela API, área
por área."

## Contexto

As telas (specs 001 a 003) já funcionam com dados simulados que respondem como a API vai responder (`src/lib/tipos.ts`
é o contrato). Esta spec cria a API de verdade, com o mesmo contrato, para que `make front` (sem simulados) funcione
com dados guardados num banco. Os simulados continuam existindo para a demonstração (`make front-mock`).

## Histórias de usuário

### História 1 — Identidade vinda do Hub (P1)

A pessoa chega ao Estoque pelo Hub. A API lê quem ela é nos cabeçalhos `X-Hub-User-Id`, `-Email`, `-Name` e `-Role`
(repassados pelo Caddy) e mantém um **perfil local** com o mesmo id do Hub, os papéis do Estoque e as unidades
liberadas. Quem é administrador no Hub é administrador no Estoque. Em desenvolvimento, sem Hub na frente, a API usa
uma pessoa de desenvolvimento definida no `.env` (nunca em produção).

**Aceitação**: sem cabeçalhos em produção → 401; pessoa nova sem papel → aparece com nenhuma unidade liberada; papel
sem permissão → 403 com a mesma mensagem dos simulados.

### História 2 — Cadastros, contagem e movimentações gravados (P1)

Unidades, categorias, produtos, mínimos, contagens (abrir, registrar itens em lote, finalizar com divergências),
movimentações e o painel passam a vir do banco, com as mesmas regras dos simulados: **não contado ≠ zero**,
divergência quando a queda passa de 10% e de 2 unidades, consumo médio dos últimos 90 dias, contagem finalizada não
muda, uma contagem aberta por unidade.

**Aceitação**: o roteiro de validação da spec 001 (seções A, B e D) funciona com `make front` ligado à API.

### História 3 — Cotações, relatórios e importação (P2)

Cotações (do rascunho ao recebimento, com anexos e entrada no estoque), fornecedores, modelos, sugestões, relatório
mensal, séries dos gráficos e importação com pré-visualização passam para a API.

### História 4 — Dados de exemplo no banco (P2)

`make seed` grava no banco os mesmos tipos de dados de exemplo da demonstração (unidades, produtos, 120 dias de
movimentações, contagens, lotes e pessoas de exemplo), para testar a API sem planilhas reais.

## Requisitos

- **RF-01**: API em `/api/v1`, mesmo contrato de `src/lib/tipos.ts`; erros como `{ "detail": "…" }` em português.
- **RF-02**: Toda rota exige a pessoa e filtra pelas unidades liberadas; ações conferem o papel (`lib/papeis.ts`).
- **RF-03**: CSRF por `Origin` nas rotas que alteram dados; documentação interativa só fora de produção.
- **RF-04**: Ações sensíveis (abrir e finalizar contagem, movimentação, mudança de mínimo e de unidade, aprovação e
  recebimento de cotação) gravam **auditoria na mesma transação**.
- **RF-05**: Contagens, movimentações e aprovações nunca são apagadas pela API.
- **RF-06**: `GET /api/health` responde para o Hub mostrar se o app está no ar.
- **RF-07**: Testes automatizados para saldo, divergência, consumo médio, importação e permissões.

## Fora do escopo

PDF gerado no servidor (WeasyPrint), leitura real de `.xlsx`, envio de e-mail, tarefas agendadas, fotos e anexos em
disco, PWA/IndexedDB — cada um com spec própria.
