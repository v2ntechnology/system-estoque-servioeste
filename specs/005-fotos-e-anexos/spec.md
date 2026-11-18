# Especificação: Fotos da contagem e anexos de cotação no servidor

**Pasta da spec**: `specs/005-fotos-e-anexos` · **Criada em**: 2026-11-18 · **Situação**: Em implementação

**Pedido**: "Pode iniciar as specs" (próxima da lista: fotos e anexos guardados de verdade).

## Contexto

Hoje a foto de um item da contagem e os anexos da cotação (proposta, nota fiscal, boleto) guardam só o **nome** do
arquivo. A documentação técnica pede "fotos e anexos em pasta própria no servidor, com caminho guardado no banco".

## Histórias

### História 1 — Foto do item da contagem (P1)
Ao tirar a foto de um item, ela é enviada e guardada; a linha mostra a miniatura, e tocar nela abre a foto inteira.
A foto aparece também na contagem finalizada e no resumo da contagem.
**Aceitação**: recarregar a página continua mostrando a foto; outra pessoa da mesma unidade vê a foto; pessoa de
outra unidade não consegue abrir o arquivo.

### História 2 — Anexos da cotação (P1)
Proposta, nota fiscal e boleto são guardados e podem ser **baixados** na cotação e no resumo ao lado.

### História 3 — Segurança dos arquivos (P1)
Só imagens (JPEG, PNG, WebP, HEIC) e PDF, até 10 MB, conferidos pelo conteúdo (não só pela extensão). O arquivo fica
com nome sorteado na pasta do servidor; o nome original fica no banco. Quem não vê a unidade do arquivo recebe 404.

## Requisitos
- **RF-01**: `POST /api/v1/arquivos` (multipart `arquivo`, `unidade_id`) → `{ id, nome, tipo, tamanho, url }`.
- **RF-02**: `GET /api/v1/arquivos/{id}` devolve o arquivo (imagem em linha, PDF como download).
- **RF-03**: Item da contagem: `foto` = id do arquivo; a resposta traz `foto_url`. Anexo da cotação traz `url`.
- **RF-04**: Sem conexão, a foto não é enviada: a tela avisa e a quantidade continua guardada no aparelho.

## Fora do escopo
Fila offline de fotos (entra na spec do offline real), compressão de imagem, antivírus, armazenamento em nuvem.
