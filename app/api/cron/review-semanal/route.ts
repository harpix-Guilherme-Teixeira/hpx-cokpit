import { NextResponse, type NextRequest } from "next/server";
import { comCredencial } from "@/lib/jira";
import { credencialViva } from "@/lib/integracao-jira";
import { janelaDaSemana, medirSemana } from "@/lib/review-semanal";
import { clienteServico } from "@/lib/supabase/servico";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONJUNTO = 4;

/** Só estas três colunas são do robô. As outras quatro são da gestora, moram na
 *  MESMA linha, e por isso a gravação é uma mesclagem e nunca uma troca da
 *  linha inteira. Regravar a linha apagaria o que ela digitou. */
const DO_ROBO = ["historias-criadas-pelo-agente", "atividades-concluidas", "bloqueadas-agora"];

type Origem = { tipo: "cron" } | { tipo: "pessoa"; usuarioId: string; email: string };

/** Dois portões, e os dois são fechados.
 *
 *  O Vercel entra pelo `CRON_SECRET`, que ele mesmo manda no cabeçalho. Uma
 *  pessoa entra pela sessão, desde que esteja na lista de quem pode escrever,
 *  e é isso que permite atualizar pelo navegador sem o segredo circular por
 *  chat ou por histórico de comando. Sem nenhum dos dois, a rota não roda. */
async function autorizar(request: NextRequest): Promise<{ origem?: Origem; erro?: string }> {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") === `Bearer ${segredo}`) {
    return { origem: { tipo: "cron" } };
  }

  const usuario = await usuarioAtual();
  if (!usuario?.email) {
    return {
      erro: segredo ? "Credencial inválida." : "CRON_SECRET não está configurado neste ambiente.",
    };
  }

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("seg_autorizado")
    .select("email")
    .eq("email", usuario.email)
    .maybeSingle();

  if (!data) return { erro: `${usuario.email} não está na lista de quem pode alimentar o painel.` };
  return { origem: { tipo: "pessoa", usuarioId: usuario.id, email: usuario.email } };
}

/** De quem é a credencial que o robô usa. Com mais de uma conta conectada ele
 *  PARA em vez de escolher sozinho: escolher em silêncio significaria trocar a
 *  origem dos números sem ninguém saber. */
async function contaDaAutomacao() {
  const supabase = clienteServico();
  const { data } = await supabase.from("int_jira").select("usuario_id, email, conta");
  const contas = data ?? [];

  if (contas.length === 0) return { erro: "Ninguém conectou o Jira em Integrações ainda." };
  if (contas.length === 1) return { conta: contas[0] };

  const escolhida = process.env.AUTOMACAO_EMAIL;
  const achada = contas.find((c) => c.email === escolhida);
  if (!achada) {
    return {
      erro: `Há ${contas.length} contas conectadas. Defina AUTOMACAO_EMAIL com a que deve alimentar o painel.`,
    };
  }
  return { conta: achada };
}

export async function GET(request: NextRequest) {
  const porta = await autorizar(request);
  if (!porta.origem) return NextResponse.json({ erro: porta.erro }, { status: 401 });

  const agora = new Date();
  const janela = janelaDaSemana(agora);
  const forcado = request.nextUrl.searchParams.get("forcar") === "1";

  // O plano hobby só dispara uma vez por dia, e o Vercel pode disparar duas.
  // A trava aqui é o que garante que só a rodada de sexta grava.
  if (!janela.ehSexta && !forcado) {
    return NextResponse.json({ ignorado: "hoje não é sexta", ...janela });
  }

  // Quem clica lê com a PRÓPRIA credencial: é a leitura mais honesta, e evita
  // ter que eleger uma conta só porque duas pessoas conectaram. A eleição fica
  // para o cron, que não tem ninguém por trás.
  const dono =
    porta.origem.tipo === "pessoa"
      ? { conta: { usuario_id: porta.origem.usuarioId, conta: porta.origem.email } }
      : await contaDaAutomacao();

  if (!dono.conta) return NextResponse.json({ erro: dono.erro }, { status: 412 });

  try {
    const cred = await credencialViva(dono.conta.usuario_id);
    if (!cred) {
      return NextResponse.json(
        {
          erro:
            porta.origem.tipo === "pessoa"
              ? "Você ainda não conectou sua conta do Jira. Faça isso em Integrações."
              : `A conexão de ${dono.conta.conta} não vale mais. Reconecte em Integrações.`,
        },
        { status: 412 },
      );
    }

    const medida = await comCredencial({ token: cred.accessToken, cloudId: cred.cloudId }, () =>
      medirSemana(agora),
    );

    const supabase = clienteServico();
    const valoresDoRobo: Record<string, number> = {
      "historias-criadas-pelo-agente": medida.historiasCriadasPeloAgente,
      "atividades-concluidas": medida.atividadesConcluidas,
      "bloqueadas-agora": medida.bloqueadasAgora,
    };

    const { data: existente } = await supabase
      .from("dad_registro")
      .select("id, valores")
      .eq("conjunto_id", CONJUNTO)
      .eq("valores->>semana", medida.semana)
      .maybeSingle();

    if (existente) {
      await supabase
        .from("dad_registro")
        .update({
          valores: { ...(existente.valores as object), ...valoresDoRobo },
          atualizado_em: new Date().toISOString(),
          atualizado_por: dono.conta.usuario_id,
        })
        .eq("id", existente.id);
    } else {
      await supabase.from("dad_registro").insert({
        conjunto_id: CONJUNTO,
        valores: { semana: medida.semana, ...valoresDoRobo },
        atualizado_por: dono.conta.usuario_id,
      });
    }

    return NextResponse.json({
      ok: true,
      lidoPor: medida.identidade,
      semana: medida.semana,
      desde: medida.inicio,
      gravado: valoresDoRobo,
      preservado: "os quatro indicadores manuais não foram tocados",
      linha: existente ? "atualizada" : "criada",
    });
  } catch (e) {
    // Falha NUNCA vira zero gravado. Sem número é recuperável; número errado no
    // painel vira decisão errada na reunião.
    const mensagem = e instanceof Error ? e.message : "falha desconhecida";
    console.error("[cron review-semanal]", mensagem);
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
