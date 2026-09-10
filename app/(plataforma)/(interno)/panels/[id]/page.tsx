import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Pagina, Secao, TituloPagina, Vazio } from "@/componentes/layout/pagina";
import { InterruptorPublicar } from "@/features/paineis/components/interruptor-publicar";
import { clienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function PaginaConstrutor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const painelId = Number(id);
  if (!Number.isInteger(painelId)) notFound();

  const supabase = await clienteServidor();
  const { data: painel } = await supabase
    .from("pnl_painel")
    .select("id, slug, nome, descricao, publicado")
    .eq("id", painelId)
    .maybeSingle();

  if (!painel) notFound();

  const { data: faixas } = await supabase
    .from("pnl_faixa")
    .select("id, titulo, descricao, colunas, ordem")
    .eq("painel_id", painelId)
    .order("ordem");

  return (
    <Pagina>
      <Link
        href="/dashboard"
        className="text-grey-400 hover:text-grey-600 mb-4 inline-flex items-center gap-1 text-sm"
      >
        <IconArrowLeft size={16} />
        Painéis
      </Link>

      <TituloPagina
        titulo={painel.nome}
        descricao={`Endereço público: /p/${painel.slug}`}
        acao={
          <InterruptorPublicar id={painel.id} publicado={painel.publicado} slug={painel.slug} />
        }
      />

      <Secao titulo="Faixas" contador={faixas?.length ?? 0}>
        {(faixas?.length ?? 0) === 0 ? (
          <Vazio
            titulo="Nenhuma faixa ainda"
            texto="A faixa é o container: um título, uma descrição e os cards dentro. O editor de faixas e cards é o próximo passo."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {faixas!.map((f) => (
              <li
                key={f.id}
                className="border-grey-300/60 rounded-xl border bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-grey-600 font-medium">{f.titulo}</p>
                {f.descricao && <p className="text-grey-400 text-sm">{f.descricao}</p>}
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </Pagina>
  );
}
