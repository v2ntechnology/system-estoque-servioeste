# 11. Desenvolvimento

## Pré-requisitos

Node 24+ e pnpm 9 (WSL/Linux); `uv` (Python 3.12 do back-end e PDFs); Docker Desktop ligado para o PostgreSQL
(`make up`). Sem Docker, `make api-local` usa SQLite em arquivo.

## Comandos (na raiz; `make help` lista todos)

```bash
make install        # dependências do front-end e do back-end (venv com uv)
make api-local      # API sem Docker (SQLite); make seed-local grava os dados de exemplo
make up             # Postgres + API no Docker; make seed grava os dados de exemplo
make front-mock     # front com dados simulados em http://localhost:5177
make front          # front ligado à API (8004), quando ela existir
make test           # pytest + Vitest + build (tsc) + checagem de simulados no build
make lint           # ruff + ESLint
make docs           # PDFs do manual e da documentação técnica (docs/pdf/)
```

Teste isolado: `cd system-servioeste-estoque-front && pnpm vitest run tests/regras.test.ts` (ou `-t "nome"`).

## Portas

Vite **5177**, API **8004**, Postgres **5435** (não colidem com Radar, Hub, Ponto e Resíduos). O front de
desenvolvimento manda `/api` para a 8004.

## Testar no celular

1. `make front-rede` (ou `make front-mock-rede`): o Vite passa a aceitar acesso pela rede.
2. No WSL em modo NAT (o padrão), o Windows precisa repassar a porta. Num **PowerShell como administrador**:
   ```powershell
   $ip = (wsl hostname -I).Split(" ")[0]
   netsh interface portproxy add v4tov4 listenport=5177 listenaddress=0.0.0.0 connectport=5177 connectaddress=$ip
   New-NetFirewallRule -DisplayName "Estoque dev 5177" -Direction Inbound -LocalPort 5177 -Protocol TCP -Action Allow
   ```
   O IP do WSL muda quando o computador reinicia: rode de novo a linha do `portproxy` (antes,
   `netsh interface portproxy delete v4tov4 listenport=5177 listenaddress=0.0.0.0`).
3. No celular, no mesmo Wi-Fi: `http://<IPv4 do Wi-Fi do Windows>:5177` (`ipconfig`).
4. Ao terminar: `netsh interface portproxy delete v4tov4 listenport=5177 listenaddress=0.0.0.0` e
   `Remove-NetFirewallRule -DisplayName "Estoque dev 5177"`. Em desenvolvimento a API entra como a pessoa de dev
   (administradora): não deixe aberto na rede depois do teste.

Atalho sem celular: no Chrome, F12 → ícone de celular (Ctrl+Shift+M) → largura 360.

## Testes

- `tests/regras.test.ts`: não contado ≠ zero, divergência, sugestão, consumo e fila offline.
- `tests/telas.test.tsx`: monta o app inteiro (`tests/renderizar.tsx`) com os mesmos handlers do MSW (`msw/node`) e
  confere painel, papéis, contagem e cotação.
- `tests/dev.test.ts`: leitores da área do dev.
- O Node 24+ tem um `localStorage` global que encobre o do jsdom; `tests/setup.ts` coloca um armazenamento em memória.
- O react-router passa o AbortSignal do jsdom ao `Request` do Node, que o recusa; `tests/setup.ts` descarta o
  `signal`. Sem isso, qualquer teste que muda a URL (ex.: abrir o resumo ao lado) falha.
- `tests/rotas.test.tsx` abre todas as rotas: rota nova entra lá.
- Envio de arquivos: o jsdom tem `FormData`, `File` e `Blob` próprios que o `fetch` do Node não envia;
  `tests/setup.ts` usa os do Node (`node:buffer` e um `Response` urlencoded) e um `URL.createObjectURL` falso.

## Fluxo de trabalho

Spec Kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`), uma pasta por mudança em
`specs/NNN-nome/`. Ao encerrar o dia, `/encerrar-dia`. Commits `<prefixo em inglês>: <descrição em português>`, sem
coautor de IA.
