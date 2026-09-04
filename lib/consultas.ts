// As JQLs do cockpit.
//
// REGRA NUMERO UM DESTE ARQUIVO: **uma população só.**
// Todo indicador da tela olha histórias do projeto PTF que estão sob a
// iniciativa HPX-31, o escopo da sala de guerra. Nada aqui pode consultar o PTF
// inteiro. Misturar os dois escopos foi o que fez os números não fecharem: o
// bloco do agente contava 256 no PTF inteiro enquanto a entrega contava 26 no
// escopo do WR, e não havia como reconciliar porque não eram o mesmo universo.
//
// DUAS ARMADILHAS DE JQL ESTAO CRAVADAS AQUI DE PROPOSITO:
// 1. `labels != "x"` NAO casa com item sem rotulo nenhum, por isso todo negativo
//    vem acompanhado de `labels IS EMPTY OR`.
// 2. A estimativa mora na SUB-TAREFA. Somar tempo em historia devolve zero em
//    silencio, por isso a soma de horas usa o escopo de sub-tarefa.
//
// E uma armadilha de CATEGORIA: `statusCategory = "To Do"` engloba
// `Sprint Backlog` E `Bloqueado`. Chamar isso de "fila" mente, porque a maioria
// esta travada e nao esperando ser puxada. Por isso as duas sao medidas
// separadas e nunca somadas num card so.

export const ESCOPO_WR = 'parent IN portfolioChildIssuesOf("HPX-31")';

/** A base de tudo: história do PTF dentro do escopo da sala de guerra. */
export const HISTORIA_WR = `project = PTF AND issuetype = "História" AND ${ESCOPO_WR}`;

/** A fatia escrita pelo agente, dentro do mesmo escopo. */
export const AGENTE_WR = `${HISTORIA_WR} AND labels = "rascunho-agente"`;

const NAO_E_AGENTE = '(labels IS EMPTY OR labels != "rascunho-agente")';

/** `Refinado` só responde pelo id. Pedir pelo nome devolve vazio em silêncio. */
export const CAMPO_REFINADO = "customfield_11016";

export const JQL = {
  // O universo: toda história do escopo, escrita por quem quer que seja.
  escopoTotal: HISTORIA_WR,

  // Produção do agente, dentro do escopo.
  agenteTotal: AGENTE_WR,
  agenteConcluidas: `${AGENTE_WR} AND statusCategory = Done`,
  agenteAndamento: `${AGENTE_WR} AND statusCategory = "In Progress"`,
  agenteNaoIniciadas: `${AGENTE_WR} AND statusCategory = "To Do"`,
  agenteBloqueadas: `${AGENTE_WR} AND status = "Bloqueado"`,
  agenteRefinadas: `${AGENTE_WR} AND Refinado = "Sim"`,

  // Entrega do escopo, separando origem.
  wrConcluidas: `${HISTORIA_WR} AND statusCategory = Done`,
  wrConcluidasAgente: `${HISTORIA_WR} AND statusCategory = Done AND labels = "rascunho-agente"`,

  // Status Bloqueado, separando por origem da história, não por causa.
  bloqTotal: `${HISTORIA_WR} AND status = "Bloqueado"`,
  bloqRascunho: `${HISTORIA_WR} AND status = "Bloqueado" AND labels = "rascunho-agente"`,
  bloqReal: `${HISTORIA_WR} AND status = "Bloqueado" AND ${NAO_E_AGENTE}`,

  // Refinamento.
  refinadas: `${HISTORIA_WR} AND Refinado = "Sim"`,
  semRefino: `${HISTORIA_WR} AND (Refinado IS EMPTY OR Refinado = "Não")`,

  // Dimensionamento por T-shirt. Hoje da ZERO no escopo, e o zero e REAL:
  // conferido com controle, o PTF inteiro tem 165 preenchidas, entao o campo
  // resolve na JQL. Ninguem dimensionou o escopo do WR, o agente Dimensionador
  // VTEX foi publicado e nunca rodou.
  tshirtPreenchido: `${HISTORIA_WR} AND "Tamanho T-Shirt" IS NOT EMPTY`,

  // Esforço, sempre em sub-tarefa, no mesmo escopo.
  subtarefasWR: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR}`,
  subtarefasWRConcluidas: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR} AND statusCategory = Done`,

  // Cobertura da estimativa no que AINDA FALTA. E o numero que decide se dá
  // para projetar alguma coisa: hoje so 47% das sub-tarefas abertas tem
  // estimativa, entao "o que falta" em horas cobre menos da metade do trabalho.
  // `originalEstimate > 0` e obrigatorio: `IS NOT EMPTY` casa com ZERO.
  subtarefasAbertas: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR} AND statusCategory != Done`,
  subtarefasAbertasComEstimativa: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR} AND statusCategory != Done AND originalEstimate > 0`,
} as const;
