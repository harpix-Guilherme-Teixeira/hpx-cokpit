"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout, IconMenu2, IconUser } from "@tabler/icons-react";
import { clienteNavegador } from "@/lib/supabase/navegador";

/** Iniciais para o avatar. Pega a primeira e a última palavra, que é o que
 *  distingue "Alline Cavalcante" de "Alline Costa". */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

type Props = { nome: string; email: string; abrirMenu: () => void };

export function Header({ nome, email, abrirMenu }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora e no Esc. Sem isso o menu fica preso aberto no toque.
  useEffect(() => {
    if (!aberto) return;
    const foraOuEsc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setAberto(false);
        return;
      }
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", foraOuEsc);
    document.addEventListener("keydown", foraOuEsc);
    return () => {
      document.removeEventListener("mousedown", foraOuEsc);
      document.removeEventListener("keydown", foraOuEsc);
    };
  }, [aberto]);

  async function sair() {
    setSaindo(true);
    await clienteNavegador().auth.signOut();
    router.refresh();
    router.replace("/entrar");
  }

  return (
    <header className="bg-background border-grey-300/60 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 lg:px-6">
      <button
        type="button"
        onClick={abrirMenu}
        aria-label="Abrir menu"
        className="text-grey-500 hover:bg-grey-200 -ml-1 rounded-md p-2 lg:hidden"
      >
        <IconMenu2 size={20} />
      </button>

      {/* Espaçador para o avatar continuar à direita quando o botão some. */}
      <span className="hidden lg:block" />

      <div className="relative" ref={caixa}>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          className="bg-primary flex size-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {iniciais(nome)}
        </button>

        {aberto && (
          <div
            role="menu"
            className="border-grey-300/60 absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border bg-white shadow-md"
          >
            <div className="border-grey-300/60 border-b px-4 py-3">
              <p className="text-grey-600 truncate text-sm font-medium">{nome}</p>
              <p className="text-grey-400 truncate text-xs">{email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              disabled
              className="text-grey-400 flex w-full cursor-not-allowed items-center gap-2 px-4 py-2.5 text-left text-sm"
            >
              <IconUser size={16} />
              Perfil
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={sair}
              disabled={saindo}
              className="text-grey-600 hover:bg-grey-200 flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm"
            >
              <IconLogout size={16} />
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
