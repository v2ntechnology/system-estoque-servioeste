# Plano: Fotos e anexos no servidor

**Spec**: `specs/005-fotos-e-anexos/spec.md` · **Data**: 2026-11-18

- **Back**: tabela `arquivos` (id, nome original, tipo, tamanho, caminho relativo, unidade, autor, data) — migração
  `0002_arquivos`; `ItemContagem.foto` e `AnexoCotacao.arquivo_id` apontam para ela. `services/arquivos.py` confere o
  tipo pelos primeiros bytes, limita o tamanho e grava em `ARQUIVOS_DIR` (padrão `arquivos/`, fora do git) com nome
  sorteado em pastas por mês. Rota de leitura confere a unidade.
- **Front**: `features/arquivos/api.ts` (`enviarArquivo`), a contagem envia a foto antes de registrar o item e mostra a
  miniatura; anexos com "Baixar". Simulados guardam o arquivo em memória (URL do navegador), só para a demonstração.
- **Constituição**: III (arquivo só com login e unidade conferida), VIII/IX (foto nunca apaga quantidade),
  restrições (fotos e anexos nunca versionados).
