import { converter, lerColagem } from "./converter";
import type { Campo, ColunaDefinicao, Grao, PapelCampo, TipoCampo } from "./tipos";

/** Poucos valores repetidos viram opção. Acima disso é texto livre, e forçar
 *  lista criaria uma opção por nome de conector. */
const LIMITE_OPCOES = 8;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function campoTeste(tipo: TipoCampo): Campo {
  return {
    id: 0,
    conjunto_id: 0,
    chave: "x",
    nome: "x",
    tipo,
    formato: "inteiro",
    casas: 0,
    unidade: null,
    descricao: null,
    opcoes: [],
    obrigatorio: false,
    papel: null,
    ordem: 0,
  };
}

const passa = (valor: string, tipo: TipoCampo) => converter(valor, campoTeste(tipo)).ok;

function casasDecimais(valores: string[]) {
  return valores.reduce((maior, v) => {
    const parte = v.replace(/[^\d,.]/g, "").split(/[,.]/)[1] ?? "";
    return Math.max(maior, Math.min(parte.length, 2));
  }, 0);
}

type TipoInferido = Pick<ColunaDefinicao, "tipo" | "formato" | "casas" | "opcoes">;

/** O tipo sai de TODOS os valores preenchidos, nunca de uma amostra. Uma
 *  célula "n/d" no meio de números faz a coluna virar texto, e isso é o certo:
 *  o palpite fica visível para a pessoa corrigir, em vez de a importação
 *  recusar a linha sem ela entender por quê. */
function inferirTipo(brutos: string[]): TipoInferido {
  const v = brutos.map((s) => s.trim()).filter(Boolean);
  const texto: TipoInferido = { tipo: "texto", formato: "texto", casas: 0, opcoes: [] };
  if (v.length === 0) return texto;

  if (v.every((x) => passa(x, "data"))) {
    return { tipo: "data", formato: "texto", casas: 0, opcoes: [] };
  }

  if (v.every((x) => passa(x, "numero"))) {
    const casas = casasDecimais(v);
    if (v.every((x) => x.includes("%")))
      return { tipo: "numero", formato: "porcentagem", casas, opcoes: [] };
    if (v.every((x) => /r\$/i.test(x)))
      return { tipo: "numero", formato: "moeda", casas: 2, opcoes: [] };
    if (v.every((x) => /h\s*$/i.test(x)))
      return { tipo: "numero", formato: "horas", casas: Math.max(casas, 1), opcoes: [] };
    return { tipo: "numero", formato: casas > 0 ? "decimal" : "inteiro", casas, opcoes: [] };
  }

  if (v.every((x) => passa(x, "booleano"))) {
    return { tipo: "booleano", formato: "texto", casas: 0, opcoes: [] };
  }

  const distintos = [...new Set(v)];
  if (distintos.length <= LIMITE_OPCOES && v.length >= distintos.length * 2) {
    return { tipo: "opcao", formato: "texto", casas: 0, opcoes: distintos };
  }

  return texto;
}

function palpitePapel(nome: string, tipo: TipoCampo, grao: Grao): PapelCampo | undefined {
  const n = semAcento(nome);
  if (tipo === "data") {
    if (/conclu|entreg|resolv|fech|final|termin/.test(n)) return "data_conclusao";
    return grao === "medicao" ? "periodo" : "data_evento";
  }
  if (/status|situa|etapa|fase|estado/.test(n)) return "status";
  if (/respons|dono|owner|quem/.test(n)) return "responsavel";
  return undefined;
}

/** Monta as colunas a partir de uma planilha colada: a primeira linha é o
 *  cabeçalho, o tipo sai dos valores e o papel sai do nome. Devolve também as
 *  linhas, para entrarem junto com o conjunto.
 *
 *  Cada papel aparece uma vez só. Duas colunas de status confundiriam a
 *  sugestão de card, então a segunda fica sem papel e a pessoa decide. */
export function inferirColunas(
  texto: string,
  grao: Grao,
): { colunas: ColunaDefinicao[]; linhas: string[][] } {
  const matriz = lerColagem(texto);
  if (matriz.length === 0) return { colunas: [], linhas: [] };

  const [cabecalho, ...linhas] = matriz;
  const usados = new Set<PapelCampo>();

  const colunas: ColunaDefinicao[] = cabecalho.map((bruto, j) => {
    const nome = bruto.trim() || `Coluna ${j + 1}`;
    const tipo = inferirTipo(linhas.map((l) => l[j] ?? ""));
    const palpite = palpitePapel(nome, tipo.tipo, grao);
    const papel = palpite && !usados.has(palpite) ? palpite : undefined;
    if (papel) usados.add(papel);
    return { nome, ...tipo, obrigatorio: false, papel, origem: j };
  });

  if (grao === "item" && !usados.has("titulo")) {
    const primeiraDeTexto = colunas.find((c) => c.tipo === "texto" && !c.papel);
    if (primeiraDeTexto) primeiraDeTexto.papel = "titulo";
  }

  return { colunas, linhas };
}
