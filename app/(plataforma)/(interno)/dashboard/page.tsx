import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import { Aviso, Cartao, Pagina, Secao, TituloPagina, Vazio } from "@/componentes/layout/pagina";
import { NovoPainel } from "@/features/paineis/components/novo-painel";
import { ModelosProntos } from "@/features/paineis/modelo-pronto";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Painéis · harpix" };
export const dynamic = "force-dynamic";

export default async function PaginaDashboard() {
  const supabase = await clienteServidor();

  // Erro de leitura NÃO vira lista vazia. Lista vazia diz "não existe painel",
  // erro diz "não consegui olhar", e confundir os dois foi o defeito que já
  // custou caro no cockpit do Jira.
  const { data: paineis, error } = await supabase
    .from("pnl_painel")
    .select("id, slug, nome, descricao, publicado")
    .order("ordem");

  return (
    <Pagina>
      <TituloPagina
        titulo="Painéis"
        descricao="Cada painel é uma tela pública, montada por faixas e cards. O dado vem dos conjuntos que você digita em Dados."
        acao={<NovoPainel />}
      />

      <Secao titulo="Comece pronto">
        <ModelosProntos />
      </Secao>

      <Secao titulo="Seus painéis" contador={paineis?.length}>
        {error ? (
          <Aviso>Não consegui ler os painéis: {error.message}</Aviso>
        ) : paineis.length === 0 ? (
          <Vazio
            titulo="Nenhum painel ainda"
            texto="Crie o primeiro para montar faixas e cards. O dado vem dos conjuntos que você digita em Dados."
            acao={<NovoPainel tom="contorno" rotulo="Criar o primeiro" />}
          />
        ) : (
          <Cartao>
            <ul className="divide-grey-300/50 divide-y">
              {paineis.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/panels/${p.id}`}
                    className="hover:bg-grey-100 flex items-center justify-between gap-4 px-5 py-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-grey-600 truncate font-medium">{p.nome}</p>
                      <p className="text-grey-400 truncate text-xs">/p/{p.slug}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          p.publicado
                            ? "bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium"
                            : "bg-grey-200 text-grey-400 rounded-full px-2.5 py-1 text-xs font-medium"
                        }
                      >
                        {p.publicado ? "publicado" : "rascunho"}
                      </span>
                      <IconChevronRight size={18} className="text-grey-300" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </Secao>
    </Pagina>
  );
}
