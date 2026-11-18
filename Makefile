# Atalhos do Servioeste Estoque. Rode `make help` para ver todos.
# Pastas independentes: system-servioeste-estoque-front (Node) e system-servioeste-estoque-back (Python).
# Portas de dev: Vite 5177, API 8004, Postgres 5435 (não batem com Radar, Hub, Ponto e Resíduos).

FRONT := system-servioeste-estoque-front
BACK := system-servioeste-estoque-back
PY := $(BACK)/.venv/bin
COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env
DB_LOCAL := sqlite+aiosqlite:///./estoque-dev.db

.DEFAULT_GOAL := help
.PHONY: help install install-back front front-mock build-front check-no-mocks up down logs seed api-local seed-local \
        test test-front test-back lint lint-front lint-back docs

help: ## lista os comandos
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-16s %s\n", $$1, $$2}'

.env:
	cp .env.example .env

# ------------------------------------------------------------------ front-end
install: install-back ## instala as dependências do front-end e do back-end
	cd $(FRONT) && pnpm install

front-mock: ## front-end com dados simulados (MSW) em http://localhost:5177
	cd $(FRONT) && pnpm dev:mock

front: ## front-end ligado à API (8004) em http://localhost:5177
	cd $(FRONT) && pnpm dev

build-front: ## build de produção do front-end ($(FRONT)/dist)
	cd $(FRONT) && pnpm build

check-no-mocks: ## falha se o build de produção tiver dados simulados ou a área de desenvolvimento
	./scripts/check-no-mocks.sh

# ------------------------------------------------------------------ back-end
install-back: ## cria o venv do back-end (uv, Python 3.12) com as dependências de desenvolvimento
	cd $(BACK) && uv venv -q --python 3.12 .venv && uv pip install -q --python .venv/bin/python -e ".[dev]"

up: .env ## sobe Postgres (:5435) e API (:8004) no Docker, aplicando as migrações
	$(COMPOSE) up -d --build

down: .env ## desliga o Docker (os dados ficam no volume; `make down ARGS=-v` apaga)
	$(COMPOSE) down $(ARGS)

logs: .env ## acompanha os logs da API no Docker
	$(COMPOSE) logs -f api

seed: .env ## grava os dados de exemplo no Postgres do Docker (banco vazio)
	$(COMPOSE) exec api python -m app.cli seed

api-local: ## API em http://127.0.0.1:8004 com SQLite em arquivo (sem Docker; só para conferir telas)
	cd $(BACK) && DATABASE_URL=$(DB_LOCAL) .venv/bin/alembic upgrade head && \
	DATABASE_URL=$(DB_LOCAL) .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8004 --reload

seed-local: ## grava os dados de exemplo no SQLite do api-local
	cd $(BACK) && DATABASE_URL=$(DB_LOCAL) .venv/bin/alembic upgrade head && \
	DATABASE_URL=$(DB_LOCAL) .venv/bin/python -m app.cli seed

# ------------------------------------------------------------------ qualidade
test-back: ## pytest do back-end (SQLite em memória)
	cd $(BACK) && .venv/bin/pytest -q

test-front: ## testes do front-end (Vitest)
	cd $(FRONT) && pnpm test

test: test-back test-front build-front check-no-mocks ## tudo: back-end, front-end, build e checagem de simulados

lint-back: ## ruff no back-end
	cd $(BACK) && .venv/bin/ruff check --no-cache .

lint-front: ## eslint no front-end
	cd $(FRONT) && pnpm lint

lint: lint-back lint-front ## ruff + eslint

docs: ## gera os PDFs da documentação (manual do cliente e documentação técnica)
	uv run scripts/gerar_pdf.py
