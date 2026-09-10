import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./plataforma.css";

/** Layout do grupo (plataforma). O CSS do Tailwind é importado AQUI e não no
 *  layout raiz de propósito: assim o preflight, que zera margens e estilos de
 *  formulário, só carrega nas rotas desta área e não encosta no cockpit do
 *  Jira que roda em /. */
export default function LayoutPlataforma({ children }: { children: ReactNode }) {
  return (
    <div className="plataforma">
      {children}
      {/* Sem richColors nem closeButton: o cartão do toast é nosso, em
          componentes/ui/toast.tsx, no padrão da esteira. */}
      <Toaster position="bottom-right" />
    </div>
  );
}
