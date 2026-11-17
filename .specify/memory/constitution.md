<!--
Relatório de sincronização
- Versão: — → 1.0.0 (primeira versão)
- Núcleo (I a VI) copiado igual da constituição do Hub (1.0.1); princípios VII a XI próprios do Estoque.
- Modelos em .specify/templates/: sem mudança necessária
-->

# Constituição do Estoque e Cotações Servioeste

Sistema de controle de estoque por unidade, contagens, movimentações e cotações de compra da Servioeste, que substitui
as planilhas de Excel. As seções marcadas **[núcleo]** valem para todas as automações da Servioeste e são copiadas
iguais da constituição do Hub. As marcadas **[Estoque]** valem só aqui. Este projeto pode acrescentar princípios
próprios, nunca afrouxar os do núcleo.

## Princípios

### I. Português em tudo que a pessoa lê [núcleo]

Especificações, planos, tarefas, documentação, textos da interface, mensagens de erro da API e comentários são em
português do Brasil, com acentuação correta. Identificadores de código (variáveis, funções, tabelas, colunas, rotas)
ficam em inglês. Datas mostradas à pessoa seguem o fuso de Brasília.

**Por quê**: quem usa e quem mantém os apps lê português; o código segue o padrão das bibliotecas.

### II. A documentação é a fonte oficial [núcleo]

`docs/` descreve como o produto é; `specs/NNN-nome/` descreve cada mudança. Mudança de comportamento atualiza `docs/`
junto com o código (o `plan.md` da spec lista o que muda em `docs/`). O `spec.md` diz **o quê e por quê**, sem
tecnologia; a tecnologia fica no `plan.md`. Decisões em aberto ficam marcadas como em aberto, não supostas.

**Por quê**: vários projetos e uma pessoa só; o que não está escrito se perde entre um app e outro.

### III. Segurança e dados pessoais primeiro [núcleo] (INEGOCIÁVEL)

- Sessão só em cookie httpOnly (Secure em produção); o banco guarda apenas o hash do token. O JavaScript nunca toca
  em token.
- Toda rota que altera dados confere a origem (CSRF por `Origin`) e exige login; rotas de administração exigem o
  perfil de administrador.
- Ações sensíveis (login, mudança de permissão, cadastro, abertura de app, acesso a dados pessoais) gravam auditoria
  **na mesma transação** da mudança.
- Em produção só o Caddy publica portas (80/443). Banco, filas e serviços internos ficam em redes internas, sem
  `ports:`. Documentação interativa da API desligada em produção.
- Telefones, e-mails e dados de funcionários são dados pessoais (LGPD): acesso só com login, controle por usuário e
  auditoria. Senhas com argon2; segredos só no `.env`, nunca no código.

**Por quê**: os apps lidam com dados de clientes e funcionários; uma falha em um app expõe o domínio inteiro.

### IV. Um login, um domínio: o contrato do Hub [núcleo]

Todos os apps ficam em `automacoes.servioeste.com.br/<slug>/` e seguem o contrato da seção 5 de
`docs/plano-dominio-unico.md` (no Hub): a identidade vem do Hub (cabeçalhos `X-Hub-User-*` repassados pelo Caddy),
o app não tem login nem sessão próprios, guarda só um perfil local com o mesmo `id` do Hub e prefixa seus cookies e
chaves de navegador com o próprio slug. Quem pode abrir cada app é decidido só no Hub. Nenhum sistema de terceiros
entra neste domínio.

**Por quê**: mesmo endereço significa mesma sessão; o contrato é o que mantém os apps separados como projetos e
seguros juntos.

### V. Pronto é verificado [núcleo]

- Toda regra do back-end tem teste automatizado (pytest, banco em memória) cobrindo o caminho feliz, a recusa por
  permissão e os casos-limite da spec.
- Uma tarefa só é concluída com `make test` e `make lint` verdes.
- Telas são validadas pelo `quickstart.md` da spec, com os cenários escritos antes da implementação.

**Por quê**: sem revisão de outra pessoa, o teste e o roteiro de validação são a revisão.

### VI. Simples e na stack combinada [núcleo]

Stack fixa: React + Vite + TypeScript + Tailwind + componentes no estilo shadcn/ui no front-end; Python 3.12 + FastAPI
+ SQLAlchemy async + Alembic + PostgreSQL no back-end; Docker Compose + Caddy na infraestrutura. Dependência nova,
serviço novo ou camada nova só com justificativa no `plan.md` (seção de complexidade). Mudança de banco sempre por
migração Alembic nova, numerada em sequência; migração já aplicada não é editada.

**Por quê**: todos os apps parecidos por dentro = qualquer um deles é fácil de retomar.

