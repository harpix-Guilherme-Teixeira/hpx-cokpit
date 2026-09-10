import type { ReactNode } from "react";

/** Grupo do painel público. Sem shell, sem sidebar, sem Tailwind: a tela é o
 *  painel e nada mais. O CSS vem do próprio renderizador. */
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
