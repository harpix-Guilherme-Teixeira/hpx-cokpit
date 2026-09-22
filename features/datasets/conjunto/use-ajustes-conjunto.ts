"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { aviso } from "@/componentes/ui/toast";
import {
  excluirConjunto,
  salvarConjunto,
  usoDoConjunto,
  type AjustesConjunto,
} from "@/lib/painel/acoes";
import type { Cadencia } from "@/lib/painel/tipos";

type useAjustesConjuntoProps = {
  id: number;
  nome: string;
  descricao: string | null;
  dono: string | null;
  cadencia: Cadencia;
  fonte: string | null;
};

function inicial(p: useAjustesConjuntoProps): AjustesConjunto {
  return {
    nome: p.nome,
    descricao: p.descricao ?? "",
    dono: p.dono ?? "",
    cadencia: p.cadencia,
    fonte: p.fonte ?? "",
  };
}

function frasePerda(colunas: number, linhas: number) {
  const partes: string[] = [];
  if (colunas > 0) partes.push(`${colunas} coluna${colunas > 1 ? "s" : ""}`);
  if (linhas > 0)
    partes.push(`${linhas} linha${linhas > 1 ? "s" : ""} já digitada${linhas > 1 ? "s" : ""}`);
  if (partes.length === 0) return "Ele está vazio.";
  return `Vai levar junto ${partes.join(" e ")}, e isso não volta.`;
}

export function useAjustesConjunto(props: useAjustesConjuntoProps) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [aberta, setAberta] = useState(false);
  const [form, setForm] = useState<AjustesConjunto>(inicial(props));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function abrir() {
    setForm(inicial(props));
    setErro(null);
    setAberta(true);
  }

  function mudar(m: Partial<AjustesConjunto>) {
    setForm((f) => ({ ...f, ...m }));
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarConjunto(props.id, form);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aviso.sucesso("Conjunto salvo.");
      setAberta(false);
      router.refresh();
    });
  }

  async function excluir() {
    // Mede o estrago ANTES de perguntar: sem os números, "tem certeza?" é uma
    // pergunta que ninguém consegue responder.
    const uso = await usoDoConjunto(props.id);
    const dados = uso.ok ? uso.dado : null;
    const publicados = dados?.paineis.filter((p) => p.publicado).length ?? 0;

    const ok = await pedir({
      titulo: `Apagar o conjunto "${props.nome}"?`,
      texto: dados
        ? frasePerda(dados.colunas, dados.linhas)
        : "Não consegui medir o que será apagado. Colunas e linhas vão junto, e isso não volta.",
      itens:
        dados?.paineis.map(
          (p) =>
            `${p.nome}: ${p.cards} card${p.cards > 1 ? "s" : ""} ficam sem fonte, ${p.publicado ? "publicado" : "rascunho"}`,
        ) ?? [],
      alerta:
        publicados > 0
          ? `${publicados === 1 ? "Um painel publicado usa" : `${publicados} painéis publicados usam`} este conjunto: quem abrir o link vai ver os cards sem fonte.`
          : undefined,
      confirmar: "Apagar conjunto",
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await excluirConjunto(props.id);
      if (!r.ok) {
        aviso.erro("Não apaguei o conjunto", r.erro);
        return;
      }
      aviso.sucesso("Conjunto apagado.");
      router.push("/datasets");
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
    salvar,
    excluir,
    dialogo,
  };
}
