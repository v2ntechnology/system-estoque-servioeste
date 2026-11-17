# Documentação Técnica — Estoque e Cotações Servioeste

## Visão geral

Aplicação web para controle de estoque por unidade, contagens físicas, movimentações e cotações de compra da Servioeste. Substitui as planilhas de Excel atuais. É um aplicativo independente, acessado pelo hub de automações da Servioeste, que cuida do login e das permissões por aplicativo.

## Stack

- **Backend:** Python com FastAPI.
- **Banco de dados:** PostgreSQL.
- **Frontend:** React com Vite, responsivo para uso no celular, com suporte offline na contagem.
- **Importação e exportação de Excel:** pandas e openpyxl.
- **Geração de PDF:** a definir, com WeasyPrint como candidato, por já ser usado no ponto digital.

## Integração com o hub

- O hub autentica o usuário e informa ao aplicativo quem ele é.
- O aplicativo controla os papéis internos e as unidades que cada usuário pode acessar.
- Papéis iniciais: contador (registra contagens), comprador (monta cotações), aprovador (aprova cotações) e administrador.

## Módulos

### Catálogo

- Produto com código, nome, unidade de medida, categoria e conversão de embalagem (por exemplo, 1 pacote = 8 unidades).
- Estoque mínimo por produto e por unidade.
- Controle opcional de lote e validade, com alerta de vencimento.
- Busca por nome, código e categoria.

### Unidades

- Cadastro das unidades (Queimados, Resende, Barra do Piraí e outras).
- Horário de encerramento do expediente por unidade, usado no aviso de contagem pendente.
- Calendário de contagem por unidade, com indicação de atraso.

### Contagem

- Cada contagem tem unidade, responsável, data e uma linha por produto.
- Quantidade nula significa "não contado"; zero precisa ser digitado explicitamente.
- Observação e foto por linha.
- Aviso 5 minutos antes do fim do expediente quando houver itens não contados.
- Funcionamento offline: a contagem fica salva no aparelho e sincroniza quando a conexão volta.
- Alerta de divergência quando a queda entre contagens não é explicada pelas saídas registradas.

### Movimentações

- Registro de entradas e saídas por unidade.
- Cálculo do saldo esperado e do consumo médio mensal, com sugestão de reposição.
- Transferência entre unidades está fora do escopo.

### Cotações

- Montagem a partir do catálogo, com sugestão de quantidades pelo mínimo e pelo consumo.
- Modelos de cotação para listas recorrentes.
- Geração do PDF da cotação para envio externo.
- Status: rascunho, enviada, aprovada e recebida.
- Aprovação registrada com usuário e data.
- Anexos: proposta, nota fiscal e boleto.
- Cadastro de fornecedores e histórico de preços aprovados por produto e fornecedor.
- Ao marcar como recebida, gera a entrada correspondente no estoque.

### Relatórios e painel

- Painel inicial com itens abaixo do mínimo, contagens pendentes ou atrasadas e cotações em aberto.
- Relatório mensal por unidade, com comparação ao mês anterior.
- Exportação de relatórios para Excel.
- Resumo semanal por e-mail.

### Importação

- Importação das planilhas "Declaração de Estoque" (código, produto, contagem, unidade de medida, observação, mais unidade, responsável e data no cabeçalho).
- Importação das planilhas de cotação (material, quantidade, valor), com associação manual ao catálogo quando o nome não tiver código.
- Pré-visualização e relatório de erros antes de gravar.

## Entidades principais

- **Unidade:** nome, horário de encerramento, frequência de contagem.
- **Categoria** e **Produto:** código, nome, unidade de medida, conversão de embalagem, controla validade.
- **EstoqueMinimo:** produto, unidade, quantidade.
- **Lote:** produto, unidade, número, validade.
- **Contagem** e **ItemContagem:** quantidade (nula = não contado), observação, foto.
- **Movimentacao:** tipo (entrada ou saída), produto, unidade, quantidade, origem.
- **Fornecedor:** nome, contato, categorias fornecidas.
- **Cotacao** e **ItemCotacao:** status, aprovador, data de aprovação, preço aprovado.
- **ModeloCotacao**, **Anexo** e **Auditoria**.

## Estrutura do projeto

Repositório único, com backend e frontend separados em pastas (`system-servioeste-estoque-back/` e
`system-servioeste-estoque-front/`, no padrão do Ponto e do Resíduos; o front já existe, ver `docs/documentacao/`). O backend é organizado por módulo, na mesma divisão das seções acima.

```
system-servioeste-estoque/
├── system-servioeste-estoque-back/
│   ├── app/
│   │   ├── core/          # configuração, banco, autenticação via hub
│   │   ├── modules/
│   │   │   ├── catalogo/      # produtos, categorias, mínimos, lotes
│   │   │   ├── unidades/
│   │   │   ├── contagens/
│   │   │   ├── movimentacoes/
│   │   │   ├── cotacoes/      # cotações, fornecedores, anexos, PDF
│   │   │   ├── relatorios/
│   │   │   └── importacao/    # leitura das planilhas Excel
│   │   ├── jobs/          # tarefas agendadas
│   │   └── auditoria/
│   ├── migrations/        # Alembic
│   └── tests/
├── system-servioeste-estoque-front/
│   └── src/
│       ├── pages/         # painel, contagem, cotações, relatórios
│       ├── components/
│       ├── offline/       # fila local da contagem (IndexedDB)
│       └── api/
└── docker-compose.yml
```

