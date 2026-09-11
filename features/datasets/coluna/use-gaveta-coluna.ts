"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { aviso } from "@/componentes/ui/toast";
import { excluirColuna, salvarColuna, type ColunaEntrada } from "@/lib/painel/acoes-construtor";
import type { Campo } from "@/lib/painel/tipos";

type useGavetaColunaProps = {
  conjuntoId: number;
  coluna?: Campo;
};

function inicial(coluna?: Campo): ColunaEntrada {
  return {
    nome: coluna?.nome ?? "",
    tipo: coluna?.tipo ?? "texto",
    formato: coluna?.formato ?? "inteiro",
    casas: coluna?.casas ?? 0,
    unidade: coluna?.unidade ?? "",
    descricao: coluna?.descricao ?? "",
    opcoes: coluna?.opcoes ?? [],
    obrigatorio: coluna?.obrigatorio ?? false,
  };
}

export function useGavetaColuna({ conjuntoId, coluna }: useGavetaColunaProps) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [aberta, setAberta] = useState(false);
  const [form, setForm] = useState<ColunaEntrada>(inicial(coluna));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const editando = !!coluna;
  const tipoMudou = editando && coluna.tipo !== form.tipo;

  function abrir() {
    setForm(inicial(coluna));
    setErro(null);
    setAberta(true);
  }

  function mudar(m: Partial<ColunaEntrada>) {
    setForm((f) => ({ ...f, ...m }));
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarColuna(conjuntoId, form, coluna?.id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aviso.sucesso(editando ? "Coluna salva." : "Coluna criada.");
      setAberta(false);
      router.refresh();
    });
  }

  async function excluir() {
    if (!coluna) return;
    const ok = await pedir({
      titulo: `Apagar a coluna "${coluna.nome}"?`,
      texto:
        "O que já foi digitado nela fica guardado nas linhas e volta se você recriar uma coluna com o mesmo nome. Cards que usam essa coluna param de mostrar número.",
      confirmar: "Apagar coluna",
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await excluirColuna(coluna.id, conjuntoId);
      if (!r.ok) {
        aviso.erro("Não apaguei a coluna", r.erro);
        return;
      }
      aviso.sucesso("Coluna apagada.");
      setAberta(false);
      router.refresh();
    });
  }

  return {
    aberta,
    abrir,
    fechar: () => setAberta(false),
    form,
    mudar,
    erro,
    salvando,
    editando,
    tipoMudou,
    salvar,
    excluir,
    dialogo,
  };
}
