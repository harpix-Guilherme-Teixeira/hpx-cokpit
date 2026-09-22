import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import { Aviso, Pagina, Secao, TituloPagina, Vazio } from "@/componentes/layout/pagina";
import { Botao } from "@/componentes/ui/botao";
import { AtualizarDoJira } from "@/features/datasets/atualizar-jira/atualizar-jira";
import { ColarPlanilha } from "@/features/datasets/colar/colar-planilha";
import { GavetaColuna } from "@/features/datasets/coluna/gaveta-coluna";
import { Grade } from "@/features/datasets/grade/grade";
import { ROTULO_FORMATO } from "@/lib/painel/formato";
import type { Campo, Registro } from "@/lib/painel/tipos";
import { clienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** Acima disso a grade vira milhares de campos editáveis na mesma tela e o
 *  navegador engasga. O dado continua todo no banco e nos cards; só a grade
 *  mostra as mais recentes e diz que cortou. */
const TETO_GRADE = 1000;

const ROTULO_TIPO: Record<Campo["tipo"], string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  opcao: "Opção",
  booleano: "Sim ou não",
};

export default async function PaginaConjunto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conjuntoId = Number(id);
  if (!Number.isInteger(conjuntoId)) notFound();

  const supabase = await clienteServidor();

  const { data: conjunto } = await supabase
    .from("dad_conjunto")
    .select("id, chave, nome, descricao")
    .eq("id", conjuntoId)
    .maybeSingle();

  if (!conjunto) notFound();

  const [campos, registros, perfis] = await Promise.all([
    supabase
      .from("dad_campo")
      .select(
        "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, papel, ordem",
      )
      .eq("conjunto_id", conjuntoId)
      .order("ordem"),
    supabase
      .from("dad_registro")
      .select("id, conjunto_id, valores, atualizado_em, atualizado_por", { count: "exact" })
      .eq("conjunto_id", conjuntoId)
      .order("id", { ascending: false })
      .limit(TETO_GRADE),
    supabase.from("seg_perfil").select("id, nome"),
  ]);

  const listaCampos = (campos.data ?? []) as Campo[];
  // Mais recentes primeiro na busca, para o corte levar as antigas; na tela, a
  // ordem de digitação, que é como a pessoa lembra das linhas.
  const listaRegistros = ((registros.data ?? []) as Registro[]).reverse();
  const total = registros.count ?? listaRegistros.length;
  const autores = Object.fromEntries((perfis.data ?? []).map((p) => [p.id, p.nome]));

  return (
    <Pagina>
      <Link
        href="/datasets"
        className="text-grey-400 hover:text-grey-600 mb-4 inline-flex items-center gap-1 text-sm"
      >
        <IconArrowLeft size={16} />
        Dados
      </Link>

      <TituloPagina
        titulo={conjunto.nome}
        descricao={conjunto.descricao ?? undefined}
        acao={
          <div className="flex flex-wrap gap-2">
            {conjunto.chave === "review-semanal" && <AtualizarDoJira />}
            <ColarPlanilha conjuntoId={conjuntoId} campos={listaCampos} />
            <GavetaColuna conjuntoId={conjuntoId}>
              <Botao>
                <IconPlus size={16} />
                Nova coluna
              </Botao>
            </GavetaColuna>
          </div>
        }
      />

      <Secao titulo="Colunas" contador={listaCampos.length}>
        {listaCampos.length === 0 ? (
          <Vazio
            titulo="Nenhuma coluna"
            texto="Crie a primeira coluna para a grade aparecer. O tipo dela decide o que os cards vão conseguir calcular."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {listaCampos.map((c) => (
              <GavetaColuna key={c.id} conjuntoId={conjuntoId} coluna={c}>
                <button
                  type="button"
                  title={c.descricao ?? "Clique para editar"}
                  className="border-grey-300/60 hover:border-primary flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition-colors"
                >
                  <span className="text-grey-600 text-sm font-medium">
                    {c.nome}
                    {c.obrigatorio && <span className="text-error">*</span>}
                  </span>
                  <span className="bg-grey-200 text-grey-500 rounded-full px-2 py-0.5 text-[11px]">
                    {c.tipo === "numero" ? ROTULO_FORMATO[c.formato] : ROTULO_TIPO[c.tipo]}
                  </span>
                </button>
              </GavetaColuna>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Linhas" contador={total}>
        {registros.error ? (
          <Aviso>Não consegui ler as linhas: {registros.error.message}</Aviso>
        ) : listaCampos.length === 0 ? (
          <Vazio titulo="Sem colunas, sem grade" texto="Crie uma coluna acima." />
        ) : (
          <>
            {total > TETO_GRADE && (
              <p className="text-grey-400 mb-3 text-xs">
                Mostrando as {TETO_GRADE} linhas mais recentes de {total}. Os cards contam todas.
              </p>
            )}
            <Grade
              conjuntoId={conjuntoId}
              campos={listaCampos}
              registros={listaRegistros}
              autores={autores}
            />
          </>
        )}
      </Secao>
    </Pagina>
  );
}
