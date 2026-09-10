import { notFound } from "next/navigation";
import { Editor } from "@/features/paineis/editor/editor";
import { carregarPainel, listarFontes } from "@/lib/painel/consultas";

export const dynamic = "force-dynamic";

export default async function PaginaPersonalizar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const painelId = Number(id);
  if (!Number.isInteger(painelId)) notFound();

  const [painel, fontes] = await Promise.all([carregarPainel({ id: painelId }), listarFontes()]);
  if (!painel) notFound();

  return <Editor painel={painel} fontes={fontes} />;
}
