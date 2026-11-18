# Servioeste Estoque

Controle de estoque por unidade, contagens, movimentações e cotações de compra da Servioeste, substituindo as
planilhas de Excel. Faz parte do Hub de aplicativos da Servioeste.

**Fase atual:** telas prontas (specs 001 a 003) e back-end em construção (spec 004). A demonstração segue com dados
simulados (`make front-mock`); `make front` usa a API.

- Minimundo e documentação técnica: [`docs/`](docs/)
- Manual do sistema e documentação técnica em PDF: [`docs/pdf/`](docs/pdf/)
- Backlog e histórico: [`docs/backlog.md`](docs/backlog.md), [`docs/changelog.md`](docs/changelog.md)
- Especificações (Spec Kit): [`specs/`](specs/) · constituição: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Estrutura

```text
system-servioeste-estoque-front/   Front-end (React + Vite + TypeScript, visual do Servioeste Hub)
system-servioeste-estoque-back/    Back-end (FastAPI + SQLAlchemy + Alembic + PostgreSQL)
infra/                             Docker Compose de desenvolvimento (Postgres :5435, API :8004)
docs/                              Minimundo, documentação técnica, manual, backlog, changelog e PDFs
specs/                             Especificações do Spec Kit
scripts/                           Geração dos PDFs e checagem de simulados no build
```

## Desenvolvimento

Pré-requisitos: Node 24+, pnpm 9, `uv` (Python 3.12) e Docker Desktop para o PostgreSQL.

```bash
make install       # dependências do front-end e do back-end
make front-mock    # demonstração com dados simulados em http://localhost:5177
make up && make seed   # Postgres + API no Docker, com dados de exemplo
make api-local     # ou, sem Docker: API com SQLite (make seed-local para os dados de exemplo)
make front         # telas ligadas à API
make test          # pytest + Vitest + build + checagem de simulados
make lint          # ruff + eslint
make docs          # PDFs da documentação
```

Com o app aberto, o menu (☰) tem a **Área de desenvolvimento** (`/dev`: implementação, backlog, histórico, changelog
e documentos) e, nos dados simulados, a seção **Demonstração** (ver como cada papel, simular sem conexão e fim de
expediente, restaurar dados).

Portas: Vite **5177**, API **8004**, Postgres **5435**.

## Commits

`<prefixo em inglês>: <descrição em português>` (ex.: `feat: cria a tela de contagem`), sem coautor de IA.