### VII. Frontend primeiro, com dados simulados [Estoque]

Em cada feature, as telas e os fluxos são construídos primeiro com dados simulados (MSW, ligados só com
`VITE_MOCK=true` no servidor de desenvolvimento) e mostrados à Servioeste. Só depois entram a API, o banco e as regras,
que substituem os simulados sem mudar as telas: os componentes só falam com `src/lib/api.ts` e os hooks de
`features/<nome>/api.ts`, nunca com os dados simulados. Dados simulados e a área do desenvolvedor **nunca** chegam ao
build de produção, e os simulados nunca usam dados reais de funcionários.

**Por quê**: validar o fluxo com quem usa as planilhas hoje antes de investir no back-end evita retrabalho.

### VIII. Não contado não é zero [Estoque] (INEGOCIÁVEL)

Na contagem, quantidade vazia significa "não contado" e zero só existe quando digitado. Nenhuma tela, importação,
cálculo ou exportação pode transformar vazio em zero (ou o contrário). Saldo, divergência e consumo ignoram itens não
contados, e a tela sempre mostra quantos faltam contar.

**Por quê**: é a regra da Declaração de Estoque atual; confundir os dois esconde falta de produto ou inventa consumo.

### IX. O histórico não se apaga [Estoque]

Contagens, movimentações e aprovações de cotação nunca são apagadas. Correção é um novo registro ou uma alteração com
auditoria (quem, quando, valor anterior e novo). Toda tela de histórico mostra autor e data.

**Por quê**: o sistema existe para acabar com a perda de dados das planilhas apagadas ou sobrescritas.

### X. Cada pessoa vê só as suas unidades e funções [Estoque]

Papéis internos (contador, comprador, aprovador, administrador) e unidades liberadas são conferidos em toda rota da API
e refletidos na interface (o que a pessoa não pode fazer não aparece). A interface só esconde; quem decide é a API.

**Por quê**: o minimundo define que cada pessoa vê apenas as unidades e as funções que lhe foram liberadas.

### XI. Visual do Servioeste Hub, pensado para o celular [Estoque]

A interface segue a identidade do Hub: os mesmos tokens de cor (verde Servioeste #6ca33c), fonte Rubik, logo, tema
claro e escuro e os mesmos componentes de layout e de UI do Ponto e do Resíduos. Cores só pelos tokens do tema, nunca
soltas no componente. A contagem é feita andando pelo almoxarifado: toda tela de contagem funciona bem no celular
(alvos de toque grandes, teclado numérico, sem rolagem horizontal).

**Por quê**: todos os apps da Servioeste parecem um só, e quem conta usa o celular.

## Restrições do Estoque

- Portas de desenvolvimento não colidem com as dos outros projetos (Radar 5173/8000/5432, Hub 5174/8001/5433, Ponto
  5175/8002/5434, Resíduos 5176/8003): Estoque usa **Vite 5177, API 8004, Postgres 5435**.
- Planilhas reais da Servioeste (`.xlsx`), fotos de contagem e anexos de cotação (propostas, notas fiscais, boletos)
  nunca são versionados.
- Fora do MVP (só entra com spec própria): transferência entre unidades, WhatsApp, leitura de XML de nota fiscal,
  integração com o financeiro, previsão de compras, portal do fornecedor, código de barras e controle de patrimônio.

## Fluxo de trabalho

- Spec Kit: `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`) →
  `/speckit-implement`. Cada mudança relevante tem sua pasta em `specs/NNN-nome/`, numerada em sequência.
- O `tasks.md` segue a ordem do princípio VII: telas com dados simulados → validação com a Servioeste → back-end com
  testes → integração e remoção dos simulados.
- Correção pequena e óbvia (texto, bug de uma linha) não precisa de spec, mas continua passando por `make test` e
  `make lint`.
- Ao encerrar o dia, a rotina `/encerrar-dia` atualiza changelog, backlog, documentação e PDFs.
- Commits: `<prefixo em inglês>: <descrição em português>`, sem coautor de IA nem "Generated with". Autoria só das
  pessoas do projeto. Commitar só quando o desenvolvedor pedir.

## Governança

Esta constituição vale acima de qualquer outro guia do projeto. Todo `plan.md` confere cada princípio na
"Verificação da constituição"; violação só entra justificada na seção de complexidade. Mudança no **núcleo** é feita
primeiro no Hub e copiada igual para cá. Versão: MAIOR remove ou redefine princípio; MENOR acrescenta princípio ou
seção; CORREÇÃO só ajusta texto.

**Versão**: 1.0.0 | **Ratificada**: 2026-11-17 | **Última alteração**: 2026-11-17
