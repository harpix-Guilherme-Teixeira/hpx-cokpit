import type { Formato } from "./formato";

/** Vocabulário do construtor.
 *
 *  O TIPO DO CAMPO é a peça central deste arquivo, e o motivo é medido, não
 *  teórico: num painel anterior, uma consulta que não fechava conta devolvia
 *  zero em silêncio, e zero parece dado. Aqui o tipo decide quais operadores de
 *  filtro e quais métricas o construtor sequer OFERECE, então soma de texto não
 *  chega a existir como opção. O que não aparece no menu não pode ser escolhido
 *  por engano. */

export type TipoCampo = "texto" | "numero" | "data" | "opcao" | "booleano";

export type TipoCard =
  | "numero"
  | "progresso"
  | "barra"
  | "linha"
  | "pizza"
  | "tabela"
  | "lista"
  | "texto";

export type Metrica = "contagem" | "soma" | "media" | "minimo" | "maximo" | "ultimo" | "distintos";

export type Operador =
  | "igual"
  | "diferente"
  | "contem"
  | "comeca"
  | "em"
  | "maior"
  | "maiorIgual"
  | "menor"
  | "menorIgual"
  | "entre"
  | "vazio"
  | "naoVazio";

export type Filtro = {
  campo: string;
  operador: Operador;
  valor?: unknown;
  /** Segundo limite, só para o operador `entre`. */
  ate?: unknown;
};

export type Campo = {
  id: number;
  conjunto_id: number;
  chave: string;
  nome: string;
  /** O que o valor É. Decide filtros e métricas disponíveis. */
  tipo: TipoCampo;
  /** COMO o valor se lê. Mora na coluna e não só no card, senão a mesma coluna
   *  vira porcentagem num painel e contagem noutro, e os dois parecem certos. */
  formato: Formato;
  casas: number;
  unidade: string | null;
  descricao: string | null;
  opcoes: string[];
  obrigatorio: boolean;
  /** O que a coluna representa no item: título, status, datas. É o que deixa o
   *  construtor sugerir "contar por status" em vez de somar toda coluna. */
  papel: PapelCampo | null;
  ordem: number;
};

/** O que é UMA linha. Item: cada linha é uma coisa e a plataforma conta.
 *  Medição: cada linha é o valor de um período e a plataforma só repete. */
export type Grao = "item" | "medicao";

export type Cadencia = "diaria" | "semanal" | "quinzenal" | "mensal" | "sob_demanda";

export type PapelCampo =
  | "titulo"
  | "status"
  | "responsavel"
  | "data_evento"
  | "data_conclusao"
  | "periodo";

/** Coluna como é desenhada na criação do conjunto, antes de existir no banco. */
export type ColunaDefinicao = {
  nome: string;
  tipo: TipoCampo;
  formato: Formato;
  casas: number;
  unidade?: string;
  descricao?: string;
  opcoes: string[];
  obrigatorio: boolean;
  papel?: PapelCampo;
  /** Posição da coluna na planilha colada, quando veio de colagem. É o que
   *  liga a coluna às células certas na importação das linhas. */
  origem?: number;
};

export const ROTULO_CADENCIA: Record<Cadencia, string> = {
  diaria: "diária",
  semanal: "semanal",
  quinzenal: "quinzenal",
  mensal: "mensal",
  sob_demanda: "sob demanda",
};

/** Depois de quantos dias sem linha nova o dado é considerado velho. Sob
 *  demanda não envelhece, porque não tem prazo combinado. */
export const DIAS_CADENCIA: Record<Cadencia, number | null> = {
  diaria: 1,
  semanal: 7,
  quinzenal: 15,
  mensal: 31,
  sob_demanda: null,
};

export const ROTULO_PAPEL: Record<PapelCampo, string> = {
  titulo: "Título do item",
  status: "Status",
  responsavel: "Responsável",
  data_evento: "Data em que aconteceu",
  data_conclusao: "Data de conclusão",
  periodo: "Período da medição",
};

export type Registro = {
  id: number;
  conjunto_id: number;
  valores: Record<string, unknown>;
  atualizado_em: string;
  atualizado_por: string | null;
};

export type ConfigCard = {
  conjuntoId?: number;
  metrica?: Metrica;
  /** Campo somado, contado ou promediado. `contagem` não usa. */
  campoValor?: string;
  /** Eixo de categoria em barra e pizza. */
  campoCategoria?: string;
  /** Campo de data que o período do painel recorta. Sem ele o card ignora o
   *  período, e a tela DIZ que ignora, senão parece que o filtro pegou. */
  campoData?: string;
  /** Alvo do card de progresso. */
  campoMeta?: string;
  campoTitulo?: string;
  campoStatus?: string;
  /** Colunas visíveis no card de tabela. */
  colunas?: string[];
  filtros?: Filtro[];
  /** Compara com a janela anterior de mesmo tamanho. Só existe quando há
   *  `campoData`: sem data não há período, e sem período a comparação seria
   *  inventada. */
  comparar?: boolean;
  /** Sobe é bom? Inverte a cor da variação em métrica onde cair é a boa
   *  notícia, como bloqueio. Sem isto, "▼ 99% em bloqueios" sairia vermelho. */
  subirEhBom?: boolean;

  /** Apresentação. Em branco, o card herda o formato da coluna escolhida.
   *  Preenchido, ele sobrescreve só a APARÊNCIA: casas decimais, prefixo,
   *  sufixo. A natureza do dado continua sendo a da coluna. */
  formato?: Formato;
  casas?: number;
  unidade?: string;
  prefixo?: string;

  /** Card de destaque: fundo e número em laranja. Um por faixa, no máximo dois,
   *  senão destaque em tudo é destaque em nada. */
  destaque?: boolean;

  /** Só para o card de texto. */
  texto?: string;
};

