import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Pagina, Secao, TituloPagina } from "@/componentes/layout/pagina";
import { AjustesAgendador } from "@/features/agendador/ajustes-agendador";
import { AtualizarDoJira } from "@/features/datasets/atualizar-jira/atualizar-jira";
import { clienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Agendador · harpix" };
export const dynamic = "force-dynamic";

const CONJUNTO = 4;

const DIAS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const ROTULO_STATUS: Record<string, string> = {
  ok: "rodou e gravou",
  erro: "falhou",
  pulado: "não era o dia",
};

function quando(iso: string | null) {
  if (!iso) return "nunca rodou";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function PaginaAgendador() {
  const supabase = await clienteServidor();

  const [{ data: config, error }, { data: conjunto }] = await Promise.all([
    supabase
      .from("cfg_agendador")
      .select("ativo, dia_semana, ultima_rodada_em, ultimo_status, ultimo_detalhe")
      .eq("conjunto_id", CONJUNTO)
      .maybeSingle(),
    supabase.from("dad_conjunto").select("id, nome").eq("id", CONJUNTO).maybeSingle(),
  ]);

  return (
    <Pagina>
      <TituloPagina
        titulo="Agendador"
        descricao="Quando o sistema busca sozinho os números no Jira. Os indicadores que você digita nunca são tocados por ele."
        acao={<AtualizarDoJira />}
      />

      {error && <Aviso>Não consegui ler o agendamento: {error.message}</Aviso>}

      {!config && !error && (
        <Aviso>Ainda não existe agendamento configurado para o conjunto {CONJUNTO}.</Aviso>
      )}

      {config && (
        <>
          <Secao titulo={conjunto?.nome ?? "Review semanal"}>
            <AjustesAgendador ativo={config.ativo} diaSemana={config.dia_semana} />
          </Secao>

          <Secao titulo="Última rodada">
            <div className="border-grey-300/60 rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-grey-600 text-sm font-medium">
                {quando(config.ultima_rodada_em)}
                {config.ultimo_status && (
                  <span className="text-grey-400 font-normal">
                    {" "}
                    · {ROTULO_STATUS[config.ultimo_status] ?? config.ultimo_status}
                  </span>
                )}
              </p>

              {config.ultimo_detalhe && (
                <p className="text-grey-400 mt-1 text-sm">{config.ultimo_detalhe}</p>
              )}

              <p className="text-grey-400 mt-3 text-xs">
                O sistema confere todo dia ao meio dia e só grava{" "}
                {config.ativo
                  ? `na ${DIAS[config.dia_semana]}`
                  : "quando o agendamento está ligado"}
                . Os números ficam em{" "}
                <Link href={`/datasets/${CONJUNTO}`} className="text-primary underline">
                  Dados
                </Link>
                .
              </p>
            </div>
          </Secao>
        </>
      )}
    </Pagina>
  );
}
