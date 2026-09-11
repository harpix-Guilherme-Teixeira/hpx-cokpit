import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

/** Confere quem está gravando antes de qualquer escrita.
 *
 *  A RLS já barra quem não está em `seg_autorizado`, mas o erro dela chega como
 *  "0 linhas afetadas", que na tela vira silêncio. Conferir antes deixa a
 *  mensagem honesta.
 *
 *  Também garante a linha em `seg_perfil`. É dela que a grade tira o nome de
 *  quem editou cada linha: sem isso a tela mostraria um uuid, e a regra de todo
 *  dado manual carregar autor legível na tela não se cumpriria. */
export async function exigirAutor() {
  const usuario = await usuarioAtual();
  if (!usuario?.email) {
    return { ok: false as const, erro: "Sua sessão expirou. Entre de novo." };
  }

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("seg_autorizado")
    .select("nome")
    .eq("email", usuario.email)
    .maybeSingle();

  if (!data) {
    return {
      ok: false as const,
      erro: `${usuario.email} não está na lista de quem pode editar.`,
    };
  }

  await supabase.from("seg_perfil").upsert({ id: usuario.id, nome: data.nome });

  return { ok: true as const, supabase, usuario };
}