export type Card = {
  id: number;
  faixa_id: number;
  tipo: TipoCard;
  titulo: string;
  definicao: string | null;
  config: ConfigCard;
  largura: number;
  ordem: number;
};

export type Faixa = {
  id: number;
  painel_id: number;
  titulo: string;
  descricao: string | null;
  colunas: number;
  ordem: number;
};

export type Painel = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  publicado: boolean;
  controles: ControlePainel[];
  ordem: number;
};

/** Controles do topo do painel. Na primeira versão só o período existe: é ele
 *  que responde ao pedido de comparar com datas anteriores. */
export type ControlePainel = {
  tipo: "periodo";
  rotulo: string;
  padrao: PresetPeriodo;
};

export type PresetPeriodo = "7d" | "30d" | "estaSemana" | "semanaPassada" | "esteMes" | "livre";

/** ------------------------------------------------------------------
 *  As tabelas que o construtor consulta para montar os menus.
 *  ------------------------------------------------------------------ */

export const METRICAS_POR_TIPO: Record<TipoCampo, Metrica[]> = {
  // Contagem e distintos valem para qualquer campo, porque contam linha, não
  // conteúdo. Soma, média, mínimo e máximo exigem algo ordenável.
  texto: ["contagem", "distintos"],
  opcao: ["contagem", "distintos"],
  booleano: ["contagem", "distintos"],
  numero: ["contagem", "distintos", "soma", "media", "minimo", "maximo", "ultimo"],
  data: ["contagem", "distintos", "minimo", "maximo", "ultimo"],
};

export const OPERADORES_POR_TIPO: Record<TipoCampo, Operador[]> = {
  texto: ["igual", "diferente", "contem", "comeca", "em", "vazio", "naoVazio"],
  opcao: ["igual", "diferente", "em", "vazio", "naoVazio"],
  booleano: ["igual", "vazio", "naoVazio"],
  numero: [
    "igual",
    "diferente",
    "maior",
    "maiorIgual",
    "menor",
    "menorIgual",
    "entre",
    "vazio",
    "naoVazio",
  ],
  data: [
    "igual",
    "diferente",
    "maior",
    "maiorIgual",
    "menor",
    "menorIgual",
    "entre",
    "vazio",
    "naoVazio",
  ],
};

export const ROTULO_METRICA: Record<Metrica, string> = {
  contagem: "Contagem",
  soma: "Soma",
  media: "Média",
  minimo: "Mínimo",
  maximo: "Máximo",
  ultimo: "Último valor",
  distintos: "Valores distintos",
};

export const ROTULO_OPERADOR: Record<Operador, string> = {
  igual: "é",
  diferente: "não é",
  contem: "contém",
  comeca: "começa com",
  em: "está em",
  maior: "maior que",
  maiorIgual: "maior ou igual a",
  menor: "menor que",
  menorIgual: "menor ou igual a",
  entre: "entre",
  vazio: "está vazio",
  naoVazio: "não está vazio",
};

export const ROTULO_TIPO_CARD: Record<TipoCard, string> = {
  numero: "Número",
  progresso: "Progresso contra meta",
  barra: "Barras por categoria",
  linha: "Linha no tempo",
  pizza: "Composição",
  tabela: "Tabela",
  lista: "Lista com status",
  texto: "Texto",
};

/** A frase que aparece embaixo de cada tipo no seletor. Descrever o que o card
 *  RESPONDE, e não o que ele desenha, é o que faz alguém escolher certo. */
export const EXPLICA_TIPO_CARD: Record<TipoCard, string> = {
  numero: "Um valor grande, com variação contra o período anterior. Para KPI.",
  progresso: "Quanto do alvo já foi feito, em barra. Precisa de um campo de meta.",
  barra: "Compara categorias lado a lado. Para ranking e distribuição.",
  linha: "Como o valor andou no tempo. Precisa de um campo de data.",
  pizza: "Quanto cada parte representa do todo. Ruim acima de seis fatias.",
  tabela: "As linhas cruas, com as colunas que você escolher.",
  lista: "Itens com status, tipo riscos e bloqueios.",
  texto: "Uma nota de leitura da gestão. Sem número, sem fonte de dados.",
};

/** Largura do card em colunas da faixa. */
export const LARGURAS = [1, 2, 3, 4, 5, 6] as const;

/** Quais campos cada tipo de card exige. O construtor usa isto para não deixar
 *  salvar card pela metade, que na tela vira gráfico vazio sem explicação. */
export const EXIGIDO_POR_CARD: Record<TipoCard, (keyof ConfigCard)[]> = {
  numero: ["conjuntoId", "metrica"],
  progresso: ["conjuntoId", "metrica", "campoMeta"],
  barra: ["conjuntoId", "metrica", "campoCategoria"],
  linha: ["conjuntoId", "metrica", "campoData"],
  pizza: ["conjuntoId", "metrica", "campoCategoria"],
  tabela: ["conjuntoId", "colunas"],
  lista: ["conjuntoId", "campoTitulo"],
  texto: ["texto"],
};

/** Métrica que precisa de um campo alvo. `contagem` conta linha, então não. */
export function metricaPrecisaDeCampo(m: Metrica) {
  return m !== "contagem";
}
