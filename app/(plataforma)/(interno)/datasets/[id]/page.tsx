import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Cartao, Pagina, Secao, TituloPagina, Vazio } from "@/componentes/layout/pagina";
import { clienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  opcao: "Opção",
  booleano: "Sim ou não",
};

export default async function PaginaConjunto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conjuntoId = Number(id);
  if (!Number.isInteger(conjuntoId)) notFound();

  const supabase = await clienteServidor();

  const { data: conjunto } = await supabase
    .from("dad_conjunto")
    .select("id, chave, nome, descricao")
    .eq("id", conjuntoId)
    .maybeSingle();

  if (!conjunto) notFound();

  const [{ data: campos }, { count }] = await Promise.all([
    supabase
      .from("dad_campo")
      .select("id, chave, nome, tipo, obrigatorio, ordem")
      .eq("conjunto_id", conjuntoId)
      .order("ordem"),
    supabase
      .from("dad_registro")
      .select("id", { count: "exact", head: true })
      .eq("conjunto_id", conjuntoId),
  ]);

  return (
    <Pagina>
      <Link
        href="/datasets"
        className="text-grey-400 hover:text-grey-600 mb-4 inline-flex items-center gap-1 text-sm"
      >
        <IconArrowLeft size={16} />
        Dados
      </Link>

      <TituloPagina titulo={conjunto.nome} descricao={conjunto.descricao ?? undefined} />

      <Secao titulo="Colunas" contador={campos?.length ?? 0}>
        <Cartao>
          <ul className="divide-grey-300/50 divide-y">
            {(campos ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-grey-600 text-sm font-medium">{c.nome}</p>
                  <p className="text-grey-400 text-xs">{c.chave}</p>
                </div>
                <span className="bg-grey-200 text-grey-500 rounded-full px-2.5 py-1 text-xs">
                  {ROTULO_TIPO[c.tipo] ?? c.tipo}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      </Secao>

      <Secao titulo="Linhas" contador={count ?? 0}>
        <Vazio
          titulo="Nenhuma linha ainda"
          texto="A grade de digitação, com colar direto do Excel, é o próximo passo. É o único jeito realista de entrar com centenas de linhas."
        />
      </Secao>
    </Pagina>
  );
}
