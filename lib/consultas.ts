// As JQLs do cockpit. Todas conferidas na mao em 02/09/2026.
//
// DUAS ARMADILHAS ESTAO CRAVADAS AQUI DE PROPOSITO:
// 1. `labels != "x"` NAO casa com item sem rotulo nenhum, por isso todo negativo
//    vem acompanhado de `labels IS EMPTY OR`.
// 2. A estimativa mora na SUB-TAREFA. Somar tempo em historia devolve zero em
//    silencio, por isso a soma de horas usa o escopo de sub-tarefa.

export const ESCOPO_WR = 'parent IN portfolioChildIssuesOf("HPX-31")';
export const AGENTE = 'project = PTF AND labels = "rascunho-agente"';
export const HISTORIA_WR = `project = PTF AND issuetype = "História" AND ${ESCOPO_WR}`;

export const JQL = {
  // Producao do agente de historia
  agenteTotal: AGENTE,
  agenteConcluidas: `${AGENTE} AND statusCategory = Done`,
  agenteAndamento: `${AGENTE} AND statusCategory = "In Progress"`,
  agenteFila: `${AGENTE} AND statusCategory = "To Do"`,

  // Bloqueio, separando rascunho de bloqueio de verdade
  bloqTotal: 'project = PTF AND status = "Bloqueado" AND issuetype = "História"',
  bloqRascunho: 'project = PTF AND status = "Bloqueado" AND issuetype = "História" AND labels = "rascunho-agente"',
  bloqReal:
    'project = PTF AND status = "Bloqueado" AND issuetype = "História" AND (labels IS EMPTY OR labels != "rascunho-agente")',

  // Refinamento no escopo da sala de guerra
  refinadas: `${HISTORIA_WR} AND Refinado = "Sim"`,
  semRefino: `${HISTORIA_WR} AND (Refinado IS EMPTY OR Refinado = "Não")`,

  // Esforco, sempre em sub-tarefa
  subtarefasWR: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR}`,
  subtarefasWRConcluidas: `project = PTF AND issuetype = "Sub-tarefa" AND ${ESCOPO_WR} AND statusCategory = Done`,
} as const;
