// Plugin do Vite da área do desenvolvedor (/dev). Só existe no servidor de desenvolvimento (`apply: "serve"`): nada
// disto entra no build. Lê o git log a cada pedido, então commits novos aparecem ao recarregar a página.
import { execFile } from "node:child_process"

import type { Plugin } from "vite"

const SEP_CAMPO = "\x1f"
const SEP_COMMIT = "\x1e"

export function areaDev(raiz: string): Plugin {
  return {
    name: "estoque-area-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__dev/commits", (_req, res) => {
        execFile("git", [
          "log", "-n", "300", "--date=iso-strict", "--name-status",
          `--pretty=format:${SEP_COMMIT}%H${SEP_CAMPO}%h${SEP_CAMPO}%ad${SEP_CAMPO}%an${SEP_CAMPO}%s`,
        ], { cwd: raiz, maxBuffer: 20 * 1024 * 1024 }, (erro, saida) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          if (erro) {
            res.statusCode = 500
            res.end(JSON.stringify({ detail: erro.message }))
            return
          }
          const commits = saida.split(SEP_COMMIT).map((b) => b.trim()).filter(Boolean).map((bloco) => {
            const [cabecalho, ...arquivos] = bloco.split("\n")
            const [hash, curto, data, autor, mensagem] = cabecalho.split(SEP_CAMPO)
            return {
              hash, curto, data, autor, mensagem,
              arquivos: arquivos.filter(Boolean).map((l) => {
                const [status, ...caminhos] = l.split("\t")
                return { status: status[0], caminho: caminhos[caminhos.length - 1], anterior: caminhos.length > 1 ? caminhos[0] : null }
              }),
            }
          })
          res.end(JSON.stringify(commits))
        })
      })
    },
  }
}
