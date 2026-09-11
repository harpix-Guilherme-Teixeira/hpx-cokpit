import type { Campo } from "./tipos";

export type Conversao = { ok: true; valor: unknown } | { ok: false; erro: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Número escrito por gente. Aceita "1.234,5", "1234.5", "87%", "R$ 1.240,00",
 *  "109,5h". A regra do separador: se tem vírgula, é pt-BR e o ponto é milhar;
 *  se não tem, o ponto é decimal. "1.234" sem vírgula vira 1.234 e não 1234,
 *  porque é assim que a planilha em inglês exporta, e errar para o outro lado
 *  multiplicaria por mil em silêncio. */
function numero(bruto: string): number | null {
  const limpo = bruto.replace(/r\$|%|h\b/gi, "").replace(/\s/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Data em dd/mm/aaaa ou aaaa-mm-dd, devolvida como aaaa-mm-dd. Confere o dia
 *  de verdade: 31/02 não vira 03/03, que é o que o construtor de Date faz. */
function data(bruto: string): string | null {
  const br = bruto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  let a: number, m: number, d: number;
  if (br) {
    d = Number(br[1]);
    m = Number(br[2]);
    a = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
  } else if (iso) {
    a = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    return null;
  }

  const t = new Date(Date.UTC(a, m - 1, d));
  if (t.getUTCFullYear() !== a || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function booleano(bruto: string): boolean | null {
  const s = semAcento(bruto);
  if (["sim", "s", "true", "1", "x", "verdadeiro"].includes(s)) return true;
  if (["nao", "n", "false", "0", "falso"].includes(s)) return false;
  return null;
}

/** Converte o texto de uma célula no valor da coluna.
 *
 *  Roda nos dois lados, na prévia da colagem e na gravação no servidor, e é o
 *  mesmo arquivo de propósito: se a prévia usasse uma regra e a gravação outra,
 *  a tela diria "12 linhas válidas" e o banco gravaria 9. */
export function converter(bruto: unknown, campo: Campo): Conversao {
  const texto = bruto === null || bruto === undefined ? "" : String(bruto).trim();

  if (!texto) {
    return campo.obrigatorio
      ? { ok: false, erro: `${campo.nome} é obrigatório` }
      : { ok: true, valor: null };
  }

  switch (campo.tipo) {
    case "numero": {
      const n = numero(texto);
      return n === null
        ? { ok: false, erro: `"${texto}" não é número em ${campo.nome}` }
        : { ok: true, valor: n };
    }
    case "data": {
      const d = data(texto);
      return d === null
        ? { ok: false, erro: `"${texto}" não é data válida em ${campo.nome}, use dd/mm/aaaa` }
        : { ok: true, valor: d };
    }
    case "booleano": {
      const b = booleano(texto);
      return b === null
        ? { ok: false, erro: `"${texto}" não é sim ou não em ${campo.nome}` }
        : { ok: true, valor: b };
    }
    case "opcao": {
      if (campo.opcoes.length === 0) return { ok: true, valor: texto };
      const achada = campo.opcoes.find((o) => semAcento(o) === semAcento(texto));
      // Grava a grafia da lista, não a digitada: "analise" e "Análise" viram a
      // mesma opção, senão o gráfico por categoria mostraria duas fatias.
      return achada
        ? { ok: true, valor: achada }
        : {
            ok: false,
            erro: `"${texto}" não está nas opções de ${campo.nome}: ${campo.opcoes.join(", ")}`,
          };
    }
    default:
      return { ok: true, valor: texto };
  }
}

/** Texto que a célula mostra para editar. O inverso do converter. */
export function paraTexto(valor: unknown, campo: Campo): string {
  if (valor === null || valor === undefined) return "";
  if (campo.tipo === "data" && typeof valor === "string") {
    const [a, m, d] = valor.split("-");
    return d && m && a ? `${d}/${m}/${a}` : valor;
  }
  if (campo.tipo === "numero" && typeof valor === "number") {
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }
  if (campo.tipo === "booleano") return valor ? "sim" : "não";
  return String(valor);
}

/** Lê o que veio do Ctrl+C da planilha: linhas por quebra, células por tab.
 *  Aspas duplas envolvem célula com quebra de linha dentro, que é como Excel e
 *  Sheets exportam texto longo, e cortar ali desalinharia todas as linhas de
 *  baixo. */
export function lerColagem(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"' && texto[i + 1] === '"') {
        celula += '"';
        i += 1;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        celula += c;
      }
    } else if (c === '"' && celula === "") {
      entreAspas = true;
    } else if (c === "\t") {
      linha.push(celula);
      celula = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i += 1;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else {
      celula += c;
    }
  }

  if (celula !== "" || linha.length > 0) {
    linha.push(celula);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/** A primeira linha é cabeçalho quando a maioria das células bate com nome de
 *  coluna. Maioria, e não todas, porque planilha real tem coluna a mais. */
export function primeiraEhCabecalho(primeira: string[], campos: Campo[]): boolean {
  const nomes = new Set(campos.map((c) => semAcento(c.nome)));
  const batem = primeira.filter((c) => nomes.has(semAcento(c))).length;
  return batem > 0 && batem >= Math.ceil(Math.min(primeira.length, campos.length) / 2);
}

/** Qual coluna do conjunto recebe cada coluna colada. Com cabeçalho, casa por
 *  nome; sem, por posição. Coluna colada sem par vira `null` e é ignorada, e a
 *  prévia diz quais. */
export function mapearColunas(
  primeira: string[],
  campos: Campo[],
  temCabecalho: boolean,
): (string | null)[] {
  if (!temCabecalho) return primeira.map((_, i) => campos[i]?.chave ?? null);
  return primeira.map(
    (nome) => campos.find((c) => semAcento(c.nome) === semAcento(nome))?.chave ?? null,
  );
}
