"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aviso } from "@/componentes/ui/toast";
import { criarPainelPronto } from "@/lib/painel/acoes";

export function useModeloPronto() {
  const router = useRouter();
  const [criando, setCriando] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function criar(chave: string) {
    setCriando(chave);

    iniciar(async () => {
      const r = await criarPainelPronto(chave);
      setCriando(null);

      if (!r.ok) {
        aviso.erro("Não criei o painel", r.erro);
        return;
      }

      aviso.sucesso(
        "Painel criado com tudo pronto.",
        "Agora é só digitar os números na linha desta semana.",
      );

      // Vai direto para a grade, não para o painel: o painel já está montado e
      // o que falta é o dado. Cair numa tela de números vazios seria mostrar o
      // trabalho e esconder o próximo passo.
      router.push(r.dado.conjuntoId ? `/datasets/${r.dado.conjuntoId}` : `/panels/${r.dado.painelId}`);
    });
  }

  return { criar, criando };
}
