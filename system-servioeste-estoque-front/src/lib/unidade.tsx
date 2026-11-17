import { createContext, useContext, useState, type ReactNode } from "react"

/** Unidade escolhida na barra do topo. `""` = todas as liberadas. Guardada no navegador com o prefixo do app. */
type Ctx = { unidade: string; setUnidade: (u: string) => void }

const UnidadeContext = createContext<Ctx | null>(null)
const KEY = "estoque-unidade"

function lerGuardada() {
  try {
    return localStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const [unidade, setEstado] = useState(lerGuardada)
  const setUnidade = (u: string) => {
    setEstado(u)
    try {
      localStorage.setItem(KEY, u)
    } catch {
      /* navegador sem storage */
    }
  }
  return <UnidadeContext.Provider value={{ unidade, setUnidade }}>{children}</UnidadeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnidadeAtiva() {
  const ctx = useContext(UnidadeContext)
  if (!ctx) throw new Error("useUnidadeAtiva fora do UnidadeProvider")
  return ctx
}
