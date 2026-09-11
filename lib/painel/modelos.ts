import type { Formato } from "./formato";
import type { Cadencia, Grao, Metrica, TipoCampo, TipoCard } from "./tipos";

/** Modelos de painel: estrutura pronta, não só aparência.
 *
 *  O preset de tema já copia as cores. O que faltava era a ESTRUTURA. Estes
 *  dois modelos são transcrição dos painéis que estão no ar hoje, faixa por
 *  faixa e frase por frase, não aproximação de memória:
 *
 *  - "Cockpit da semana" sai de `app/semana/page.tsx`, o que está publicado em
 *    hpx-cockpit-upstream-git-feat-81d854.
 *  - "Cockpit upstream" sai de `app/(cockpit)/page.tsx`, o acumulado.
 *
 *  A diferença que muda tudo: os dois lá leem o Jira ao vivo, e aqui o dado é
 *  manual. Por isso o modelo também cria o CONJUNTO com as colunas certas, uma
 *  linha por medição, e aponta cada card para ele. Sem isso a pessoa receberia
 *  onze cards bonitos sem fonte nenhuma, que é pior que receber nada.
 *
 *  As definições vêm junto e são obrigatórias no editor. Modelo que entregasse
 *  card sem definição criaria exatamente o que o construtor proíbe. */

export type ColunaModelo = {
  nome: string;
  tipo: TipoCampo;
  formato?: Formato;
  casas?: number;
};

export type CardModelo = {
  titulo: string;
  definicao: string;
  tipo?: TipoCard;
  /** Nome da coluna que alimenta o card. Vira chave por slug. */
  coluna?: string;
  metrica?: Metrica;
  destaque?: boolean;
  largura?: number;
  comparar?: boolean;
  subirEhBom?: boolean;
  texto?: string;
  /** Categoria, para barra e pizza. */
  categoria?: string;
};

export type FaixaModelo = {
  titulo: string;
  descricao?: string;
  dica?: string;
  colunas: number;
  fundo?: "transparente" | "superficie" | "acento";
  cards: CardModelo[];
};

export type Modelo = {
  chave: string;
  nome: string;
  descricao: string;
  preset: string;
  cabecalho?: { titulo: string; subtitulo: string };
  conjunto?: {
    nome: string;
    descricao: string;
    /** De onde sai cada número e como conferir. Vai para `dad_conjunto.fonte` e
     *  aparece na tela. É o que separa medição de chute: sem a origem escrita,
     *  o número digitado vira uma afirmação que ninguém consegue refazer. */
    fonte: string;
    grao: Grao;
    cadencia: Cadencia;
    colunas: ColunaModelo[];
  };
  faixas: FaixaModelo[];
};

const H = (nome: string): ColunaModelo => ({ nome, tipo: "numero", formato: "horas", casas: 1 });
const N = (nome: string): ColunaModelo => ({ nome, tipo: "numero", formato: "inteiro", casas: 0 });

/** ------------------------------------------------------------------
 *  Cockpit da semana, o que está no ar em /semana
 *  ------------------------------------------------------------------ */
