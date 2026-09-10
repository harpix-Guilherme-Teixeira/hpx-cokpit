/** O motor do painel: pega registros crus e devolve o número do card.
 *
 *  Tudo aqui é função pura, sem rede e sem Supabase, por dois motivos. Primeiro,
 *  dá para testar sem banco. Segundo, e mais importante: o mesmo código roda no
 *  construtor, para a pré-visualização, e no painel público. Se fossem duas
 *  implementações, a pré-visualização mostraria um número e o painel outro, e
 *  ninguém confiaria em nenhum dos dois.
 *
 *  Uma regra atravessa o arquivo inteiro: NADA aqui devolve zero para dizer
 *  "não deu". Conta sem base devolve `null`, e a tela mostra um traço. Zero é
 *  uma resposta, e resposta errada em painel vira decisão errada. */

import type {
  Campo,
  ConfigCard,
  Filtro,
  Metrica,
  PresetPeriodo,
  Registro,
  TipoCampo,
} from "./tipos";

export type Periodo = { inicio: string; fim: string };

/** ------------------------------------------------------------------
 *  Leitura de valor
 *  ------------------------------------------------------------------ */

function bruto(r: Registro, chave: string) {
  return r.valores?.[chave];
}

/** Valor comparável, já no tipo do campo. Devolve `null` quando o campo está
 *  vazio ou não converte, e quem chama decide o que fazer com isso. Converter
 *  na marra transformaria texto inválido em zero, que é o defeito clássico. */
