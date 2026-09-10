"use client";

import { useState, type ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

type Props = { nome: string; email: string; children: ReactNode };

/** Mesma moldura do hpx-svc-front: barra lateral, header de 64px e conteúdo
 *  sobre grey-200. O estado de aberto mora aqui porque o header abre e a
 *  barra fecha, e passar por props é mais simples de ler do que um contexto
 *  para duas peças. */
export function Shell({ nome, email, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar aberto={menuAberto} fechar={() => setMenuAberto(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header nome={nome} email={email} abrirMenu={() => setMenuAberto(true)} />
        <main className="bg-grey-200 flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
