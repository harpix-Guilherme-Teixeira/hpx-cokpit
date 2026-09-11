"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { aviso } from "@/componentes/ui/toast";
import { editarCelula, excluirLinhas, novaLinha } from "@/lib/painel/acoes-dados";
import { converter } from "@/lib/painel/converter";
import type { Campo, Registro } from "@/lib/painel/tipos";

type useGradeProps = {
  conjuntoId: number;
  campos: Campo[];
  registros: Registro[];
};

export function useGrade({ conjuntoId, campos, registros }: useGradeProps) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [linhas, setLinhas] = useState(registros);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    setLinhas(registros);
  }, [registros]);

  /** Devolve falso quando o texto não converte, para a célula voltar ao valor
   *  anterior em vez de ficar mostrando um texto que não foi gravado. */
  function editar(registroId: number, chave: string, texto: string) {
    const campo = campos.find((c) => c.chave === chave);
    if (!campo) return false;

    const conversao = converter(texto, campo);
    if (!conversao.ok) {
      aviso.erro("Não gravei essa célula", conversao.erro);
      return false;
    }

    const antes = linhas;
    setLinhas((atual) =>
      atual.map((l) =>
        l.id === registroId ? { ...l, valores: { ...l.valores, [chave]: conversao.valor } } : l,
      ),
    );

    iniciar(async () => {
      const r = await editarCelula(conjuntoId, registroId, chave, texto);
      if (!r.ok) {
        setLinhas(antes);
        aviso.erro("Não gravei essa célula", r.erro);
        return;
      }
      router.refresh();
    });

    return true;
  }

  function adicionar() {
    iniciar(async () => {
      const r = await novaLinha(conjuntoId);
      if (!r.ok) {
        aviso.erro("Não criei a linha", r.erro);
        return;
      }
      router.refresh();
    });
  }

  function alternar(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados((atual) =>
      atual.size === linhas.length ? new Set() : new Set(linhas.map((l) => l.id)),
    );
  }

  async function excluirSelecionados() {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    const plural = ids.length > 1 ? "s" : "";

    const ok = await pedir({
      titulo: `Apagar ${ids.length} linha${plural}?`,
      texto: "Os cards que usam este conjunto passam a contar sem elas. Não dá para desfazer.",
      confirmar: `Apagar ${ids.length} linha${plural}`,
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await excluirLinhas(conjuntoId, ids);
      if (!r.ok) {
        aviso.erro("Não apaguei as linhas", r.erro);
        return;
      }
      setSelecionados(new Set());
      aviso.sucesso(
        `${r.dado.apagadas} linha${r.dado.apagadas === 1 ? "" : "s"} apagada${r.dado.apagadas === 1 ? "" : "s"}.`,
      );
      router.refresh();
    });
  }

  return {
    linhas,
    selecionados,
    ocupado,
    dialogo,
    editar,
    adicionar,
    alternar,
    alternarTodos,
    excluirSelecionados,
  };
}