function comoTipo(valor: unknown, tipo: TipoCampo): string | number | boolean | null {
  if (valor === null || valor === undefined || valor === "") return null;

  switch (tipo) {
    case "numero": {
      const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "data": {
      const t = Date.parse(String(valor));
      return Number.isFinite(t) ? t : null;
    }
    case "booleano": {
      if (typeof valor === "boolean") return valor;
      const s = String(valor).trim().toLowerCase();
      if (["true", "sim", "1"].includes(s)) return true;
      if (["false", "nao", "não", "0"].includes(s)) return false;
      return null;
    }
    default:
      return String(valor);
  }
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ------------------------------------------------------------------
 *  Filtros
 *  ------------------------------------------------------------------ */

function passaNoFiltro(r: Registro, f: Filtro, campos: Map<string, Campo>): boolean {
  const campo = campos.get(f.campo);
  if (!campo) return true; // filtro apontando para campo apagado não filtra nada

  const v = comoTipo(bruto(r, f.campo), campo.tipo);

  if (f.operador === "vazio") return v === null;
  if (f.operador === "naoVazio") return v !== null;
  if (v === null) return false; // vazio não satisfaz comparação nenhuma

  const alvo = comoTipo(f.valor, campo.tipo);
  const ate = comoTipo(f.ate, campo.tipo);

  switch (f.operador) {
    case "igual":
      return typeof v === "string" && typeof alvo === "string"
        ? semAcento(v) === semAcento(alvo)
        : v === alvo;
    case "diferente":
      return typeof v === "string" && typeof alvo === "string"
        ? semAcento(v) !== semAcento(alvo)
        : v !== alvo;
    case "contem":
      return semAcento(String(v)).includes(semAcento(String(f.valor ?? "")));
    case "comeca":
      return semAcento(String(v)).startsWith(semAcento(String(f.valor ?? "")));
    case "em": {
      const lista = Array.isArray(f.valor) ? f.valor : String(f.valor ?? "").split(",");
      return lista.map((x) => semAcento(String(x).trim())).includes(semAcento(String(v)));
    }
    case "maior":
      return alvo !== null && v > alvo;
    case "maiorIgual":
      return alvo !== null && v >= alvo;
    case "menor":
      return alvo !== null && v < alvo;
    case "menorIgual":
      return alvo !== null && v <= alvo;
    case "entre":
      return alvo !== null && ate !== null && v >= alvo && v <= ate;
    default:
      return true;
  }
}

export function aplicarFiltros(
  registros: Registro[],
  filtros: Filtro[] | undefined,
  campos: Campo[],
): Registro[] {
  if (!filtros || filtros.length === 0) return registros;
  const mapa = new Map(campos.map((c) => [c.chave, c]));
  return registros.filter((r) => filtros.every((f) => passaNoFiltro(r, f, mapa)));
}

/** Recorta pelo período do painel. Card sem `campoData` NÃO é filtrado, e quem
 *  desenha a tela precisa dizer isso, senão a pessoa mexe no período e acha que
 *  o número reagiu. */
export function aplicarPeriodo(
  registros: Registro[],
  campoData: string | undefined,
  periodo: Periodo | null,
  campos: Campo[],
): Registro[] {
  if (!campoData || !periodo) return registros;
  const campo = campos.find((c) => c.chave === campoData);
  if (!campo) return registros;

  const de = Date.parse(`${periodo.inicio}T00:00:00`);
  const ate = Date.parse(`${periodo.fim}T23:59:59.999`);

  return registros.filter((r) => {
    const t = comoTipo(bruto(r, campoData), "data");
    return typeof t === "number" && t >= de && t <= ate;
  });
}

/** ------------------------------------------------------------------
 *  Métricas
 *  ------------------------------------------------------------------ */

export function calcular(
  registros: Registro[],
  metrica: Metrica,
  campoValor: string | undefined,
  campos: Campo[],
): number | null {
  if (metrica === "contagem") return registros.length;

  if (metrica === "distintos") {
    if (!campoValor) return null;
    const vistos = new Set<string>();
    for (const r of registros) {
      const v = bruto(r, campoValor);
      if (v !== null && v !== undefined && v !== "") vistos.add(String(v));
    }
    return vistos.size;
  }

  if (!campoValor) return null;
  const campo = campos.find((c) => c.chave === campoValor);
  if (!campo) return null;

  const numeros = registros
    .map((r) => comoTipo(bruto(r, campoValor), campo.tipo))
    .filter((v): v is number => typeof v === "number");

  // Nenhum registro com valor: não existe soma nem média. `null`, nunca zero.
  if (numeros.length === 0) return null;

  switch (metrica) {
    case "soma":
      return numeros.reduce((a, b) => a + b, 0);
    case "media":
      return numeros.reduce((a, b) => a + b, 0) / numeros.length;
    case "minimo":
      return Math.min(...numeros);
    case "maximo":
      return Math.max(...numeros);
    case "ultimo":
      return numeros[numeros.length - 1];
    default:
      return null;
  }
}

/** Agrupa por categoria. Vazio vira uma fatia própria chamada "sem valor", em
 *  vez de sumir: item sem categoria some do gráfico e o total deixa de fechar
 *  com o card de contagem ao lado, e ninguém entende por quê. */
export function agrupar(
  registros: Registro[],
  campoCategoria: string,
  metrica: Metrica,
  campoValor: string | undefined,
  campos: Campo[],
): { categoria: string; valor: number }[] {
  const baldes = new Map<string, Registro[]>();

  for (const r of registros) {
    const v = bruto(r, campoCategoria);
    const chave = v === null || v === undefined || v === "" ? "sem valor" : String(v);
    const lista = baldes.get(chave);
    if (lista) lista.push(r);
    else baldes.set(chave, [r]);
  }

  return [...baldes.entries()]
    .map(([categoria, lista]) => ({
      categoria,
      valor: calcular(lista, metrica, campoValor, campos) ?? 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/** Série no tempo, por dia. */
export function serie(
  registros: Registro[],
  campoData: string,
  metrica: Metrica,
  campoValor: string | undefined,
  campos: Campo[],
): { dia: string; valor: number }[] {
  const baldes = new Map<string, Registro[]>();

  for (const r of registros) {
    const t = comoTipo(bruto(r, campoData), "data");
    if (typeof t !== "number") continue;
    const dia = new Date(t).toISOString().slice(0, 10);
    const lista = baldes.get(dia);
    if (lista) lista.push(r);
    else baldes.set(dia, [r]);
  }

  return [...baldes.entries()]
    .map(([dia, lista]) => ({ dia, valor: calcular(lista, metrica, campoValor, campos) ?? 0 }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/** ------------------------------------------------------------------
 *  Períodos
 *  ------------------------------------------------------------------ */

const dia = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function periodoDoPreset(preset: PresetPeriodo, hoje = new Date()): Periodo | null {
  const t = Date.parse(iso(hoje.getTime()) + "T12:00:00");

  switch (preset) {
    case "7d":
      return { inicio: iso(t - 6 * dia), fim: iso(t) };
    case "30d":
      return { inicio: iso(t - 29 * dia), fim: iso(t) };
    case "estaSemana": {
      // Semana começa na segunda. `getDay()` devolve 0 para domingo, por isso o
      // ajuste: sem ele, domingo cairia na semana seguinte.
      const d = new Date(t);
      const desloca = (d.getDay() + 6) % 7;
      const segunda = t - desloca * dia;
      return { inicio: iso(segunda), fim: iso(segunda + 6 * dia) };
    }
    case "semanaPassada": {
      const d = new Date(t);
      const desloca = (d.getDay() + 6) % 7;
      const segunda = t - desloca * dia - 7 * dia;
      return { inicio: iso(segunda), fim: iso(segunda + 6 * dia) };
    }
    case "esteMes": {
      const d = new Date(t);
      const primeiro = new Date(d.getFullYear(), d.getMonth(), 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { inicio: iso(primeiro.getTime()), fim: iso(ultimo.getTime()) };
    }
    default:
      return null;
  }
}

/** A janela anterior de MESMO TAMANHO, colada na atual. Comparar sete dias com
 *  um mês inteiro é o tipo de erro que ninguém percebe olhando a porcentagem. */
export function janelaAnterior(p: Periodo): Periodo {
  const de = Date.parse(`${p.inicio}T12:00:00`);
  const ate = Date.parse(`${p.fim}T12:00:00`);
  const tamanho = Math.round((ate - de) / dia) + 1;
  return { inicio: iso(de - tamanho * dia), fim: iso(de - dia) };
}

/** Variação percentual. Devolve `null` quando não há base de comparação, para a
 *  tela escrever "novo" em vez de inventar um crescimento infinito. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null) return null;
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/** ------------------------------------------------------------------
 *  O que a tela consome
 *  ------------------------------------------------------------------ */

export type ResultadoCard = {
  valor: number | null;
  anterior: number | null;
  variacaoPct: number | null;
  linhas: Registro[];
  categorias: { categoria: string; valor: number }[];
  pontos: { dia: string; valor: number }[];
  /** Verdadeiro quando o card não tem campo de data e por isso ignora o período
   *  do painel. A tela precisa dizer isso em vez de deixar parecer filtrado. */
  ignoraPeriodo: boolean;
};

export function resolverCard(
  config: ConfigCard,
  tipo: string,
  registros: Registro[],
  campos: Campo[],
  periodo: Periodo | null,
): ResultadoCard {
  const filtrados = aplicarFiltros(registros, config.filtros, campos);
  const ignoraPeriodo = !config.campoData;
  const naJanela = aplicarPeriodo(filtrados, config.campoData, periodo, campos);

  const metrica: Metrica = config.metrica ?? "contagem";
  const valor = calcular(naJanela, metrica, config.campoValor, campos);

  let anterior: number | null = null;
  if (config.comparar && config.campoData && periodo) {
    const antes = aplicarPeriodo(filtrados, config.campoData, janelaAnterior(periodo), campos);
    anterior = calcular(antes, metrica, config.campoValor, campos);
  }

  return {
    valor,
    anterior,
    variacaoPct: variacao(valor, anterior),
    linhas: naJanela,
    categorias:
      tipo === "barra" || tipo === "pizza"
        ? config.campoCategoria
          ? agrupar(naJanela, config.campoCategoria, metrica, config.campoValor, campos)
          : []
        : [],
    pontos:
      tipo === "linha" && config.campoData
        ? serie(naJanela, config.campoData, metrica, config.campoValor, campos)
        : [],
    ignoraPeriodo,
  };
}
