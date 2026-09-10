"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { IconLayoutDashboard, IconTable, IconWorld, IconX } from "@tabler/icons-react";

type ItemProps = {
  href: string;
  ativo: boolean;
  icone: ReactNode;
  children: ReactNode;
  aoNavegar: () => void;
};

function ItemSidebar({ href, ativo, icone, children, aoNavegar }: ItemProps) {
  return (
    <Link
      href={href}
      onClick={aoNavegar}
      aria-current={ativo ? "page" : undefined}
      className={twMerge(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10",
        ativo ? "text-primary bg-white/10 font-medium" : "text-sidebar-foreground/80",
      )}
    >
      {icone}
      {children}
    </Link>
  );
}

type Props = { aberto: boolean; fechar: () => void };

/** Barra lateral no padrão harpix. A diferença em relação ao hpx-svc-front é a
 *  responsividade: lá ela é `w-64 h-screen` fixa, o que no celular ocupa a tela
 *  inteira. Aqui, abaixo de `lg`, ela vira gaveta por cima do conteúdo, com
 *  fundo escurecido, e some ao navegar. */
export function Sidebar({ aberto, fechar }: Props) {
  const caminho = usePathname();
  const ativo = (base: string) => caminho === base || caminho.startsWith(`${base}/`);

  // Esc fecha, que é o que qualquer pessoa tenta primeiro numa gaveta.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  return (
    <>
      {aberto && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={fechar}
          aria-hidden="true"
        />
      )}

      <aside
        className={twMerge(
          "bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col gap-1 p-4 transition-transform duration-200",
          "lg:static lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-start justify-between px-2">
          <div>
            <span className="text-lg font-bold lowercase text-white">harpix</span>
            <p className="text-sidebar-foreground/50 text-xs">cockpit</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="text-sidebar-foreground/70 rounded-md p-1 hover:bg-white/10 lg:hidden"
          >
            <IconX size={18} />
          </button>
        </div>

        <ItemSidebar
          href="/dashboard"
          ativo={caminho === "/dashboard"}
          icone={<IconLayoutDashboard size={20} />}
          aoNavegar={fechar}
        >
          Painéis
        </ItemSidebar>

        <ItemSidebar
          href="/datasets"
          ativo={ativo("/datasets")}
          icone={<IconTable size={20} />}
          aoNavegar={fechar}
        >
          Dados
        </ItemSidebar>

        <div className="mt-auto">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-sidebar-foreground/60 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10"
          >
            <IconWorld size={20} />
            Cockpit do Jira
          </a>
        </div>
      </aside>
    </>
  );
}
