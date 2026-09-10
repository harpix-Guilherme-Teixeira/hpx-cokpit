/** Como um número vira texto na tela.
 *
 *  Isto é um arquivo próprio porque a mesma formatação roda em três lugares: na
 *  pré-visualização do construtor, no painel público e na grade de dados. Três
 *  cópias divergiriam, e divergência de formatação vira discussão sobre se o
 *  número mudou. */

export type Formato = "inteiro" | "decimal" | "porcentagem" | "horas" | "moeda" | "texto";

export const ROTULO_FORMATO: Record<Formato, string> = {
  inteiro: "Número inteiro",
  decimal: "Número com decimais",
  porcentagem: "Porcentagem",
  horas: "Horas",
  moeda: "Reais",
  texto: "Texto",
};

export const EXEMPLO_FORMATO: Record<Formato, string> = {
  inteiro: "254",
  decimal: "43,5",
  porcentagem: "87,0%",
  horas: "109,5h",
  moeda: "R$ 1.240,00",
  texto: "qualquer texto",
};

export type Apresentacao = {
  formato?: Formato;
  casas?: number;
  /** Sufixo livre, para o que não cabe nos formatos fechados. */
  unidade?: string;
  prefixo?: string;
};

const CASAS_PADRAO: Record<Formato, number> = {
  inteiro: 0,
  decimal: 1,
  porcentagem: 1,
  horas: 1,
  moeda: 2,
  texto: 0,
};

/** Formata para exibição. `null` vira traço, NUNCA zero.
 *
 *  Essa é a regra que mais importa aqui: zero é uma resposta, e mostrar zero
 *  quando a conta não tinha base transforma "não sei" em "não teve". */
export function formatar(valor: number | null | undefined, a: Apresentacao = {}): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";

  const formato = a.formato ?? "inteiro";
  const casas = a.casas ?? CASAS_PADRAO[formato];

  const numero = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

  const corpo = (() => {
    switch (formato) {
      case "porcentagem":
        // Espera o valor JÁ em 0 a 100. Multiplicar por cem aqui quebraria
        // quem digitou 87 querendo dizer 87%.
        return `${numero}%`;
      case "horas":
        return `${numero}h`;
      case "moeda":
        return `R$ ${numero}`;
      default:
        return numero;
    }
  })();

  const comPrefixo = a.prefixo ? `${a.prefixo} ${corpo}` : corpo;
  return a.unidade ? `${comPrefixo} ${a.unidade}` : comPrefixo;
}

/** Variação percentual, já com sinal e seta. `null` quando não há base. */
export function formatarVariacao(pct: number | null): { texto: string; sobe: boolean } | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  const arredondado = Math.round(pct);
  if (arredondado === 0) return { texto: "igual", sobe: true };
  return {
    texto: `${arredondado > 0 ? "▲" : "▼"} ${Math.abs(arredondado)}%`,
    sobe: arredondado > 0,
  };
}
