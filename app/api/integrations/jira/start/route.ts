import { NextResponse, type NextRequest } from "next/server";
import { urlDeAutorizacao } from "@/lib/jira-oauth";
import { usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** Começa a conexão: manda a pessoa ao Atlassian.
 *
 *  O `state` é sorteado aqui e guardado num cookie que o navegador não lê. No
 *  retorno, a outra rota compara os dois. Sem isso, qualquer pessoa conseguiria
 *  forjar um retorno e plantar a PRÓPRIA conta do Jira na integração de outra. */
export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.redirect(new URL("/login?de=%2Fintegrations", request.nextUrl.origin));
  }

  const state = crypto.randomUUID();
  const destino = NextResponse.redirect(urlDeAutorizacao(request.nextUrl.origin, state));

  destino.cookies.set("jira_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return destino;
}
