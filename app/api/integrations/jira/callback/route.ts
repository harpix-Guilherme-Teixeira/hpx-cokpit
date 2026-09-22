import { NextResponse, type NextRequest } from "next/server";
import { descobrirConta, trocarCodigo } from "@/lib/jira-oauth";
import { salvarCredencial } from "@/lib/integracao-jira";
import { usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

function voltar(origem: string, erro?: string) {
  const url = new URL("/integrations", origem);
  if (erro) url.searchParams.set("erro", erro);
  else url.searchParams.set("ok", "1");

  const r = NextResponse.redirect(url);
  r.cookies.delete("jira_state");
  return r;
}

/** Retorno do Atlassian: troca o código por token e grava.
 *
 *  A ordem importa. Confere o `state` ANTES de gastar o código, e confere quem
 *  está logado ANTES de gravar: sem isso a credencial de uma conta do Jira
 *  poderia ser gravada na linha de outra pessoa. */
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const recusado = params.get("error");
  if (recusado) {
    return voltar(origem, recusado === "access_denied" ? "recusado" : recusado);
  }

  const codigo = params.get("code");
  const state = params.get("state");
  const esperado = request.cookies.get("jira_state")?.value;

  if (!codigo || !state || !esperado || state !== esperado) {
    return voltar(origem, "estado");
  }

  const usuario = await usuarioAtual();
  if (!usuario) return voltar(origem, "sessao");

  try {
    const cred = await trocarCodigo(codigo, origem);
    const conta = await descobrirConta(cred.accessToken);
    await salvarCredencial(usuario, conta, cred);
    return voltar(origem);
  } catch (e) {
    // A mensagem crua do Atlassian pode citar client_id e redirect_uri, então
    // ela fica no log do servidor e a tela recebe só o rótulo do erro.
    console.error("[jira oauth]", e);
    return voltar(origem, "troca");
  }
}
