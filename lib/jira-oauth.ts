/** OAuth 3LO do Jira: cada pessoa conecta a própria conta.
 *
 *  Por que OAuth e não um token no ambiente: com token de ambiente o Jira
 *  registra toda leitura como sendo de uma pessoa só, e a automação morre no dia
 *  em que essa pessoa troca a senha ou sai. Aqui a credencial é de quem conectou.
 *
 *  O `lib/jira.ts` já sabia lidar com Bearer, inclusive a parte que mais engana:
 *  token de OAuth NÃO bate no domínio do site, bate em
 *  `api.atlassian.com/ex/jira/<cloudId>`. Usar o domínio devolve 401 sem dizer
 *  por quê. */

const AUTORIZAR = "https://auth.atlassian.com/authorize";
const TOKEN = "https://auth.atlassian.com/oauth/token";
const RECURSOS = "https://api.atlassian.com/oauth/token/accessible-resources";

/** `offline_access` é o que devolve refresh token. Sem ele a conexão morre em
 *  uma hora e o cron semanal nunca teria credencial viva. */
const ESCOPOS = ["read:jira-work", "read:jira-user", "offline_access"];

export type CredencialJira = {
  accessToken: string;
  refreshToken: string;
  expiraEm: Date;
};

export type ContaJira = {
  cloudId: string;
  siteUrl: string;
  conta: string;
};

function clientId() {
  const id = process.env.JIRA_OAUTH_CLIENT_ID;
  if (!id) throw new Error("Falta JIRA_OAUTH_CLIENT_ID.");
  return id;
}

function clientSecret() {
  const s = process.env.JIRA_OAUTH_CLIENT_SECRET;
  if (!s) throw new Error("Falta JIRA_OAUTH_CLIENT_SECRET.");
  return s;
}

/** O endereço de volta precisa ser IDÊNTICO ao cadastrado no console do
 *  Atlassian, incluindo o protocolo. Diferente de uma letra, o Atlassian recusa
 *  a troca do código com `invalid_grant` e não explica qual campo divergiu. */
export function enderecoDeVolta(origem: string) {
  return `${origem}/api/integrations/jira/callback`;
}

/** Para onde mandar a pessoa. O `state` volta intacto e é o que impede alguém
 *  de forjar o retorno: a rota de callback confere se é o mesmo que saiu. */
export function urlDeAutorizacao(origem: string, state: string) {
  const p = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId(),
    scope: ESCOPOS.join(" "),
    redirect_uri: enderecoDeVolta(origem),
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `${AUTORIZAR}?${p.toString()}`;
}

async function pedirToken(corpo: Record<string, string>): Promise<CredencialJira> {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  const dados = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!r.ok || !dados.access_token) {
    throw new Error(dados.error_description ?? dados.error ?? `Atlassian respondeu ${r.status}.`);
  }

  // Tira um minuto do prazo: o token que vence no meio de uma chamada falha com
  // 401 e parece credencial revogada.
  const segundos = (dados.expires_in ?? 3600) - 60;

  return {
    accessToken: dados.access_token,
    refreshToken: dados.refresh_token ?? "",
    expiraEm: new Date(Date.now() + segundos * 1000),
  };
}

export function trocarCodigo(codigo: string, origem: string) {
  return pedirToken({
    grant_type: "authorization_code",
    client_id: clientId(),
    client_secret: clientSecret(),
    code: codigo,
    redirect_uri: enderecoDeVolta(origem),
  });
}

/** O Atlassian ROTACIONA o refresh token a cada uso: o antigo deixa de valer na
 *  hora. Quem não gravar o novo perde a conexão na renovação seguinte, e o erro
 *  só aparece uma semana depois, no cron. */
export function renovar(refreshToken: string) {
  return pedirToken({
    grant_type: "refresh_token",
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
  });
}

/** Qual site o token alcança. O `cloudId` daqui é obrigatório para montar a URL
 *  de qualquer chamada seguinte. */
export async function descobrirConta(accessToken: string): Promise<ContaJira> {
  const r = await fetch(RECURSOS, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  if (!r.ok) throw new Error(`Não consegui listar os sites do Jira: ${r.status}.`);

  const sites = (await r.json()) as { id: string; url: string; name: string }[];
  const site = sites[0];
  if (!site) throw new Error("Esta conta não tem acesso a nenhum site do Jira.");

  const eu = await fetch(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  // Prova de vida da credencial. A busca do Jira responde 200 com zero resultado
  // para quem não está autenticado, então só `/myself` separa credencial
  // quebrada de dado inexistente.
  if (!eu.ok) throw new Error(`A credencial não se identificou no Jira: ${eu.status}.`);

  const perfil = (await eu.json()) as { displayName?: string; emailAddress?: string };

  return {
    cloudId: site.id,
    siteUrl: site.url,
    conta: perfil.displayName ?? perfil.emailAddress ?? "conta sem nome",
  };
}
