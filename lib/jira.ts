// Camada de acesso ao Jira. Roda SOMENTE no servidor.
// O token nunca chega ao navegador: esta pasta nao e importada por componente client.

import { AsyncLocalStorage } from "node:async_hooks";

// Credencial de UMA pessoa, vinda do OAuth, valendo so dentro de comCredencial.
// Existe porque o cockpit publico continua lendo com o token do ambiente,
// enquanto o cron le com a conta que a pessoa conectou em Integracoes. Passar a
// credencial por parametro exigiria mudar a assinatura de toda funcao daqui e
// de quem as chama; o contexto assincrono troca a origem sem tocar em nenhuma.
type Injetada = { token: string; cloudId: string };
const contexto = new AsyncLocalStorage<Injetada>();

/** Roda `fn` usando a credencial OAuth de alguem, em vez da do ambiente. */
export function comCredencial<T>(cred: Injetada, fn: () => Promise<T>): Promise<T> {
  return contexto.run(cred, fn);
}

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

/** Credencial injetada manda; sem ela, vale a do ambiente. */
function modo(): "bearer" | "basic" {
  return contexto.getStore() ? "bearer" : MODO_AUTH;
}

function base(): string {
  const injetada = contexto.getStore();
  if (injetada) return `https://api.atlassian.com/ex/jira/${injetada.cloudId}`;
  return BASE;
}

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
  const injetada = contexto.getStore();
  if (injetada) return `Bearer ${injetada.token}`;
  if (MODO_AUTH === "bearer") return `Bearer ${TOKEN}`;
  return "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
}

