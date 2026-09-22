"use server";

import { revalidatePath } from "next/cache";
import { desconectar } from "@/lib/integracao-jira";
import { usuarioAtual } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; erro: string };

/** Apaga a credencial de quem está logado.
 *
 *  Só apaga a própria: o id vem da sessão, nunca de parâmetro. Receber o id de
 *  fora deixaria qualquer pessoa autenticada desconectar a integração de outra. */
export async function desconectarJira(): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };

  try {
    await desconectar(usuario.id);
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não consegui desconectar." };
  }

  revalidatePath("/integrations");
  return { ok: true };
}
