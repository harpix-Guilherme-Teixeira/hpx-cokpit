import { NextResponse } from "next/server";
import { contar, credenciaisAusentes, quemSou, periodo, panorama } from "@/lib/jira";
import { JQL, CAMPO_REFINADO, LIMITES_TSHIRT } from "@/lib/consultas";
import { DADOS_DEMO, MODO_DEMO_PERMITIDO } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Cache em memoria de 60s. O painel fica aberto o dia inteiro numa TV, entao
// sem isso a instancia bate no Jira a cada visita e a cada refresh do front.
type Cache = { em: number; corpo: unknown };
let cache: Cache | null = null;
const TTL_MS = 60_000;

async function medir() {
  // Primeiro provar que a credencial vale. Sem isso, todo numero abaixo sai
  // zero e parece dado.
  const identidade = await quemSou();

  const [
    escopoTotal,
    agenteTotal,
    agenteConcluidas,
    agenteAndamento,
    agenteNaoIniciadas,
    agenteBloqueadas,
    bloqTotal,
    bloqRascunho,
    bloqReal,
    refinadas,
    semRefino,
    agenteRefinadas,
    tshirtPreenchido,
    janela,
    wrConcluidas,
    wrConcluidasAgente,
    visao,
  ] = await Promise.all([
    contar(JQL.escopoTotal),
    contar(JQL.agenteTotal),
    contar(JQL.agenteConcluidas),
    contar(JQL.agenteAndamento),
    contar(JQL.agenteNaoIniciadas),
    contar(JQL.agenteBloqueadas),
    contar(JQL.bloqTotal),
    contar(JQL.bloqRascunho),
    contar(JQL.bloqReal),
    contar(JQL.refinadas),
    contar(JQL.semRefino),
    contar(JQL.agenteRefinadas),
    contar(JQL.tshirtPreenchido),
    periodo(JQL.escopoTotal),
    contar(JQL.wrConcluidas),
    contar(JQL.wrConcluidasAgente),
    panorama(JQL.subtarefasWR, JQL.escopoTotal, JQL.refinadas, CAMPO_REFINADO, LIMITES_TSHIRT),
  ]);

  const esforco = { ...visao.tempo, itens: visao.subtarefas.total };
  const par = visao.pareado;
  const abertas = visao.subtarefas.abertas;
  const abertasComEstimativa = visao.subtarefas.abertasComEstimativa;
  const restante = visao.restanteEstimadoH;

  // Aderencia: quanto o realizado ficou acima ou abaixo do estimado, no que
  // JA FECHOU. Comparar no backlog inteiro nao diz nada, porque o que nao
  // comecou tem estimativa e zero apontamento.
  // SO com os itens PAREADOS, que tem estimativa e apontamento. Usar os totais
  // aqui deu 1,72x e era artefato: 199 das 397 sub-tarefas fechadas apontaram
  // sem nunca ter tido estimativa, entao entravam no numerador e nao no
  // denominador. Pareado da 0,91x, e o time entrega ABAIXO do que estima.
  const aderencia = par.estimadoH > 0 ? par.gastoH / par.estimadoH : null;

  // Vazao MEDIA desde o dia zero do escopo. Nao e vazao da semana, e a media
  // do periodo inteiro: honesta, mas suaviza pico e vale.
  const inicio = janela.inicio ? new Date(janela.inicio).getTime() : null;
  const semanas = inicio ? (Date.now() - inicio) / (7 * 24 * 3600 * 1000) : 0;
  const vazao = semanas > 0 ? esforco.gastoH / semanas : 0;

  return {
    atualizadoEm: new Date().toISOString(),
    identidade,
    escopoTotal,
    agente: {
      total: agenteTotal,
      concluidas: agenteConcluidas,
      andamento: agenteAndamento,
      // backlog = nao iniciadas menos as que estao travadas em Bloqueado
      backlog: agenteNaoIniciadas - agenteBloqueadas,
      bloqueadas: agenteBloqueadas,
    },
    bloqueio: { total: bloqTotal, rascunho: bloqRascunho, real: bloqReal },
    periodo: janela,
    refinamento: {
      refinadas,
      semRefino,
      doAgente: agenteRefinadas,
      refinadasSemEstimativa: visao.refino.semEstimativa,
      refinadasComEstimativa: visao.refino.comEstimativa,
    },
    dimensionamento: { comTshirt: tshirtPreenchido, semTshirt: escopoTotal - tshirtPreenchido },
    previsibilidade: {
      // O que falta em horas, pela estimativa que o time deu.
      restanteEstimadoH: restante,
      // O mesmo, corrigido pelo quanto o time historicamente estoura.
      restanteAjustadoH: aderencia ? restante * aderencia : null,
      vazaoSemanalH: vazao,
      semanasDecorridas: semanas,
      // Quanto do que falta tem estimativa. Sem isso, "falta X horas" e uma
      // frase sobre metade do trabalho. NAO existe card de "semanas para
      // acabar": dividir um restante subestimado por uma vazao media de 4
      // semanas dava 1,1 semana num plano que vai ate novembro.
      abertas,
      abertasComEstimativa,
      cobertura: abertas > 0 ? abertasComEstimativa / abertas : null,
    },
    entrega: { concluidas: wrConcluidas, doAgente: wrConcluidasAgente },
    esforco: {
      estimadoH: esforco.estimadoH,
      gastoH: esforco.gastoH,
      subtarefas: esforco.itens,
      // A regua e a projecao por classe de referencia continuam sendo
      // CALCULADAS, porque saem da mesma varredura e nao custam nada a mais.
      // A v1 nao mostra nenhuma das duas, por decisao do Gui em 04/09. Para
      // religar, basta a secao no page.tsx, o dado ja chega aqui.
      regua: visao.regua,
      projecao: visao.projecao,
      pareadoEstimadoH: par.estimadoH,
      pareadoGastoH: par.gastoH,
      pareadoItens: par.itens,

      aderencia,
    },
  };
}

export async function GET() {
  const faltando = credenciaisAusentes();
  if (faltando.length > 0) {
    // Em desenvolvimento, sem credencial, serve a medicao congelada de 02/09
    // so para aprovar o visual. Em producao isso nunca acontece: cai no erro
    // abaixo e a tela grita, porque numero inventado num mural e pior que
    // mural apagado.
    if (MODO_DEMO_PERMITIDO) {
      return NextResponse.json(DADOS_DEMO);
    }
    return NextResponse.json(
      { erro: `Faltam variaveis de ambiente: ${faltando.join(", ")}` },
      { status: 500 },
    );
  }

  if (cache && Date.now() - cache.em < TTL_MS) {
    return NextResponse.json(cache.corpo);
  }

  try {
    const corpo = await medir();
    cache = { em: Date.now(), corpo };
    return NextResponse.json(corpo);
  } catch (e) {
    // Falha NUNCA vira zero. Se existe leitura anterior, devolve ela marcada
    // como velha; se nao existe, devolve erro de verdade para a tela gritar.
    const mensagem = e instanceof Error ? e.message : "falha desconhecida";
    if (cache) {
      return NextResponse.json({ ...(cache.corpo as object), erroUltimaLeitura: mensagem });
    }
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
