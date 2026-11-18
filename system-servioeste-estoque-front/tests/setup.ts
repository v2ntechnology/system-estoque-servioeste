import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { File as ArquivoNode, Blob as BlobNode } from "node:buffer"

import { afterEach } from "vitest"

// jsdom não implementa matchMedia (usado pelo tema "sistema").
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

afterEach(() => cleanup())

// O Node 24+ tem um localStorage global próprio (sem arquivo, fica indefinido) que encobre o do jsdom.
// Os testes usam um armazenamento simples em memória.
class Armazenamento implements Storage {
  private dados = new Map<string, string>()
  get length() { return this.dados.size }
  clear() { this.dados.clear() }
  getItem(k: string) { return this.dados.get(k) ?? null }
  key(i: number) { return [...this.dados.keys()][i] ?? null }
  removeItem(k: string) { this.dados.delete(k) }
  setItem(k: string, v: string) { this.dados.set(k, String(v)) }
}
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new Armazenamento() })
Object.defineProperty(window, "localStorage", { configurable: true, value: globalThis.localStorage })

// O react-router cria um Request com o AbortSignal do jsdom ao mudar a URL, e o Request do Node recusa esse sinal.
// Nos testes não há loaders para cancelar, então o sinal é descartado.
const RequestNode = globalThis.Request
globalThis.Request = class extends RequestNode {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...resto } = init
      super(input, resto)
    } else super(input, init)
  }
} as typeof Request

// jsdom não implementa URL.createObjectURL (miniatura da foto antes de a API responder).
if (!URL.createObjectURL) URL.createObjectURL = () => "blob:teste"

// O jsdom traz FormData, File e Blob próprios, que o fetch do Node não sabe enviar (o pedido sai sem o arquivo).
// Usamos os do Node: File e Blob de node:buffer; o FormData sai de um corpo urlencoded lido pelo Response do Node.
{
  const form = await new Response("a=1", { headers: { "content-type": "application/x-www-form-urlencoded" } }).formData()
  Object.assign(globalThis, { FormData: form.constructor, File: ArquivoNode, Blob: BlobNode })
}
