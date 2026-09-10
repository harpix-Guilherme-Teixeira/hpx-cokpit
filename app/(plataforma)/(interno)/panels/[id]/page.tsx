import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconExternalLink, IconWand } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { InterruptorPublicar } from "@/features/paineis/components/interruptor-publicar";
import { PainelRender } from "@/features/paineis/renderizador/painel-render";
import { carregarPainel } from "@/lib/painel/consultas";

export const dynamic = "force-dynamic";

export default async function PaginaPainel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const painelId = Number(id);
  if (!Number.isInteger(painelId)) notFound();

  const painel = await carregarPainel({ id: painelId });
  if (!painel) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="text-grey-400 hover:text-grey-600 inline-flex items-center gap-1 text-sm"
        >
          <IconArrowLeft size={16} />
          Painéis
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {painel.publicado && (
            <a
              href={`/p/${painel.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-grey-400 hover:text-primary inline-flex items-center gap-1 text-sm"
            >
              <IconExternalLink size={16} />
              Ver publicado
            </a>
          )}
          <Link href={`/panels/${painel.id}/personalizar`}>
            <Botao tom="contorno">
              <IconWand size={16} />
              Personalizar
            </Botao>
          </Link>
          <InterruptorPublicar
            id={painel.id}
            publicado={painel.publicado}
            slug={painel.slug}
            semLink
          />
        </div>
      </div>

      <div className="mb-2 flex items-baseline gap-3">
        <h1 className="text-grey-600 text-xl font-bold lg:text-2xl">{painel.nome}</h1>
        <span
          className={
            painel.publicado
              ? "bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium"
              : "bg-grey-200 text-grey-400 rounded-full px-2.5 py-1 text-xs font-medium"
          }
        >
          {painel.publicado ? "publicado" : "rascunho"}
        </span>
      </div>
      <p className="text-grey-400 mb-5 text-sm">
        É assim que ele aparece para quem abre <code>/p/{painel.slug}</code>.
      </p>

      {/* A prévia é o painel de verdade, não uma imitação: mesmo renderizador,
          mesmo tema, mesmo cálculo. Uma prévia aproximada é pior que nenhuma,
          porque ninguém descobre a diferença antes de publicar. */}
      <div className="border-grey-300/60 overflow-hidden rounded-xl border shadow-sm">
        <PainelRender painel={painel} />
      </div>
    </div>
  );
}
