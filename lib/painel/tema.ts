/** Tema do painel: tudo que é aparência e nada que é dado.
 *
 *  Os dois presets abaixo NÃO foram inventados. "harpix claro" é uma cópia
 *  literal dos tokens de `app/globals.css`, o cockpit que está publicado hoje,
 *  e "harpix escuro" é a paleta do cockpit da semana. Quem escolher um preset
 *  recebe exatamente a tela que já existe, e a partir dela muda o que quiser.
 *
 *  Toda cor vive aqui como variável CSS. A tela pública aplica o tema num
 *  `style` no contêiner, então trocar cor é trocar valor, nunca reescrever
 *  classe: é isso que permite mexer e ver na hora, como no editor de tema de
 *  loja. */

export type Tema = {
  preset: string;

  /** Cores. Nomes em português para casar com o resto do código, e os valores
   *  são hex de seis dígitos porque é o que o seletor de cor do navegador
   *  entrega. */
  acento: string;
  acentoSuave: string;
  fundo: string;
  superficie: string;
  superficieAlt: string;
  texto: string;
  textoSuave: string;
  textoFraco: string;
  borda: string;
  bordaForte: string;
  positivo: string;
  negativo: string;
  atencao: string;

  /** Cabeçalho do painel público. */
  headerFundo: string;
  headerTexto: string;
  headerFixo: boolean;
  mostrarMarca: boolean;
  marca: string;

  /** Forma. */
  raio: number;
  sombra: "nenhuma" | "sutil" | "media";
  densidade: "compacta" | "confortavel";
  fonteTitulo: string;
  fonteCorpo: string;

  /** Rodapé com a frase de leitura. Some quando vazio. */
  rodape: string;
};

export const TEMA_CLARO: Tema = {
  preset: "harpix-claro",
  acento: "#ef5727",
  acentoSuave: "#fef4f1",
  fundo: "#f4f4f6",
  superficie: "#ffffff",
  superficieAlt: "#fafafa",
  texto: "#0a0a0a",
  textoSuave: "#45454a",
  textoFraco: "#76767e",
  borda: "#e5e5e5",
  bordaForte: "#cccccc",
  positivo: "#00a781",
  negativo: "#ff3d41",
  atencao: "#fbbc75",
  headerFundo: "#0a0a0a",
  headerTexto: "#ffffff",
  headerFixo: true,
  mostrarMarca: true,
  marca: "harpix",
  raio: 14,
  sombra: "sutil",
  densidade: "confortavel",
  fonteTitulo: "Baloo 2",
  fonteCorpo: "Geist",
  rodape: "",
};

export const TEMA_ESCURO: Tema = {
  ...TEMA_CLARO,
  preset: "harpix-escuro",
  fundo: "#0a0a0a",
  superficie: "#131316",
  superficieAlt: "#1a1a1f",
  texto: "#f7f7f8",
  textoSuave: "#a1a1ac",
  textoFraco: "#6e6e7a",
  borda: "#26262c",
  bordaForte: "#34343c",
  acentoSuave: "rgba(239, 87, 39, 0.14)",
  positivo: "#34d399",
  negativo: "#ff5a5e",
  headerFundo: "#0a0a0a",
  headerTexto: "#ffffff",
};

export const PRESETS: { chave: string; nome: string; descricao: string; tema: Tema }[] = [
  {
    chave: "harpix-claro",
    nome: "harpix claro",
    descricao: "Igual ao cockpit publicado hoje. Fundo cinza, cards brancos, header preto.",
    tema: TEMA_CLARO,
  },
  {
    chave: "harpix-escuro",
    nome: "harpix escuro",
    descricao: "Paleta do cockpit da semana. Para projeção em reunião.",
    tema: TEMA_ESCURO,
  },
];

const SOMBRAS: Record<Tema["sombra"], string> = {
  nenhuma: "none",
  sutil: "0 1px 2px -1px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.1)",
  media: "0 4px 16px 4px rgba(0,0,0,.08)",
};

/** Vira o `style` que o contêiner do painel recebe. É o que faz a prévia mudar
 *  na hora: nenhum CSS é recompilado, só a variável muda de valor. */
export function variaveisDoTema(t: Tema): React.CSSProperties {
  return {
    "--pnl-acento": t.acento,
    "--pnl-acento-suave": t.acentoSuave,
    "--pnl-fundo": t.fundo,
    "--pnl-superficie": t.superficie,
    "--pnl-superficie-alt": t.superficieAlt,
    "--pnl-texto": t.texto,
    "--pnl-texto-suave": t.textoSuave,
    "--pnl-texto-fraco": t.textoFraco,
    "--pnl-borda": t.borda,
    "--pnl-borda-forte": t.bordaForte,
    "--pnl-positivo": t.positivo,
    "--pnl-negativo": t.negativo,
    "--pnl-atencao": t.atencao,
    "--pnl-header-fundo": t.headerFundo,
    "--pnl-header-texto": t.headerTexto,
    "--pnl-raio": `${t.raio}px`,
    "--pnl-sombra": SOMBRAS[t.sombra],
    "--pnl-gap": t.densidade === "compacta" ? "10px" : "14px",
    "--pnl-pad": t.densidade === "compacta" ? "16px 18px" : "22px 24px",
    "--pnl-fonte-titulo": `"${t.fonteTitulo}", system-ui, sans-serif`,
    "--pnl-fonte-corpo": `"${t.fonteCorpo}", system-ui, sans-serif`,
  } as React.CSSProperties;
}

/** Preenche o que faltar com o preset claro. Painel criado antes de um campo
 *  novo existir não pode quebrar a tela por causa de uma chave ausente. */
export function comPadrao(parcial: Partial<Tema> | null | undefined): Tema {
  return { ...TEMA_CLARO, ...(parcial ?? {}) };
}
