import { clienteServidor } from "@/lib/supabase/servidor";
import { comPadrao, type Tema } from "./tema";
import type { Campo, Card, ConfigCard, Faixa, Registro } from "./tipos";

export type PainelCompleto = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  titulo: string | null;
  subtitulo: string | null;
  publicado: boolean;
  tema: Tema;
  faixas: (Faixa & {
    dica: string | null;
    fundo: "transparente" | "superficie" | "acento";
    recolhivel: boolean;
    visivel: boolean;
    cards: Card[];
  })[];
  /** Conjuntos usados pelos cards, com campos e linhas. Vem tudo junto porque
   *  o painel inteiro é uma tela só: buscar por card faria N requisições e a
   *  tela abriria em ondas. */
  conjuntos: Record<number, { id: number; nome: string; campos: Campo[]; registros: Registro[] }>;
};

/** Carrega o painel inteiro em quatro consultas, sem laço.
 *
 *  A ordem importa: primeiro o painel, depois faixas, depois cards, e só então
 *  os conjuntos que os cards realmente usam. Carregar todos os conjuntos
 *  traria linhas que nenhum card mostra. */
export async function carregarPainel(
  onde: { id: number } | { slug: string },
): Promise<PainelCompleto | null> {
  const supabase = await clienteServidor();

  const consulta = supabase
    .from("pnl_painel")
    .select("id, slug, nome, descricao, titulo, subtitulo, publicado, tema");

  const { data: painel } = await (
    "id" in onde ? consulta.eq("id", onde.id) : consulta.eq("slug", onde.slug)
  ).maybeSingle();

  if (!painel) return null;

  const { data: faixas } = await supabase
    .from("pnl_faixa")
    .select("id, painel_id, titulo, descricao, dica, colunas, fundo, recolhivel, visivel, ordem")
    .eq("painel_id", painel.id)
    .order("ordem");

  const idsFaixa = (faixas ?? []).map((f) => f.id);

  const { data: cards } = idsFaixa.length
    ? await supabase
        .from("pnl_card")
        .select("id, faixa_id, tipo, titulo, definicao, config, largura, ordem")
        .in("faixa_id", idsFaixa)
        .order("ordem")
    : { data: [] as Card[] };

  // Só os conjuntos que algum card aponta.
  const idsConjunto = [
    ...new Set(
      (cards ?? [])
        .map((c) => (c.config as ConfigCard)?.conjuntoId)
        .filter((v): v is number => typeof v === "number"),
    ),
  ];

  const conjuntos: PainelCompleto["conjuntos"] = {};

  if (idsConjunto.length) {
    const [{ data: metas }, { data: campos }, { data: registros }] = await Promise.all([
      supabase.from("dad_conjunto").select("id, nome").in("id", idsConjunto),
      supabase
        .from("dad_campo")
        .select(
          "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, ordem",
        )
        .in("conjunto_id", idsConjunto)
        .order("ordem"),
      supabase
        .from("dad_registro")
        .select("id, conjunto_id, valores, atualizado_em, atualizado_por")
        .in("conjunto_id", idsConjunto)
        .order("id"),
    ]);

    for (const m of metas ?? []) {
      conjuntos[m.id] = {
        id: m.id,
        nome: m.nome,
        campos: (campos ?? []).filter((c) => c.conjunto_id === m.id) as Campo[],
        registros: (registros ?? []).filter((r) => r.conjunto_id === m.id) as Registro[],
      };
    }
  }

  return {
    ...painel,
    tema: comPadrao(painel.tema as Partial<Tema>),
    faixas: (faixas ?? []).map((f) => ({
      ...f,
      cards: (cards ?? []).filter((c) => c.faixa_id === f.id) as Card[],
    })) as PainelCompleto["faixas"],
    conjuntos,
  };
}

/** Conjuntos disponíveis para o construtor oferecer como fonte. Só nome e
 *  campos: as linhas não entram porque o menu não precisa delas e elas podem
 *  ser milhares. */
export async function listarFontes() {
  const supabase = await clienteServidor();

  const [{ data: conjuntos }, { data: campos }] = await Promise.all([
    supabase.from("dad_conjunto").select("id, nome, chave").order("nome"),
    supabase
      .from("dad_campo")
      .select(
        "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, ordem",
      )
      .order("ordem"),
  ]);

  return (conjuntos ?? []).map((c) => ({
    ...c,
    campos: (campos ?? []).filter((x) => x.conjunto_id === c.id) as Campo[],
  }));
}
