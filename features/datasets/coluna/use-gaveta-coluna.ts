"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { aviso } from "@/componentes/ui/toast";
import {
  excluirColuna,
  salvarColuna,
  usoDaColuna,
  type ColunaEntrada,
  type Resultado,
  type UsoDaColuna,
} from "@/lib/painel/acoes-construtor";
import type { Campo } from "@/lib/painel/tipos";

const DADO_PRESERVADO =
  "O que já foi digitado nela fica guardado e volta se você recriar uma coluna com o mesmo nome.";

function textoDaExclusao(uso: Resultado<UsoDaColuna[]>) {
  if (!uso.ok) {
    return `Não consegui conferir quais cards usam esta coluna. Os que usarem param de mostrar número. ${DADO_PRESERVADO}`;
  }
  if (uso.dado.length === 0) return `Nenhum card usa esta coluna. ${DADO_PRESERVADO}`;
  if (uso.dado.length === 1) return `${DADO_PRESERVADO} Mas este card para de mostrar número:`;
  return `${DADO_PRESERVADO} Mas estes ${uso.dado.length} cards param de mostrar número:`;
}

function alertaDePublicado(cards: UsoDaColuna[]) {
  const publicados = cards.filter((c) => c.publicado).length;
  if (publicados === 0) return undefined;
  if (publicados === 1) return "Um deles está em painel publicado: quem abre o link vai ver o card vazio.";
  return `${publicados} deles estão em painel publicado: quem abre o link vai ver os cards vazios.`;
}

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

    // Confere o uso ANTES de perguntar: a pessoa decide sabendo quais cards
    // esvaziam, e não descobre depois abrindo o painel.
    const uso = await usoDaColuna(conjuntoId, coluna.chave);
    const cards = uso.ok ? uso.dado : [];

    const ok = await pedir({
      titulo: `Apagar a coluna "${coluna.nome}"?`,
      texto: textoDaExclusao(uso),
      itens: cards.map((c) => `"${c.card}" em ${c.painel}, ${c.publicado ? "publicado" : "rascunho"}`),
      alerta: alertaDePublicado(cards),
      confirmar:
        cards.length > 0
          ? `Apagar e esvaziar ${cards.length} card${cards.length > 1 ? "s" : ""}`
          : "Apagar coluna",
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
