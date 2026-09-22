import { contar, quemSou } from "@/lib/jira";

/** Os três indicadores do review que saem do Jira. Os outros quatro são
 *  digitados pela gestora e o robô nunca encosta neles. */
export type IndicadoresDaSemana = {
  identidade: string;
  semana: string;
  inicio: string;
  historiasCriadasPeloAgente: number;
  atividadesConcluidas: number;
  bloqueadasAgora: number;
};

/** Brasília é UTC-3 o ano inteiro desde 2019, quando o horário de verão acabou.
 *  Se voltar, este número vira mentira e a semana começa na hora errada. */
const BRASILIA_MS = 3 * 60 * 60 * 1000;

function partesLocais(instante: Date) {
  const local = new Date(instante.getTime() - BRASILIA_MS);
  return {
    ano: local.getUTCFullYear(),
    mes: local.getUTCMonth(),
    dia: local.getUTCDate(),
    diaDaSemana: local.getUTCDay(),
  };
}

function comoData(ano: number, mes: number, dia: number) {
  const d = new Date(Date.UTC(ano, mes, dia));
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana corrente, e o dia da rodada.
 *
 *  Calculado aqui e não com `startOfWeek()` do Jira de propósito: aquele
 *  depende da configuração de locale da conta e um dia vira domingo sem
 *  ninguém perceber, mudando todo indicador de uma vez. */
export function janelaDaSemana(agora = new Date()) {
  const { ano, mes, dia, diaDaSemana } = partesLocais(agora);
  const desdeSegunda = (diaDaSemana + 6) % 7;

  return {
    /** Data da linha: o dia em que a foto foi tirada. */
    semana: comoData(ano, mes, dia),
    inicio: comoData(ano, mes, dia - desdeSegunda),
    /** Domingo = 0. É o que o agendador compara com o dia configurado. */
    diaDaSemana,
  };
}

export async function medirSemana(agora = new Date()): Promise<IndicadoresDaSemana> {
  const { semana, inicio } = janelaDaSemana(agora);

  // A busca do Jira responde 200 com zero para quem não está autenticado, então
  // sem esta prova de vida uma credencial revogada viraria "semana sem nada
  // feito" e ninguém desconfiaria.
  const identidade = await quemSou();

  const desde = `"${inicio} 00:00"`;

  const [historias, concluidas, bloqueadas] = await Promise.all([
    contar(`project = PTF AND labels = "rascunho-agente" AND created >= ${desde}`),

    // subTaskIssueTypes() e não `issuetype != "Sub-tarefa"`: Sub-bug,
    // Sub-atividades e Ritos também são subtarefa e inflavam de 17 para 25.
    // `resolved` e não `status CHANGED TO`, que no PTF inteiro dá timeout.
    contar(
      `project = PTF AND issuetype NOT IN subTaskIssueTypes() AND statusCategory = Done AND resolved >= ${desde}`,
    ),

    // Foto do momento, não movimento da semana.
    contar(`project = PTF AND status = "Bloqueado" AND issuetype IN ("História", "Tarefa")`),
  ]);

  return {
    identidade,
    semana,
    inicio,
    historiasCriadasPeloAgente: historias,
    atividadesConcluidas: concluidas,
    bloqueadasAgora: bloqueadas,
  };
}
