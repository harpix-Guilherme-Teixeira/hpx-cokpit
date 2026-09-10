"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconExternalLink } from "@tabler/icons-react";
import { toast } from "sonner";
import { Botao } from "@/componentes/ui/botao";
import { publicarPainel } from "@/lib/painel/acoes";

export function InterruptorPublicar({
  id,
  publicado,
  slug,
  semLink = false,
}: {
  id: number;
  publicado: boolean;
  slug: string;
  /** A tela do painel já tem o link "Ver publicado" no topo. Repetir aqui
   *  duplicaria a mesma ação a dois centímetros de distância. */
  semLink?: boolean;
}) {
  const router = useRouter();
  const [ligado, setLigado] = useState(publicado);
  const [salvando, iniciar] = useTransition();

  function alternar() {
    const alvo = !ligado;
    // Otimista, mas com volta atrás no erro: deixar o interruptor ligado depois
    // de uma gravação que falhou faria a pessoa acreditar que o painel está no
    // ar quando não está.
    setLigado(alvo);

    iniciar(async () => {
      const r = await publicarPainel(id, alvo);
      if (!r.ok) {
        setLigado(!alvo);
        toast.error(r.erro);
        return;
      }
      toast.success(alvo ? "Painel publicado." : "Painel voltou a rascunho.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {ligado && !semLink && (
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-grey-400 hover:text-primary flex items-center gap-1 text-sm"
        >
          <IconExternalLink size={16} />
          Abrir
        </a>
      )}
      <Botao tom={ligado ? "contorno" : "primario"} onClick={alternar} disabled={salvando}>
        {salvando ? "Salvando..." : ligado ? "Despublicar" : "Publicar"}
      </Botao>
    </div>
  );
}
