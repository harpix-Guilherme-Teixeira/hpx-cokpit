import { NextResponse } from "next/server";
import { contar, somarTempo, credenciaisAusentes, quemSou } from "@/lib/jira";
import { JQL } from "@/lib/consultas";
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
    wrConcluidas,
    wrConcluidasAgente,
    esforco,
    esforcoConcluido,
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
    contar(JQL.wrConcluidas),
    contar(JQL.wrConcluidasAgente),
    somarTempo(JQL.subtarefasWR),
    somarTempo(JQL.subtarefasWRConcluidas),
  ]);

  // Aderencia: quanto o realizado ficou acima ou abaixo do estimado, no que
  // JA FECHOU. Comparar no backlog inteiro nao diz nada, porque o que nao
  // comecou tem estimativa e zero apontamento.
  const aderencia =
    esforcoConcluido.estimadoH > 0
      ? esforcoConcluido.gastoH / esforcoConcluido.estimadoH
      : null;

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
    refinamento: { refinadas, semRefino },
    entrega: { concluidas: wrConcluidas, doAgente: wrConcluidasAgente },
    esforco: {
      estimadoH: esforco.estimadoH,
      gastoH: esforco.gastoH,
      subtarefas: esforco.itens,
      concluidoEstimadoH: esforcoConcluido.estimadoH,
      concluidoGastoH: esforcoConcluido.gastoH,
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
