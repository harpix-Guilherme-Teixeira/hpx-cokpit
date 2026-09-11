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

  // Conjunto montado e sem um número sequer. É exatamente o estado em que o
  // modelo pronto entrega o painel, e sem dizer isso a tela vira uma parede de
  // traços: a pessoa procura o defeito no card em vez de ir digitar o valor.
  const semNumero = Object.values(painel.conjuntos).filter((c) => {
    const medidas = c.campos.filter((f) => f.tipo === "numero" && f.papel !== "periodo");
    if (medidas.length === 0) return false;
    return c.registros.every((r) =>
      medidas.every((f) => {
        const v = r.valores?.[f.chave];
        return v === null || v === undefined || v === "";
      }),
    );
  });

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

      {semNumero.length > 0 && (
        <div className="border-alert/50 bg-alert/10 mb-5 rounded-xl border px-5 py-4">
          <p className="text-grey-600 text-sm font-medium">
            O painel está montado, mas ainda não tem número digitado.
          </p>
          <p className="text-grey-400 mt-1 text-sm">
            Os cards mostram traço porque a medição está em branco, não porque deu erro. O modelo
            traz a estrutura pronta, os valores são seus. Preencha e eles aparecem aqui.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {semNumero.map((c) => (
              <Link key={c.id} href={`/datasets/${c.id}`}>
                <Botao tamanho="p">Preencher {c.nome}</Botao>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* A prévia é o painel de verdade, não uma imitação: mesmo renderizador,
          mesmo tema, mesmo cálculo. Uma prévia aproximada é pior que nenhuma,
          porque ninguém descobre a diferença antes de publicar. */}
      <div className="border-grey-300/60 overflow-hidden rounded-xl border shadow-sm">
        <PainelRender painel={painel} />
      </div>
    </div>
  );
}
