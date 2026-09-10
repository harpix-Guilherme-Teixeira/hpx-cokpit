import type { ReactNode } from "react";
import "../globals.css";

/** O CSS do cockpit do Jira é carregado AQUI e não no layout raiz.
 *
 *  Ele usa seletores de elemento soltos, `main`, `section`, `h2`, escritos
 *  quando esta era a única tela do projeto. Importado no raiz, aquele
 *  `main { max-width: 1440px; margin: 0 auto }` vazava para a área da gestora e
 *  deixava o conteúdo com sobra branca dos dois lados. Isolando por grupo de
 *  rotas, cada área carrega o seu e nenhuma pisa na outra. */
export default function LayoutCockpit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
