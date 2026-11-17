# Plano: Telas de demonstração do estoque e das cotações

**Spec**: `specs/001-demonstracao-telas/spec.md` · **Data**: 2026-11-17

## Resumo

Front-end completo do Estoque em `system-servioeste-estoque-front/`, com a mesma base do Ponto e do Resíduos (layout,
tokens de cor, Rubik, logo, componentes de UI, área do desenvolvedor) e todos os dados vindos de handlers do MSW que
imitam a API `/api/v1` descrita na documentação técnica. Nenhum back-end nesta spec.

## Contexto técnico

- **Linguagem/versão**: TypeScript 5.8, React 19, Vite 6, Node 24, pnpm 9.
- **Dependências**: Tailwind 4, componentes estilo shadcn/ui (copiados do Resíduos/Ponto), TanStack Query 5,
  react-router 7, lucide-react, `@fontsource/rubik`; MSW 2 só em desenvolvimento (como no Ponto).
- **Testes**: Vitest + Testing Library + jsdom; os testes usam os mesmos handlers do MSW (`msw/node`).
- **Plataforma**: navegador do computador e do celular (contagem).
- **Portas**: Vite 5177 (proxy `/api` → 8004, para quando a API existir).

## Verificação da constituição

| Princípio | Como esta spec cumpre |
| --- | --- |
| I Português | Textos, comentários e docs em português; identificadores de rota e campos em português sem acento, como no Ponto. |
| II Documentação | `docs/` ganha manual (usuário) e técnico; backlog e changelog atualizados. |
| III Segurança | Sem dados reais nos simulados; sem login próprio. Rotas reais e CSRF chegam com o back-end. |
| IV Contrato do Hub | Sem tela de login: a pessoa vem de `GET /api/v1/eu` (no futuro, montado dos cabeçalhos `X-Hub-User-*`). Chaves do navegador prefixadas com `estoque-`. "Sair" volta ao Hub. |
| V Pronto é verificado | Testes das regras de tela (não contado ≠ zero, divergência, sugestão, permissões) e `quickstart.md`. |
| VI Stack | Mesma stack do Hub/Ponto; nenhuma dependência nova além das que o Ponto já usa. |
| VII Frontend primeiro | Toda a spec. MSW só com `VITE_MOCK=true` no servidor de dev; `check-no-mocks` no build. |
| VIII Não contado ≠ zero | Quantidade `null` em todo o fluxo; campo vazio nunca vira `0`; finalizar com itens vazios pede confirmação. |
| IX Histórico | Contagens finalizadas só leitura; cotação mostra linha do tempo com autor e data. |
| X Papéis e unidades | `pode(eu, papel)` esconde ações; os handlers recusam com 403 o que o papel não permite. |
| XI Visual | Tokens do `index.css` do Hub; contagem desenhada primeiro para 360 px. |

## Estrutura

```text
system-servioeste-estoque-front/
├── dev-tools/plugin.ts        # /__dev/commits (git log) para a área do dev
├── src/
│   ├── lib/                   # api.ts (cliente), tipos.ts (contrato), papeis.ts, format.ts, unidade.tsx
│   ├── components/            # ui/ (shadcn), layout/ (AppShell, TopBar, UserMenu...), form/
│   ├── features/<área>/       # api.ts (hooks do TanStack Query) + componentes da área
│   ├── pages/                 # uma página por rota
│   ├── mocks/                 # dados.ts (exemplos), db.ts (estado), regras.ts, handlers/, DemoMenu.tsx
│   └── dev/                   # área do desenvolvedor (/dev)
└── tests/
```

## Decisões

Ver `research.md`. Principais: MSW em vez de dados no componente (as telas não mudam quando a API chegar); estado dos
simulados no `localStorage` para a demonstração sobreviver a recarregar; fila da contagem offline em `localStorage`
nesta fase (IndexedDB e PWA entram na spec do offline real); PDF da cotação como página de impressão do navegador.

## O que muda em `docs/`

- `docs/documentacao/usuario/`: visão geral, contagem, cotações, painel e relatórios.
- `docs/documentacao/tecnico/`: arquitetura do front, dados simulados, comandos, área do dev.
- `docs/backlog.md` e `docs/changelog.md`.

## Complexidade

Nenhuma violação da constituição.
