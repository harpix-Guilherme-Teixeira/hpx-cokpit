"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/componentes/ui/botao";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function Sair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function aoSair() {
    setSaindo(true);
    await clienteNavegador().auth.signOut();
    // `refresh` antes de navegar, para o middleware ver o cookie já apagado.
    router.refresh();
    router.replace("/entrar");
  }

  return (
    <Botao tom="contorno" tamanho="p" onClick={aoSair} disabled={saindo}>
      {saindo ? "Saindo..." : "Sair"}
    </Botao>
  );
}
