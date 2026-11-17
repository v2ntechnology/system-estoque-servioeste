import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/lib/theme"
import { UnidadeProvider } from "@/lib/unidade"

/** Provedores globais (tema, dados do servidor, unidade ativa e avisos). Usado pelo app e pelos testes. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: import.meta.env.MODE === "test" ? false : 1 } },
  }))
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UnidadeProvider>
          <ToastProvider>{children}</ToastProvider>
        </UnidadeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
