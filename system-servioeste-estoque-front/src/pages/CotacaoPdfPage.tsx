import { ArrowLeft, Printer } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Carregando, ErroCarga } from "@/components/ui/estados"
import { useMapaProdutos } from "@/features/catalogo/api"
import { useCotacao } from "@/features/cotacoes/api"
import { useNomeUnidade } from "@/features/sessao/api"
import { dataBR, hojeIso, numero } from "@/lib/format"

/**
 * Solicitação de cotação para enviar a quem vai cotar (spec 001, research D8): página de impressão do navegador
 * ("Imprimir / salvar PDF"). É papel: fundo branco e texto preto mesmo no tema escuro. O PDF gerado no servidor
 * entra com o back-end.
 */
export function CotacaoPdfPage() {
  const { id = "" } = useParams()
  const { data: c, isLoading, error, refetch } = useCotacao(id)
  const { mapa } = useMapaProdutos()
  const nomeUnidade = useNomeUnidade()

  if (isLoading) return <Carregando className="h-dvh" />
  if (error || !c) return <ErroCarga className="h-dvh" mensagem={error?.message} onTentarDeNovo={() => refetch()} />

  return (
    <div className="min-h-dvh bg-muted print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background p-3 print:hidden">
        <Link to={`/cotacoes/${c.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar à cotação
        </Link>
        <Button onClick={() => window.print()}><Printer /> Imprimir / salvar PDF</Button>
      </div>

      <article className="mx-auto my-6 w-full max-w-[210mm] bg-white p-6 text-black shadow-sm sm:p-12 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-6">
          <img src="/logo-servioeste.svg" alt="Servioeste" className="h-10" />
          <div className="text-right text-sm">
            <p className="text-lg font-medium">Solicitação de cotação nº {c.numero}</p>
            <p>{c.titulo}</p>
            <p className="text-black/60">Unidade {nomeUnidade(c.unidade_id)} · emitida em {dataBR(hojeIso())}</p>
          </div>
        </header>

        <p className="mt-6 text-sm">
          Por favor, informe o preço unitário de cada item abaixo, o prazo de entrega e a forma de pagamento.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black/60 text-left">
                <th className="py-2 pr-2 font-medium">Código</th>
                <th className="py-2 pr-2 font-medium">Produto</th>
                <th className="py-2 pr-2 font-medium">Un.</th>
                <th className="py-2 pr-2 text-right font-medium">Qtd.</th>
                <th className="py-2 pr-2 font-medium">Embalagem</th>
                <th className="w-28 py-2 font-medium">Preço unit.</th>
              </tr>
            </thead>
            <tbody>
              {c.itens.map((i) => {
                const p = mapa.get(i.produto_id)
                return (
                  <tr key={i.produto_id} className="border-b border-black/15">
                    <td className="py-2 pr-2 tabular-nums">{p?.codigo}</td>
                    <td className="py-2 pr-2">{p?.nome ?? i.produto_id}</td>
                    <td className="py-2 pr-2">{p?.medida}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{numero(i.quantidade)}</td>
                    <td className="py-2 pr-2">{p?.embalagem ? `${p.embalagem.nome} c/ ${p.embalagem.quantidade}` : "—"}</td>
                    <td className="py-2"><span className="block h-5 border-b border-black/40" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <dl className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
          {["Prazo de entrega", "Forma de pagamento", "Validade da proposta"].map((r) => (
            <div key={r}>
              <dt className="text-black/60">{r}</dt>
              <dd className="mt-6 border-b border-black/40" />
            </div>
          ))}
        </dl>

        {c.observacao && (
          <section className="mt-8 text-sm">
            <h2 className="font-medium">Observação</h2>
            <p className="mt-1 whitespace-pre-line">{c.observacao}</p>
          </section>
        )}

        <footer className="mt-12 border-t border-black/20 pt-4 text-xs text-black/60">
          Servioeste · Solicitação gerada pelo sistema de Estoque e Cotações.
        </footer>
      </article>
    </div>
  )
}
