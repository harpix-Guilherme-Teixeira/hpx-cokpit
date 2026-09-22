import { clienteServico } from "@/lib/supabase/servico";
import { clienteServidor } from "@/lib/supabase/servidor";
import { descobrirConta, renovar, type CredencialJira, type ContaJira } from "@/lib/jira-oauth";

export type EstadoIntegracao = { conectado: boolean; conta?: string; siteUrl?: string };

/** O que a TELA pode saber: se está conectado e com qual conta. Nunca o token.
 *
 *  Vai pela função `jira_conectado`, que roda no banco e devolve só os campos
 *  inofensivos. A tabela em si não tem policy nenhuma, então nem esta consulta
 *  nem o navegador conseguem ler a linha inteira. */
export async function estadoIntegracao(): Promise<EstadoIntegracao> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("jira_conectado");

  if (error || !data || data.length === 0) return { conectado: false };

  const linha = data[0] as { conta: string | null; site_url: string | null };
  return {
    conectado: true,
    conta: linha.conta ?? undefined,
    siteUrl: linha.site_url ?? undefined,
  };
}

export async function salvarCredencial(
  usuario: { id: string; email?: string },
  conta: ContaJira,
  cred: CredencialJira,
) {
  const { error } = await clienteServico()
    .from("int_jira")
    .upsert(
      {
        usuario_id: usuario.id,
        email: usuario.email ?? "",
        cloud_id: conta.cloudId,
        site_url: conta.siteUrl,
        conta: conta.conta,
        access_token: cred.accessToken,
        refresh_token: cred.refreshToken,
        expira_em: cred.expiraEm.toISOString(),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id" },
    );

  if (error) throw new Error(`Não gravei a credencial: ${error.message}`);
}

export async function desconectar(usuarioId: string) {
  const { error } = await clienteServico().from("int_jira").delete().eq("usuario_id", usuarioId);
  if (error) throw new Error(`Não desconectei: ${error.message}`);
}

/** Token pronto para usar, renovado se preciso.
 *
 *  A renovação GRAVA o refresh token novo antes de devolver, porque o Atlassian
 *  rotaciona o refresh a cada uso e invalida o anterior na hora. Guardar depois
 *  da chamada ao Jira, ou não guardar, deixa a conexão morta na semana seguinte,
 *  e o erro aparece longe daqui. */
export async function credencialViva(
  usuarioId: string,
): Promise<{ accessToken: string; cloudId: string } | null> {
  const supabase = clienteServico();

  const { data } = await supabase
    .from("int_jira")
    .select("cloud_id, access_token, refresh_token, expira_em")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expira_em) > new Date()) {
    return { accessToken: data.access_token, cloudId: data.cloud_id };
  }

  const nova = await renovar(data.refresh_token);

  await supabase
    .from("int_jira")
    .update({
      access_token: nova.accessToken,
      refresh_token: nova.refreshToken || data.refresh_token,
      expira_em: nova.expiraEm.toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("usuario_id", usuarioId);

  return { accessToken: nova.accessToken, cloudId: data.cloud_id };
}

/** Confere no Jira que a credencial guardada ainda vale, e devolve de quem ela
 *  é. Serve para a tela não afirmar "conectado" com base só na existência da
 *  linha: token revogado no Atlassian continua gravado aqui. */
export async function conferirConexao(usuarioId: string): Promise<ContaJira | null> {
  const viva = await credencialViva(usuarioId);
  if (!viva) return null;
  return descobrirConta(viva.accessToken);
}
