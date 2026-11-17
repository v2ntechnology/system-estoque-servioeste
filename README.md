# Servioeste Estoque

Controle de estoque por unidade, contagens, movimentações e cotações de compra da Servioeste, substituindo as
planilhas de Excel. Faz parte do Hub de aplicativos da Servioeste.

**Fase atual:** telas de demonstração com dados simulados (spec 001). O back-end vem depois.

- Minimundo e documentação técnica: [`docs/`](docs/)
- Manual do sistema e documentação técnica em PDF: [`docs/pdf/`](docs/pdf/)
- Backlog e histórico: [`docs/backlog.md`](docs/backlog.md), [`docs/changelog.md`](docs/changelog.md)
- Especificações (Spec Kit): [`specs/`](specs/) · constituição: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Estrutura

```text
system-servioeste-estoque-front/   Front-end (React + Vite + TypeScript, visual do Servioeste Hub)
system-servioeste-estoque-back/    Back-end (FastAPI + PostgreSQL) — a criar
docs/                              Minimundo, documentação técnica, manual, backlog, changelog e PDFs
specs/                             Especificações do Spec Kit
scripts/                           Geração dos PDFs e checagem de simulados no build
```

## Desenvolvimento

Pré-requisitos: Node 24+ e pnpm 9 (e `uv` para os PDFs).

```bash
make install       # dependências do front-end
make front-mock    # demonstração com dados simulados em http://localhost:5177
make test          # testes + build + checagem de simulados
make lint          # eslint
make docs          # PDFs da documentação
```

Com o app aberto, o menu (☰) tem a **Área de desenvolvimento** (`/dev`: implementação, backlog, histórico, changelog
e documentos) e, nos dados simulados, a seção **Demonstração** (ver como cada papel, simular sem conexão e fim de
expediente, restaurar dados).

Portas: Vite **5177**, API **8004**, Postgres **5435**.

## Commits

`<prefixo em inglês>: <descrição em português>` (ex.: `feat: cria a tela de contagem`), sem coautor de IA.
