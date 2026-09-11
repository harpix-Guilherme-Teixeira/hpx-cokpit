import { clienteServidor } from "@/lib/supabase/servidor";
import { comPadrao, type Tema } from "./tema";
import type {
  Cadencia,
  Campo,
  Card,
  ConfigCard,
  ControlePainel,
  Faixa,
  Registro,
} from "./tipos";

export type FonteDoPainel = {
  id: number;
  nome: string;
  grao: "item" | "medicao";
  dono: string | null;
  cadencia: Cadencia;
  campos: Campo[];
  registros: Registro[];
};

export type PainelCompleto = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  titulo: string | null;
  subtitulo: string | null;
  publicado: boolean;
  /** Controles do topo, hoje só o período. Precisa vir na consulta: sem ele o
   *  painel abre sempre em 30 dias e o padrão escolhido na criação nunca vale. */
  controles: ControlePainel[];
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
  conjuntos: Record<number, FonteDoPainel>;
};

type FaixaComCards = PainelCompleto["faixas"][number] & { pnl_card?: Card[] };

/** Carrega o painel inteiro em DUAS idas ao banco.
 *
 *  A primeira traz painel, faixas e cards juntos, pela relação entre as
 *  tabelas. A versão anterior fazia painel, depois faixas, depois cards, depois
 *  dados: quatro idas em fila, cada uma custando uns 450 ms daqui até
 *  us-east-2, antes de pintar qualquer coisa. A segunda busca só os conjuntos
 *  que algum card usa, porque carregar todos traria linhas que nenhum card
 *  mostra. */
export async function carregarPainel(
  onde: { id: number } | { slug: string },
): Promise<PainelCompleto | null> {
  const supabase = await clienteServidor();

  const consulta = supabase
    .from("pnl_painel")
    .select(
      `id, slug, nome, descricao, titulo, subtitulo, publicado, controles, tema,
       pnl_faixa ( id, painel_id, titulo, descricao, dica, colunas, fundo, recolhivel, visivel, ordem,
         pnl_card ( id, faixa_id, tipo, titulo, definicao, config, largura, ordem ) )`,
    )
    .order("ordem", { referencedTable: "pnl_faixa" })
    .order("ordem", { referencedTable: "pnl_faixa.pnl_card" });

  const { data: painel } = await (
    "id" in onde ? consulta.eq("id", onde.id) : consulta.eq("slug", onde.slug)
  ).maybeSingle();

  if (!painel) return null;

  // A consulta aninhada devolve as faixas dentro do painel, e o tipo inferido
  // pelo cliente não casa com o nosso: o `unknown` no meio é o que diz ao
  // TypeScript que a forma conferida é a de baixo, não a dele.
  const faixasBrutas = ((painel as unknown as { pnl_faixa?: FaixaComCards[] }).pnl_faixa ?? []).map(
    ({ pnl_card, ...faixa }) => ({ ...faixa, cards: (pnl_card ?? []) as Card[] }),
  );

  const idsConjunto = [
    ...new Set(
      faixasBrutas
        .flatMap((f) => f.cards)
        .map((c) => (c.config as ConfigCard)?.conjuntoId)
        .filter((v): v is number => typeof v === "number"),
    ),
  ];

  const conjuntos: PainelCompleto["conjuntos"] = {};

  if (idsConjunto.length) {
    const [{ data: metas }, { data: campos }, { data: registros }] = await Promise.all([
      supabase.from("dad_conjunto").select("id, nome, grao, dono, cadencia").in("id", idsConjunto),
      supabase
        .from("dad_campo")
        .select(
          "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, papel, ordem",
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
        grao: m.grao,
        dono: m.dono,
        cadencia: m.cadencia,
        campos: (campos ?? []).filter((c) => c.conjunto_id === m.id) as Campo[],
        registros: (registros ?? []).filter((r) => r.conjunto_id === m.id) as Registro[],
      };
    }
  }

  const { pnl_faixa: _descartada, ...cabeca } = painel as typeof painel & { pnl_faixa?: unknown };

  return {
    ...(cabeca as Omit<PainelCompleto, "tema" | "faixas" | "conjuntos" | "controles"> & {
      tema: unknown;
    }),
    controles: (cabeca.controles as ControlePainel[] | null) ?? [],
    tema: comPadrao(cabeca.tema as Partial<Tema>),
    faixas: faixasBrutas as PainelCompleto["faixas"],
    conjuntos,
  };
}

/** Conjuntos disponíveis para o construtor oferecer como fonte. Só nome e
 *  campos: as linhas não entram porque o menu não precisa delas e elas podem
 *  ser milhares. */
export async function listarFontes() {
  const supabase = await clienteServidor();

  const [{ data: conjuntos }, { data: campos }] = await Promise.all([
    supabase.from("dad_conjunto").select("id, nome, chave, grao").order("nome"),
    supabase
      .from("dad_campo")
      .select(
        "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, papel, ordem",
      )
      .order("ordem"),
  ]);

  return (conjuntos ?? []).map((c) => ({
    ...c,
    campos: (campos ?? []).filter((x) => x.conjunto_id === c.id) as Campo[],
  }));
}
