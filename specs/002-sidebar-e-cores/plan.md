# Plano: Barra de apps, sidebar e cores

**Spec**: `specs/002-sidebar-e-cores/spec.md` · **Data**: 2026-11-18

## Resumo

Troca a barra do topo (padrão Hub/Ponto) pela moldura do Radar (`IconRail` + painel): `AppShell` passa a ter a
**barra de apps** (`AppRail`) e a **sidebar** (`Sidebar`) num cartão à esquerda, e a tela no painel à direita. Tokens
de cor alinhados ao Radar: `--primary` preto (branco no escuro); verde (`--brand`) só em selecionado/foco/hover.
Variantes `warning`/`destructive` de selo e faixa ficam neutras com ponto ou ícone colorido. Catálogo reescrito no
layout da referência, com o componente `Medidor` (semicírculo segmentado).

## Verificação da constituição

| Princípio | Como cumpre |
| --- | --- |
| IV Contrato do Hub | Barra de apps só leva aos endereços do domínio único; quem pode abrir cada app continua sendo decidido no Hub. |
| VI Stack | Nenhuma dependência nova. |
| X Papéis | Sidebar filtra itens por papel, como a barra fazia. |
| XI Visual | **Alterado (constituição 2.0.0)**: moldura do Radar e regra preto/branco/verde. |

## Estrutura

`components/layout/`: `AppShell` (moldura e gaveta no celular), `AppRail` (barra de apps), `Sidebar` (grupos,
contadores, unidade, pessoa), `apps.ts` (lista de apps), `navegacao.ts` (grupos), `UserMenu` (abre para cima, no pé
da sidebar). `components/ui/medidor.tsx`. `TopBar.tsx` removido.

## O que muda em `docs/`

Manual (visão geral: como navegar), técnico (arquitetura: moldura e cores), backlog e changelog.
