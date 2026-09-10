import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PainelRender } from "@/features/paineis/renderizador/painel-render";
import { carregarPainel } from "@/lib/painel/consultas";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const painel = await carregarPainel({ slug });
  if (!painel) return { title: "Painel não encontrado" };
  return {
    title: `${painel.titulo || painel.nome} · harpix`,
    description: painel.subtitulo ?? painel.descricao ?? undefined,
  };
}

export default async function PaginaPublica({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const painel = await carregarPainel({ slug });

  // Rascunho responde 404 para quem não está logado, igual a painel que não
  // existe. Dizer "existe mas está em rascunho" entregaria que o endereço está
  // ocupado, e alguém montaria a tela contando com ele.
  if (!painel || !painel.publicado) notFound();

  return <PainelRender painel={painel} />;
}
