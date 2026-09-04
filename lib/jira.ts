// Camada de acesso ao Jira. Roda SOMENTE no servidor.
// O token nunca chega ao navegador: esta pasta nao e importada por componente client.

const BASE_CONFIG = (process.env.JIRA_BASE_URL ?? "").replace(/\/+$/, "");
const EMAIL = process.env.JIRA_EMAIL ?? "";
const TOKEN_BRUTO = (process.env.JIRA_API_TOKEN ?? "").trim();
const CLOUD_ID = (process.env.JIRA_CLOUD_ID ?? "").trim();

// O Jira aceita duas autenticacoes e elas NAO batem no mesmo endereco:
//
// - API token (prefixo ATATT/ATCTT): vai em Basic junto com o e-mail, contra o
//   dominio do site, https://<site>.atlassian.net
// - Bearer de OAuth 3LO: vai sozinho no cabecalho, e precisa bater em
//   https://api.atlassian.com/ex/jira/<cloudId>, NAO no dominio do site.
//
// Colar o token errado no lugar errado devolve 401 sem explicar por que, entao
// o modo e detectado aqui e a base muda junto.
const ehBearer = /^bearer\s+/i.test(TOKEN_BRUTO) || TOKEN_BRUTO.startsWith("eyJ");
const TOKEN = TOKEN_BRUTO.replace(/^bearer\s+/i, "");

export const MODO_AUTH: "bearer" | "basic" = ehBearer ? "bearer" : "basic";

const BASE =
  MODO_AUTH === "bearer" && CLOUD_ID
    ? `https://api.atlassian.com/ex/jira/${CLOUD_ID}`
    : BASE_CONFIG;

export function credenciaisAusentes(): string[] {
  const faltando: string[] = [];
  if (!TOKEN) faltando.push("JIRA_API_TOKEN");
  if (MODO_AUTH === "bearer") {
    if (!CLOUD_ID) faltando.push("JIRA_CLOUD_ID (obrigatório com token Bearer)");
  } else {
    if (!BASE_CONFIG) faltando.push("JIRA_BASE_URL");
    if (!EMAIL) faltando.push("JIRA_EMAIL");
  }
  return faltando;
}

function autorizacao(): string {
  if (MODO_AUTH === "bearer") return `Bearer ${TOKEN}`;
  return "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
}

async function jira(caminho: string, corpo: unknown): Promise<any> {
  const res = await fetch(`${BASE}${caminho}`, {
    method: "POST",
    headers: {
      Authorization: autorizacao(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(
      `Jira respondeu ${res.status} em ${caminho} (auth ${MODO_AUTH}). ${texto.slice(0, 200)}`,
    );
  }
  return res.json();
}

// PROVA DE VIDA DA CREDENCIAL, e ela nao e opcional.
//
// O endpoint de busca do Jira NAO devolve 401 para quem nao esta autenticado:
// ele trata a chamada como visitante anonimo e responde 200 com zero resultado.
// Ou seja, credencial quebrada e projeto vazio sao indistinguiveis pela busca.
// `/myself` e o unico que falha de verdade, entao ele roda ANTES de qualquer
// contagem e o painel so exibe numero depois que alguem se identificou.
export async function quemSou(): Promise<string> {
  const res = await fetch(`${BASE}/rest/api/3/myself`, {
    headers: { Authorization: autorizacao(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(
      `A credencial nao autentica: /myself respondeu ${res.status} (auth ${MODO_AUTH}). ` +
        `Enquanto isso a busca responde 200 com zero, entao qualquer numero aqui seria mentira. ` +
        texto.slice(0, 160),
    );
  }
  const eu = await res.json();
  return eu?.displayName ?? eu?.emailAddress ?? "identidade sem nome";
}

// Conta itens de uma JQL.
// Usa o endpoint de contagem aproximada; se ele nao existir nesta instancia,
// cai para paginacao contando de verdade. Um erro aqui SOBE, nunca vira zero.
export async function contar(jql: string): Promise<number> {
  try {
    const r = await jira("/rest/api/3/search/approximate-count", { jql });
    if (typeof r?.count === "number") return r.count;
    throw new Error("resposta sem campo count");
  } catch (e) {
    // 401 e 403 sao problema de credencial, nao de endpoint: nao adianta cair
    // para a paginacao, ela vai falhar igual e esconder a causa.
    if (e instanceof Error && /respondeu 40[13]/.test(e.message)) throw e;
    let token: string | undefined;
    let total = 0;
    do {
      const r = await jira("/rest/api/3/search/jql", {
        jql,
        maxResults: 100,
        fields: ["key"],
        nextPageToken: token,
      });
      total += (r?.issues ?? []).length;
      token = r?.nextPageToken;
    } while (token);
    return total;
  }
}

export type SomaTempo = { estimadoH: number; gastoH: number; itens: number };

// Soma estimativa original e tempo apontado percorrendo TODAS as paginas.
// So faz sentido em SUB-TAREFA: na historia esses campos vem nulos, porque
// a estimativa mora um nivel abaixo.
export async function somarTempo(jql: string): Promise<SomaTempo> {
  let token: string | undefined;
  let estimado = 0;
  let gasto = 0;
  let itens = 0;
  do {
    const r = await jira("/rest/api/3/search/jql", {
      jql,
      maxResults: 100,
      fields: ["timeoriginalestimate", "timespent"],
      nextPageToken: token,
    });
    for (const item of r?.issues ?? []) {
      estimado += item?.fields?.timeoriginalestimate ?? 0;
      gasto += item?.fields?.timespent ?? 0;
      itens += 1;
    }
    token = r?.nextPageToken;
  } while (token);
  return { estimadoH: estimado / 3600, gastoH: gasto / 3600, itens };
}
