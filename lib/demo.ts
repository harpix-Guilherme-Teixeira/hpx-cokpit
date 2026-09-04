// Números congelados da medição manual de 02/09/2026, para aprovar o visual
// sem token nenhum.
//
// TRAVA DE SEGURANÇA: este modo só liga quando NODE_ENV é development, ou seja
// apenas em `next dev`, na máquina de quem está construindo. Um build de
// produção na Vercel NUNCA cai aqui, mesmo que as variáveis faltem: lá a rota
// devolve erro e a tela grita. Número inventado num mural é pior que mural
// apagado.

export const MODO_DEMO_PERMITIDO = process.env.NODE_ENV === "development";

export const DADOS_DEMO = {
  demonstracao: true as const,
  atualizadoEm: "2026-09-02T14:00:00.000-03:00",
  agente: { total: 111, concluidas: 16, andamento: 2, fila: 93 },
  bloqueio: { total: 90, rascunho: 63, real: 27 },
  refinamento: { refinadas: 71, semRefino: 53 },
  esforco: {
    estimadoH: 406.5,
    gastoH: 442.22,
    subtarefas: 360,
    concluidoEstimadoH: 258,
    concluidoGastoH: 419.9,
    aderencia: 419.9 / 258,
  },
};
