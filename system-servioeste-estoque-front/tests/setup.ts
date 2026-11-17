import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
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
