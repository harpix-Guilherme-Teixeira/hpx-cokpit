"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; erro: string };

const CONJUNTO = 4;

/** Muda o dia e o liga ou desliga.
 *
 *  A HORA não está aqui de propósito: ela mora no `vercel.json` e é fixada no
 *  build, e o plano atual só dispara uma vez por dia. Oferecer um campo de hora
 *  na tela seria prometer um controle que não existe. */
export async function salvarAgendador(entrada: {
  ativo: boolean;
  diaSemana: number;
}): Promise<Resultado> {
  if (!Number.isInteger(entrada.diaSemana) || entrada.diaSemana < 0 || entrada.diaSemana > 6) {
    return { ok: false, erro: "Dia da semana inválido." };
  }

  const usuario = await usuarioAtual();
  if (!usuario?.email) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };

  const supabase = await clienteServidor();

  // A RLS já barra quem não está na lista, mas o erro dela chega como zero
  // linhas afetadas, que na tela vira silêncio. Conferir antes deixa a
  // mensagem honesta.
  const { data: autorizado } = await supabase
    .from("seg_autorizado")
    .select("email")
    .eq("email", usuario.email)
    .maybeSingle();

  if (!autorizado) {
    return { ok: false, erro: `${usuario.email} não pode mexer no agendamento.` };
  }

  const { error } = await supabase
    .from("cfg_agendador")
    .update({
      ativo: entrada.ativo,
      dia_semana: entrada.diaSemana,
      atualizado_em: new Date().toISOString(),
      atualizado_por: usuario.id,
    })
    .eq("conjunto_id", CONJUNTO);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/scheduler");
  return { ok: true };
}