export const MODELO_SEMANA: Modelo = {
  chave: "cockpit-semana",
  nome: "Cockpit da semana",
  descricao:
    "As três faixas do cockpit semanal publicado: visão geral com a produção do agente, visão detalhada com o movimento da iniciativa, e a nota de análise para priorização.",
  preset: "harpix-claro",
  cabecalho: {
    titulo: "Cockpit da semana",
    subtitulo: "harpix · Plataforma · sala de guerra · frente 2",
  },
  conjunto: {
    nome: "Medições da semana",
    descricao:
      "Uma linha por semana. A data é o que liga os cards ao período do painel e o que permite comparar com a semana anterior.",
    fonte:
      "Jira, projeto PTF. A produção do agente conta pelo rótulo rascunho-agente, que é a ORIGEM da história; contar por épico pai esconde as órfãs. Horas saem do apontamento da sub-tarefa. Cada card diz na definição exatamente o que contar.",
    grao: "medicao",
    cadencia: "semanal",
    colunas: [
      { nome: "Semana", tipo: "data" },
      N("Histórias criadas pelo agente"),
      N("Dessas já refinadas"),
      N("Criadas sem épico pai"),
      H("Horas estimadas que entraram"),
      H("Horas apontadas na semana"),
      N("Concluídas na semana"),
      N("Entraram em bloqueado"),
      N("Saíram de bloqueado"),
      N("Na sprint aberta"),
      N("Em sprint backlog"),
    ],
  },
  faixas: [
    {
      titulo: "Visão geral",
      dica: "o que o agente produziu na janela, contra a janela anterior",
      colunas: 4,
      cards: [
        {
          titulo: "Histórias criadas pelo agente",
          definicao:
            "Histórias com o rótulo rascunho-agente criadas na semana, no projeto inteiro e não só na iniciativa. História criada sem épico pai fica fora da iniciativa e sumiria da conta.",
          coluna: "Histórias criadas pelo agente",
          metrica: "ultimo",
          destaque: true,
          comparar: true,
        },
        {
          titulo: "Dessas, já refinadas",
          definicao:
            "Campo Refinado igual a Sim entre as criadas na semana. É a foto de agora, não o evento: não dá para consultar quando o campo virou Sim.",
          coluna: "Dessas já refinadas",
          metrica: "ultimo",
          comparar: true,
        },
        {
          titulo: "Horas estimadas que entraram",
          definicao:
            "Soma da estimativa das sub-tarefas criadas na semana. As que saíram sem estimativa entram como zero e puxam o número para baixo.",
          coluna: "Horas estimadas que entraram",
          metrica: "ultimo",
          comparar: true,
        },
        {
          titulo: "Horas apontadas na semana",
          definicao:
            "Worklog lançado na janela, não o campo de tempo gasto, que é acumulado desde sempre.",
          coluna: "Horas apontadas na semana",
          metrica: "ultimo",
          destaque: true,
          comparar: true,
        },
        {
          titulo: "Criadas na semana sem épico pai",
          definicao:
            "Histórias que nasceram sem pai, ficam fora da iniciativa e não aparecem em painel ancorado nela, nem entram na conta de horas. Vincular a um épico resolve.",
          coluna: "Criadas sem épico pai",
          metrica: "ultimo",
          largura: 4,
        },
      ],
    },
    {
      titulo: "Visão detalhada",
      dica: "movimento da iniciativa na mesma janela",
      colunas: 3,
      cards: [
        {
          titulo: "Concluídas na semana",
          definicao:
            "Histórias da iniciativa resolvidas dentro da janela. Conta o evento de resolução, por isso a soma de duas semanas pode passar do total concluído hoje: história reaberta mantém a data.",
          coluna: "Concluídas na semana",
          metrica: "ultimo",
          destaque: true,
          comparar: true,
        },
        {
          titulo: "Entraram em Bloqueado",
          definicao:
            "Transições para o status Bloqueado dentro da janela, não o total de bloqueadas, que é estoque.",
          coluna: "Entraram em bloqueado",
          metrica: "ultimo",
          comparar: true,
          // Cair é a boa notícia aqui. Sem isto, uma queda de 99% sairia em
          // vermelho e o painel diria o contrário do que aconteceu.
          subirEhBom: false,
        },
        {
          titulo: "Saíram de Bloqueado",
          definicao: "Destravadas na janela.",
          coluna: "Saíram de bloqueado",
          metrica: "ultimo",
          comparar: true,
        },
      ],
    },
    {
      titulo: "Horas lançadas dia a dia",
      colunas: 1,
      cards: [
        {
          titulo: "Horas por dia",
          definicao:
            "Worklog por dia da janela. Responde se a semana andou ou parou no meio sem ninguém precisar abrir o Jira.",
          tipo: "linha",
          coluna: "Horas apontadas na semana",
          metrica: "soma",
          largura: 1,
        },
      ],
    },
    {
      titulo: "Estado de agora",
      dica: "as duas perguntas de estoque, não são fluxo da semana",
      colunas: 2,
      cards: [
        {
          titulo: "Na sprint aberta",
          definicao:
            "Histórias da iniciativa dentro da sprint em andamento agora. É a sprint da semana, não o que entrou nela nesta semana.",
          coluna: "Na sprint aberta",
          metrica: "ultimo",
        },
        {
          titulo: "Em Sprint Backlog",
          definicao: "Prontas para alguém puxar. Estado de agora, não movimento da semana.",
          coluna: "Em sprint backlog",
          metrica: "ultimo",
        },
      ],
    },
    {
      titulo: "Análise para priorização",
      dica: "fora da janela, é o catálogo do Confluence",
      colunas: 1,
      fundo: "superficie",
      cards: [
        {
          titulo: "Este bloco não é da semana",
          definicao: "Nota de contexto, sem fonte de dados.",
          tipo: "texto",
          texto:
            "O status da documentação está escrito numa célula de tabela dentro da página, e não como rótulo, então não existe consulta que devolva isso. Aplicando rótulo nas páginas, este bloco vira dado vivo e passa a ter recorte semanal como os outros.",
          largura: 1,
        },
      ],
    },
  ],
};

