import { Navigate, Route, Routes } from "react-router-dom"

import { BacklogPage, ChangelogPage, DocumentosPage, HistoricoPage, ImplementacaoPage, VisaoGeralPage } from "./paginas"

/** Área do desenvolvedor (/dev). Carregada só em modo de desenvolvimento (veja rotas.tsx). */
export function DevApp() {
  return (
    <Routes>
      <Route index element={<VisaoGeralPage />} />
      <Route path="implementacao" element={<ImplementacaoPage />} />
      <Route path="backlog" element={<BacklogPage />} />
      <Route path="historico" element={<HistoricoPage />} />
      <Route path="changelog" element={<ChangelogPage />} />
      <Route path="documentos" element={<DocumentosPage />} />
      <Route path="*" element={<Navigate to="/dev" replace />} />
    </Routes>
  )
}
