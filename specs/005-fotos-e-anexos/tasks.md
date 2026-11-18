# Tarefas: Fotos e anexos no servidor

## Fase 1 — Back-end

- [X] T001 Tabela `arquivos`, migração `0002_arquivos`, `ARQUIVOS_DIR` e `.gitignore`
- [X] T002 `services/arquivos.py`: tipo pelo conteúdo, limite de 10 MB, nome sorteado
- [X] T003 `POST /arquivos` e `GET /arquivos/{id}` com unidade conferida
- [X] T004 Contagem (`foto` = id, `foto_url`) e anexos de cotação com arquivo e `url`
- [X] T005 Testes: tipos aceitos e recusados, tamanho, acesso por unidade, foto no item, anexo baixável

## Fase 2 — Front-end

- [X] T006 Contrato (`foto_url`, `Anexo.url`, `Arquivo`), simulados e `enviarArquivo`
- [X] T007 Contagem: enviar a foto, miniatura, abrir a foto; aviso sem conexão
- [X] T008 Contagem finalizada, resumo da contagem e anexos com download
- [X] T009 Testes do front

## Fase 3 — Documentação

- [X] T010 Técnico (capítulo 13), manual (contagem e cotações), changelog

## Fase 4 — Conferência

- [X] T011 Postgres no Docker: foto e PDF enviados pelo proxy do front e baixados iguais (volume `arquivos`)
- [ ] T012 Conferir no navegador e no celular (câmera do aparelho)