/** ------------------------------------------------------------------
 *  Cockpit upstream, o acumulado que está no ar em /
 *  ------------------------------------------------------------------ */
export const MODELO_COCKPIT: Modelo = {
  chave: "cockpit-upstream",
  nome: "Cockpit upstream",
  descricao:
    "As três faixas do cockpit acumulado publicado: histórias do agente, horas, e a quebra de quem está em Bloqueado.",
  preset: "harpix-claro",
  cabecalho: { titulo: "Cockpit Upstream", subtitulo: "harpix · Plataforma · sala de guerra" },
  conjunto: {
    nome: "Medições do cockpit",
    descricao: "Uma linha por medição. A data liga os cards ao período do painel.",
    fonte:
      "Jira, projeto PTF sob a iniciativa HPX-31. Números acumulados, não do mês. O rótulo rascunho-agente é a origem da história. Cada card diz na definição exatamente o que contar.",
    grao: "medicao",
    cadencia: "semanal",
    colunas: [
      { nome: "Data da medição", tipo: "data" },
      N("Todas do agente"),
      N("Refinadas"),
      N("Em andamento"),
      N("Concluídas no escopo"),
      N("Bloqueadas"),
      N("Prontas"),
      H("Estimativa original"),
      H("Horas apontadas"),
      N("Total em bloqueado"),
      N("Bloqueadas escritas pelo agente"),
      N("Bloqueadas escritas por pessoa"),
    ],
  },
  faixas: [
    {
      titulo: "Histórias do agente",
      descricao:
        "Das histórias do escopo, estas são as que o agente escreveu. Contagem acumulada, não é do mês.",
      colunas: 6,
      cards: [
        {
          titulo: "Todas do agente",
          definicao: "Histórias que carregam o rótulo rascunho-agente.",
          coluna: "Todas do agente",
          metrica: "ultimo",
          destaque: true,
        },
        {
          titulo: "Refinadas",
          definicao: "Campo Refinado marcado como Sim.",
          coluna: "Refinadas",
          metrica: "ultimo",
        },
        {
          titulo: "Em andamento",
          definicao: "Em Desenvolvimento, Em Testes ou Liberado para Testes.",
          coluna: "Em andamento",
          metrica: "ultimo",
        },
        {
          titulo: "Concluídas no escopo",
          definicao:
            "Status Concluído, contando as histórias do escopo inteiro, escritas por quem quer que seja.",
          coluna: "Concluídas no escopo",
          metrica: "ultimo",
        },
        {
          titulo: "Bloqueadas",
          definicao: "Status Bloqueado. O Jira registra o status, não o motivo.",
          coluna: "Bloqueadas",
          metrica: "ultimo",
        },
        {
          titulo: "Prontas",
          definicao: "Sprint Backlog, disponíveis para alguém puxar.",
          coluna: "Prontas",
          metrica: "ultimo",
        },
      ],
    },
    {
      titulo: "Horas",
      descricao:
        "Somadas nas sub-tarefas, porque a estimativa mora um nível abaixo da história e somar na história devolveria zero.",
      colunas: 2,
      cards: [
        {
          titulo: "Estimativa original",
          definicao:
            "Soma da estimativa nas sub-tarefas do escopo. Quem nunca foi estimado entra como zero, por isso este número é piso, não é o esforço total previsto.",
          coluna: "Estimativa original",
          metrica: "ultimo",
        },
        {
          titulo: "Horas apontadas",
          definicao: "Soma do tempo que o time registrou nessas mesmas sub-tarefas.",
          coluna: "Horas apontadas",
          metrica: "ultimo",
        },
      ],
    },
    {
      titulo: "Quem está no status Bloqueado",
      descricao: "A quebra por autoria, que é o que separa rascunho parado de trabalho travado.",
      colunas: 3,
      cards: [
        {
          titulo: "Total em Bloqueado",
          definicao: "Todas as histórias do escopo nesse status.",
          coluna: "Total em bloqueado",
          metrica: "ultimo",
          destaque: true,
        },
        {
          titulo: "Escritas pelo agente",
          definicao: "Das bloqueadas, as que carregam o rótulo rascunho-agente.",
          coluna: "Bloqueadas escritas pelo agente",
          metrica: "ultimo",
        },
        {
          titulo: "Escritas por pessoa",
          definicao: "Das bloqueadas, as que uma pessoa escreveu.",
          coluna: "Bloqueadas escritas por pessoa",
          metrica: "ultimo",
        },
      ],
    },
  ],
};

export const MODELOS: Modelo[] = [MODELO_SEMANA, MODELO_COCKPIT];
