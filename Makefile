# Atalhos do Servioeste Estoque. Rode `make help` para ver todos.
# Pastas independentes: system-servioeste-estoque-front (Node) e, quando existir, system-servioeste-estoque-back.
# Portas de dev: Vite 5177, API 8004, Postgres 5435 (não batem com Radar, Hub, Ponto e Resíduos).

FRONT := system-servioeste-estoque-front

.DEFAULT_GOAL := help
.PHONY: help install front front-mock build-front check-no-mocks test lint docs

help: ## lista os comandos
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-16s %s\n", $$1, $$2}'

install: ## instala as dependências do front-end
	cd $(FRONT) && pnpm install

front-mock: ## front-end com dados simulados (MSW) em http://localhost:5177
	cd $(FRONT) && pnpm dev:mock

front: ## front-end ligado à API (8004) em http://localhost:5177
	cd $(FRONT) && pnpm dev

build-front: ## build de produção do front-end ($(FRONT)/dist)
	cd $(FRONT) && pnpm build

check-no-mocks: ## falha se o build de produção tiver dados simulados ou a área de desenvolvimento
	./scripts/check-no-mocks.sh

test: ## testes do front-end (Vitest) + build (tsc) + checagem de simulados no build
	cd $(FRONT) && pnpm test
	$(MAKE) build-front check-no-mocks

lint: ## eslint no front-end
	cd $(FRONT) && pnpm lint

docs: ## gera os PDFs da documentação (manual do cliente e documentação técnica)
	uv run scripts/gerar_pdf.py
