import type { Metadata } from "next";
import { Aviso, Cartao, Pagina, Secao, TituloPagina, Vazio } from "@/componentes/layout/pagina";
import { NovoConjunto } from "@/features/datasets/components/novo-conjunto";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Dados · harpix" };
export const dynamic = "force-dynamic";

export default async function PaginaDatasets() {
  const supabase = await clienteServidor();

  const { data: conjuntos, error } = await supabase
    .from("dad_conjunto")
    .select("id, chave, nome, descricao, atualizado_em")
    .order("nome");

  return (
    <Pagina>
      <TituloPagina
        titulo="Dados"
        descricao="Cada conjunto é uma tabela que você nomeia, com colunas tipadas. O tipo da coluna é o que decide quais filtros e quais métricas o construtor vai oferecer depois."
        acao={<NovoConjunto />}
      />

      <Secao titulo="Conjuntos" contador={conjuntos?.length}>
        {error ? (
          <Aviso>Não consegui ler os conjuntos: {error.message}</Aviso>
        ) : conjuntos.length === 0 ? (
          <Vazio
            titulo="Nenhum conjunto ainda"
            texto="Um conjunto é uma tabela que você nomeia, com colunas tipadas. É dele que os cards puxam número."
            acao={<NovoConjunto tom="contorno" rotulo="Criar o primeiro" />}
          />
        ) : (
          <Cartao>
            <ul className="divide-grey-300/50 divide-y">
              {conjuntos.map((c) => (
                <li key={c.id} className="px-5 py-4">
                  <p className="text-grey-600 font-medium">{c.nome}</p>
                  <p className="text-grey-400 text-xs">{c.chave}</p>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </Secao>
    </Pagina>
  );
}
