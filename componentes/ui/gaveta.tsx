"use client";

import { useEffect, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";

type Props = {
  aberta: boolean;
  fechar: () => void;
  titulo: string;
  descricao?: string;
  /** Rodapé fixo. Fica fora da área rolável de propósito: formulário longo com
   *  o botão de salvar no fim da rolagem esconde a ação principal. */
  rodape?: ReactNode;
  children: ReactNode;
};

/** Gaveta lateral. Entra pela direita no desktop e ocupa a tela no celular.
 *
 *  Não usa `<dialog>` nativo porque o `showModal` do Chrome anima mal quando o
 *  elemento tem `transform`, e a gaveta é transform. O preço é fazer à mão o
 *  que o nativo dava de graça: Esc, clique no fundo e trava da rolagem de trás.
 *  Os três estão aqui embaixo. */
export function Gaveta({ aberta, fechar, titulo, descricao, rodape, children }: Props) {
  useEffect(() => {
    if (!aberta) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);

    // Sem isto a página de trás rola junto e a gaveta parece descolar.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aberta, fechar]);

  return (
    <>
      <div
        onClick={fechar}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          aberta ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        aria-hidden={!aberta}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-md transition-transform duration-200 ${
          aberta ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="border-grey-300/60 flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <h2 className="text-grey-600 text-lg font-semibold">{titulo}</h2>
            {descricao && <p className="text-grey-400 mt-1 text-sm">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="text-grey-400 hover:bg-grey-200 hover:text-grey-600 -mr-2 rounded-md p-1.5"
          >
            <IconX size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {rodape && (
          <footer className="border-grey-300/60 bg-grey-100 border-t px-6 py-4">{rodape}</footer>
        )}
      </aside>
    </>
  );
}
