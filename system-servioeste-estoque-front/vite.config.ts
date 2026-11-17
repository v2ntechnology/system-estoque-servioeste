/// <reference types="vitest/config" />
import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

import { areaDev } from "./dev-tools/plugin"

const RAIZ = path.resolve(__dirname, "..")

/**
 * Serve o service worker do MSW só no servidor de desenvolvimento, direto do node_modules (padrão do Ponto).
 * Assim o arquivo nunca fica em public/ e nunca vai para o build de produção (constituição, princípio VII).
 */
function mswSoEmDev(): Plugin {
  const arquivo = path.resolve(__dirname, "node_modules/msw/lib/mockServiceWorker.js")
  return {
    name: "msw-so-em-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/mockServiceWorker.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript")
        res.setHeader("Service-Worker-Allowed", "/")
        res.end(readFileSync(arquivo))
      })
    },
  }
}

export default defineConfig({
  // areaDev: commits para a área do desenvolvedor (/dev). Só no servidor de desenvolvimento.
  plugins: [react(), tailwindcss(), mswSoEmDev(), areaDev(RAIZ)],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    // Portas do Estoque não batem com Radar (5173), Hub (5174), Ponto (5175) e Resíduos (5176).
    port: 5177,
    strictPort: true,
    // Em dev, /api vai para a API (8004), quando ela existir. Em produção quem faz isso é o Caddy.
    proxy: { "/api": "http://127.0.0.1:8004" },
    // A área do dev lê docs/, specs/ e a constituição, que ficam fora da pasta do front.
    fs: { allow: [RAIZ] },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: false,
    passWithNoTests: true,
  },
})
