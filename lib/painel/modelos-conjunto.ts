import type { Cadencia, ColunaDefinicao, Grao, PapelCampo, TipoCampo } from "./tipos";
import type { Formato } from "./formato";

export type ModeloConjunto = {
  chave: string;
  nome: string;
  descricao: string;
  grao: Grao;
  cadencia: Cadencia;
  fonte: string;
  colunas: ColunaDefinicao[];
};

function coluna(
  nome: string,
  tipo: TipoCampo,
  extra: Partial<ColunaDefinicao> & { papel?: PapelCampo; formato?: Formato } = {},
): ColunaDefinicao {
  return {
    nome,
    tipo,
    formato: tipo === "numero" ? "inteiro" : "texto",
    casas: 0,
    opcoes: [],
    obrigatorio: false,
    ...extra,
  };
}

/** Modelos de conjunto. Três de ITEM e um de medição, nessa proporção de
 *  propósito: item é onde o dado manual vale, porque a plataforma conta e
 *  compara sozinha. Medição existe para o número que não dá para contar a
 *  partir de coisa nenhuma. */
export const MODELOS_CONJUNTO: ModeloConjunto[] = [
  {
    chave: "documentacoes-api",
    nome: "Documentações de API",
    descricao: "Cada linha é a documentação de um conector no Confluence.",
    grao: "item",
    cadencia: "semanal",
    fonte:
      "Página de cada conector no Confluence, espaço HNG. O status sai da tabela de cabeçalho da página.",
    colunas: [
      coluna("Conector", "texto", { papel: "titulo", obrigatorio: true }),
      coluna("Sistema", "opcao", { opcoes: ["VTEX", "Sankhya", "Mega", "HubSpot", "Outro"] }),
      coluna("Status", "opcao", {
        papel: "status",
        obrigatorio: true,
        opcoes: ["Análise", "Em documentação", "Pronto", "Pendente"],
      }),
      coluna("Responsável", "texto", { papel: "responsavel" }),
      coluna("Entrou em", "data", { papel: "data_evento" }),
      coluna("Concluída em", "data", { papel: "data_conclusao" }),
      coluna("Link", "texto"),
    ],
  },
  {
    chave: "riscos-bloqueios",
    nome: "Riscos e bloqueios",
    descricao: "Cada linha é um risco ou impedimento que o Jira não mostra.",
    grao: "item",
    cadencia: "semanal",
    fonte: "Levantado na reunião semanal da frente e atualizado por quem é dono de cada risco.",
    colunas: [
      coluna("Risco", "texto", { papel: "titulo", obrigatorio: true }),
      coluna("Impacto", "opcao", { opcoes: ["Alto", "Médio", "Baixo"] }),
      coluna("Status", "opcao", {
        papel: "status",
        obrigatorio: true,
        opcoes: ["Aberto", "Mitigando", "Resolvido"],
      }),
      coluna("Responsável", "texto", { papel: "responsavel" }),
      coluna("Aberto em", "data", { papel: "data_evento" }),
      coluna("Resolvido em", "data", { papel: "data_conclusao" }),
      coluna("Ação combinada", "texto"),
    ],
  },
  {
    chave: "metas",
    nome: "Metas",
    descricao: "Cada linha é uma meta com alvo, realizado e prazo.",
    grao: "item",
    cadencia: "mensal",
    fonte: "Definidas no planejamento da sala de guerra. O realizado é atualizado por quem é dono.",
    colunas: [
      coluna("Meta", "texto", { papel: "titulo", obrigatorio: true }),
      coluna("Alvo", "numero"),
      coluna("Realizado", "numero"),
      coluna("Situação", "opcao", {
        papel: "status",
        opcoes: ["No prazo", "Em risco", "Atrasada", "Batida"],
      }),
      coluna("Responsável", "texto", { papel: "responsavel" }),
      coluna("Prazo", "data", { papel: "data_evento" }),
    ],
  },
  {
    chave: "medicoes-semanais",
    nome: "Medições semanais",
    descricao: "Cada linha é o valor de uma semana, digitado.",
    grao: "medicao",
    cadencia: "semanal",
    fonte:
      "Escreva aqui de onde cada número é tirado, com o caminho exato, para outra pessoa conseguir conferir.",
    colunas: [
      coluna("Semana", "data", { papel: "periodo", obrigatorio: true }),
      coluna("Valor", "numero"),
    ],
  },
];