async function jira(caminho: string, corpo: unknown): Promise<any> {
  const res = await fetch(`${base()}${caminho}`, {
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
      `Jira respondeu ${res.status} em ${caminho} (auth ${modo()}). ${texto.slice(0, 200)}`,
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
  const res = await fetch(`${base()}/rest/api/3/myself`, {
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

export type SomaTempo = {
  estimadoH: number;
  gastoH: number;
  itens: number;
  /** Só os itens que têm estimativa E apontamento. É a ÚNICA base honesta para
   *  comparar previsto contra realizado: somar o gasto de todo mundo contra o
   *  estimado de quem estimou infla a razão, porque quem apontou sem estimar
   *  entra no numerador e não no denominador. Medido no escopo: a razão
   *  agregada dava 1,72x e a pareada dá 0,91x. */
  pareado: { estimadoH: number; gastoH: number; itens: number };
};

// Soma estimativa original e tempo apontado percorrendo TODAS as paginas.
// So faz sentido em SUB-TAREFA: na historia esses campos vem nulos, porque
// a estimativa mora um nivel abaixo.
export async function somarTempo(jql: string): Promise<SomaTempo> {
  let token: string | undefined;
  let estimado = 0;
  let gasto = 0;
  let itens = 0;
  let parEstimado = 0;
  let parGasto = 0;
  let parItens = 0;
  do {
    const r = await jira("/rest/api/3/search/jql", {
      jql,
      maxResults: 100,
      fields: ["timeoriginalestimate", "timespent"],
      nextPageToken: token,
    });
    for (const item of r?.issues ?? []) {
      const e = item?.fields?.timeoriginalestimate ?? 0;
      const g = item?.fields?.timespent ?? 0;
      estimado += e;
      gasto += g;
      itens += 1;
      if (e > 0 && g > 0) {
        parEstimado += e;
        parGasto += g;
        parItens += 1;
      }
    }
    token = r?.nextPageToken;
  } while (token);
  return {
    estimadoH: estimado / 3600,
    gastoH: gasto / 3600,
    itens,
    pareado: { estimadoH: parEstimado / 3600, gastoH: parGasto / 3600, itens: parItens },
  };
}

export type Periodo = { inicio: string | null; ultimaMexida: string | null };

// Desde quando os dados existem, e quando o escopo foi mexido pela ultima vez.
// Sai do proprio Jira, ordenando por data e pegando o primeiro: nada de data
// escrita a mao, que envelhece calada.
export async function periodo(jql: string): Promise<Periodo> {
  const um = async (ordem: string, campo: "created" | "updated") => {
    const r = await jira("/rest/api/3/search/jql", {
      jql: `${jql} ORDER BY ${ordem}`,
      maxResults: 1,
      fields: [campo],
    });
    return r?.issues?.[0]?.fields?.[campo] ?? null;
  };
  const [inicio, ultimaMexida] = await Promise.all([
    um("created ASC", "created"),
    um("updated DESC", "updated"),
  ]);
  return { inicio, ultimaMexida };
}

export type RefinoVsEstimativa = {
  refinadas: number;
  comEstimativa: number;
  semEstimativa: number;
};

// "Refinada" e "estimada" sao coisas diferentes e o painel precisa mostrar isso
// com numero, nao com opiniao. Cruza as historias marcadas Refinado = Sim com
// as sub-tarefas delas, e conta quantas nao tem NENHUMA sub-tarefa estimada.
// O `Refinado` so responde pelo id do campo; pedir por nome devolve vazio em
// silencio e faz parecer que ninguem refinou nada.
export async function refinoVsEstimativa(
  jqlRefinadas: string,
  jqlSubtarefas: string,
  campoRefinado: string,
): Promise<RefinoVsEstimativa> {
  const paginar = async (jql: string, fields: string[]) => {
    let token: string | undefined;
    const itens: any[] = [];
    do {
      const r = await jira("/rest/api/3/search/jql", {
        jql,
        maxResults: 100,
        fields,
        nextPageToken: token,
      });
      itens.push(...(r?.issues ?? []));
      token = r?.nextPageToken;
    } while (token);
    return itens;
  };

  const [historias, subs] = await Promise.all([
    paginar(jqlRefinadas, [campoRefinado]),
    paginar(jqlSubtarefas, ["timeoriginalestimate", "parent"]),
  ]);

  const paiTemEstimativa = new Set<string>();
  for (const s of subs) {
    const pai = s?.fields?.parent?.key;
    if (pai && (s?.fields?.timeoriginalestimate ?? 0) > 0) paiTemEstimativa.add(pai);
  }

  let comEstimativa = 0;
  for (const hist of historias) if (paiTemEstimativa.has(hist.key)) comEstimativa += 1;

  return {
    refinadas: historias.length,
    comEstimativa,
    semEstimativa: historias.length - comEstimativa,
  };
}

export type Faixa = { nome: string; de: number; ate: number; n: number; mediaH: number };
export type Panorama = {
  subtarefas: { total: number; abertas: number; abertasComEstimativa: number };
  tempo: { estimadoH: number; gastoH: number };
  pareado: { estimadoH: number; gastoH: number; itens: number };
  restanteEstimadoH: number;
  refino: { refinadas: number; comEstimativa: number; semEstimativa: number };
  regua: { faixas: Faixa[]; historiasFechadas: number; mediaH: number; medianaH: number };
  projecao: { historiasAbertas: number; porMediaH: number; porMedianaH: number };
};

// UMA varredura das sub-tarefas e UMA das historias, e tudo sai daqui.
// Antes eram tres paginacoes separadas de 600+ itens, o que na Vercel estoura o
// tempo da funcao. Alem de rapido, garante que todo numero da tela olhou
// exatamente a mesma foto do Jira.
export async function panorama(
  jqlSubtarefas: string,
  jqlHistorias: string,
  jqlRefinadas: string,
  campoRefinado: string,
  limites: { pp: number; p: number; m: number },
): Promise<Panorama> {
  const paginar = async (jql: string, fields: string[]) => {
    let token: string | undefined;
    const itens: any[] = [];
    do {
      const r = await jira("/rest/api/3/search/jql", {
        jql,
        maxResults: 100,
        fields,
        nextPageToken: token,
      });
      itens.push(...(r?.issues ?? []));
      token = r?.nextPageToken;
    } while (token);
    return itens;
  };

  const [subs, historias] = await Promise.all([
    paginar(jqlSubtarefas, ["timeoriginalestimate", "timespent", "status", "parent"]),
    paginar(jqlHistorias, ["status", campoRefinado]),
  ]);

  const fechado = (i: any) => i?.fields?.status?.statusCategory?.key === "done";

  let estimado = 0;
  let gasto = 0;
  let parEst = 0;
  let parGasto = 0;
  let parItens = 0;
  let abertas = 0;
  let abertasComEst = 0;
  let restante = 0;
  const porPai: Record<string, { gasto: number; n: number; fechadas: number; temEst: boolean }> =
    {};

  for (const s of subs) {
    const e = s?.fields?.timeoriginalestimate ?? 0;
    const g = s?.fields?.timespent ?? 0;
    estimado += e;
    gasto += g;
    const fim = fechado(s);
    if (fim && e > 0 && g > 0) {
      parEst += e;
      parGasto += g;
      parItens += 1;
    }
    if (!fim) {
      abertas += 1;
      if (e > 0) {
        abertasComEst += 1;
        restante += e;
      }
    }
    const pai = s?.fields?.parent?.key;
    if (pai) {
      porPai[pai] ??= { gasto: 0, n: 0, fechadas: 0, temEst: false };
      porPai[pai].gasto += g;
      porPai[pai].n += 1;
      if (fim) porPai[pai].fechadas += 1;
      if (e > 0) porPai[pai].temEst = true;
    }
  }

  // Refino contra estimativa: refinada NAO quer dizer estimada.
  let refinadas = 0;
  let refComEst = 0;
  let historiasAbertas = 0;
  const custoFechadas: number[] = [];
  for (const hist of historias) {
    if (!fechado(hist)) historiasAbertas += 1;
    if (hist?.fields?.[campoRefinado]?.value === "Sim") {
      refinadas += 1;
      if (porPai[hist.key]?.temEst) refComEst += 1;
    }
    // Custo real de uma historia so vale quando TODAS as sub-tarefas dela
    // fecharam; senao o apontamento esta pela metade e puxa a regua para baixo.
    const p = porPai[hist.key];
    if (p && p.n > 0 && p.fechadas === p.n && p.gasto > 0) custoFechadas.push(p.gasto / 3600);
  }

  custoFechadas.sort((a, b) => a - b);
  const defs = [
    { nome: "PP", de: 0, ate: limites.pp },
    { nome: "P", de: limites.pp, ate: limites.p },
    { nome: "M", de: limites.p, ate: limites.m },
    { nome: "G", de: limites.m, ate: Infinity },
  ];
  const faixas: Faixa[] = defs.map((d) => {
    const v = custoFechadas.filter((x) => x > d.de && x <= d.ate);
    return {
      nome: d.nome,
      de: d.de,
      ate: d.ate,
      n: v.length,
      mediaH: v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0,
    };
  });
  const mediaH = custoFechadas.length
    ? custoFechadas.reduce((s, x) => s + x, 0) / custoFechadas.length
    : 0;
  const medianaH = custoFechadas.length ? custoFechadas[Math.floor(custoFechadas.length / 2)] : 0;

  return {
    subtarefas: { total: subs.length, abertas, abertasComEstimativa: abertasComEst },
    tempo: { estimadoH: estimado / 3600, gastoH: gasto / 3600 },
    pareado: { estimadoH: parEst / 3600, gastoH: parGasto / 3600, itens: parItens },
    restanteEstimadoH: restante / 3600,
    refino: { refinadas, comEstimativa: refComEst, semEstimativa: refinadas - refComEst },
    regua: { faixas, historiasFechadas: custoFechadas.length, mediaH, medianaH },
    // Previsao por classe de referencia: se as historias que faltam custarem o
    // mesmo que as que ja fecharam, o esforco restante e este. NAO depende de
    // ninguem ter estimado nada, e por isso e a unica projecao que hoje cobre o
    // escopo inteiro em vez de 47% dele.
    projecao: {
      historiasAbertas,
      porMediaH: historiasAbertas * mediaH,
      porMedianaH: historiasAbertas * medianaH,
    },
  };
}