Cada módulo do backend tem suas próprias rotas, regras e modelos, o que facilita testar e evoluir um sem mexer nos outros.

## API

API REST em `/api/v1`, documentada automaticamente pelo FastAPI. Todas as rotas exigem o token do hub e filtram os dados pelas unidades liberadas ao usuário.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET, POST, PATCH | `/produtos` | Catálogo, com busca por nome, código e categoria |
| GET, PUT | `/produtos/{id}/minimos` | Estoque mínimo por unidade |
| GET, POST | `/unidades` | Unidades, horário de encerramento e frequência de contagem |
| POST | `/contagens` | Abre uma contagem para unidade e data |
| PATCH | `/contagens/{id}/itens` | Registra quantidades, observações e fotos; aceita lote vindo do modo offline |
| POST | `/contagens/{id}/finalizar` | Fecha a contagem e calcula divergências |
| GET, POST | `/movimentacoes` | Entradas e saídas por unidade |
| GET, POST, PATCH | `/cotacoes` | Cotações e seus itens |
| POST | `/cotacoes/{id}/aprovar` | Registra aprovador e data |
| POST | `/cotacoes/{id}/receber` | Marca como recebida e gera a entrada no estoque |
| GET | `/cotacoes/{id}/pdf` | Gera o PDF para envio |
| POST | `/cotacoes/{id}/anexos` | Envia proposta, nota fiscal ou boleto |
| GET, POST | `/fornecedores` | Cadastro de fornecedores |
| GET | `/relatorios/mensal` | Relatório mensal por unidade, em JSON ou Excel |
| GET | `/painel` | Pendências e alertas da tela inicial |
| POST | `/importacao/planilha` | Envia a planilha e devolve a pré-visualização |
| POST | `/importacao/{id}/confirmar` | Grava os dados importados |

## Tarefas agendadas

As tarefas automáticas rodam no próprio backend com APScheduler, sem serviço extra no MVP.

| Tarefa | Frequência | O que faz |
| --- | --- | --- |
| Aviso de contagem pendente | A cada minuto | Avisa o responsável 5 minutos antes do encerramento da unidade quando há itens não contados |
| Contagens atrasadas | Diária | Marca no painel as unidades fora do calendário de contagem |
| Alerta de validade | Diária | Destaca lotes próximos do vencimento |
| Consumo médio | Diária, de madrugada | Recalcula o consumo mensal e as sugestões de reposição |
| Resumo semanal | Semanal | Envia por e-mail os itens abaixo do mínimo e as cotações paradas |

O aviso de fim de expediente aparece na tela do sistema. Se o navegador estiver fechado, ele fica no painel na próxima abertura.

## Infraestrutura e qualidade

O desenvolvimento roda localmente em Docker; homologação e produção ficam separadas quando houver servidor.

- **Contêineres:** backend, frontend e PostgreSQL no Docker Compose, com Caddy para HTTPS.
- **Arquivos:** fotos e anexos em pasta própria no servidor, com caminho guardado no banco.
- **Migrações:** Alembic, aplicadas a cada deploy.
- **Offline:** o frontend vira PWA, e a contagem fica numa fila no IndexedDB até sincronizar.
- **Testes:** obrigatórios para importação, cálculo de saldo, divergência, consumo médio e geração de PDF.
- **CI:** testes e lint a cada alteração no repositório.
- **Servidor:** a definir; não compartilha produção com o ponto digital.

## Roteiro da demonstração

A apresentação mostra o fluxo completo com dados reais de Queimados, em cerca de 10 minutos.

1. Importar a planilha "Declaração de Estoque" de Queimados e mostrar a pré-visualização.
2. Abrir o catálogo já organizado por categoria, com estoques mínimos.
3. Fazer uma contagem pelo celular, deixar itens sem contar e mostrar o aviso de fim de expediente.
4. Mostrar no painel os itens abaixo do mínimo e a divergência detectada.
5. Criar uma cotação a partir das sugestões, gerar o PDF e anexar uma proposta.
6. Aprovar, marcar como recebida e ver a entrada no estoque.
7. Abrir o relatório mensal e exportar para Excel.

## Segurança e dados

- Histórico completo: contagens não são apagadas, e alterações geram registro de auditoria com autor e data.
- Backups automáticos e criptografados.
- Acesso restrito às unidades e aos papéis liberados para cada usuário.

## Em estudo

- Etiquetas com QR code nas prateleiras, dependendo da organização física dos almoxarifados.

## Fora do MVP

- Integração com WhatsApp, leitura de nota fiscal por XML, integração com financeiro e outros apps do hub, previsão de compras, portal do fornecedor, leitor de código de barras, controle de patrimônio e indicadores de custo.

## Pontos a confirmar com a Servioeste

- Se campo vazio na planilha atual significa mesmo "não contado".
- Quem aprova as cotações hoje.
- Frequência real das contagens em cada unidade.
- Conteúdo das planilhas de saída.
