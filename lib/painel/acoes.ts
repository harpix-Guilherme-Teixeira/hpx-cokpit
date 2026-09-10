"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
import type { ConfigCard, PresetPeriodo, TipoCampo } from "./tipos";
import { MODELOS, type Modelo } from "./modelos";
import { PRESETS, TEMA_CLARO } from "./tema";

export type Resultado<T> = { ok: true; dado: T } | { ok: false; erro: string };

/** Slug legível a partir do nome. Sem acento, sem símbolo, sem espaço. */
function aoSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug livre. A coluna tem UNIQUE, então uma colisão viraria erro cru de
 *  banco na cara da pessoa; aqui ela vira `nome-2`, `nome-3`. */
async function slugLivre(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  tabela: "pnl_painel",
  base: string,
) {
  const raiz = aoSlug(base) || "painel";
  const { data } = await supabase.from(tabela).select("slug").like("slug", `${raiz}%`);
  const usados = new Set((data ?? []).map((l: { slug: string }) => l.slug));
  if (!usados.has(raiz)) return raiz;
  for (let n = 2; n < 500; n += 1) {
    const tentativa = `${raiz}-${n}`;
    if (!usados.has(tentativa)) return tentativa;
  }
  return `${raiz}-${Date.now()}`;
}

/** Toda ação passa por aqui. A RLS já barra quem não está na lista, mas o erro
 *  dela chega como "0 linhas afetadas", que na tela vira um silêncio confuso.
 *  Conferir antes deixa a mensagem honesta. */
async function exigirAutor() {
  const usuario = await usuarioAtual();
  if (!usuario?.email) {
    return { ok: false as const, erro: "Sua sessão expirou. Entre de novo." };
  }

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("seg_autorizado")
    .select("email")
    .eq("email", usuario.email)
    .maybeSingle();

  if (!data) {
    return {
      ok: false as const,
      erro: `${usuario.email} não está na lista de quem pode editar. Entrar nela é migration, não é tela.`,
    };
  }

  return { ok: true as const, supabase, usuario };
}

/** ------------------------------------------------------------------
 *  Painéis
 *  ------------------------------------------------------------------ */

export type NovoPainelEntrada = {
  nome: string;
  descricao?: string;
  slug?: string;
  periodoPadrao?: PresetPeriodo;
  publicado?: boolean;
  /** Chave em MODELOS, ou vazio para começar em branco. O modelo traz tema,
   *  faixas, cards E o conjunto de dados com as colunas certas. */
  modelo?: string;
};

export async function criarPainel(entrada: NovoPainelEntrada): Promise<Resultado<{ id: number }>> {
  const limpo = entrada.nome.trim();
  if (limpo.length < 2) return { ok: false, erro: "Dê um nome ao painel." };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase, usuario } = contexto;

  // Slug digitado é normalizado do mesmo jeito que o derivado do nome: sem
  // isso, alguém digitaria "Semana 1" e o endereço público sairia com espaço.
  const slug = await slugLivre(supabase, "pnl_painel", entrada.slug?.trim() || limpo);

  const { data, error } = await supabase
    .from("pnl_painel")
    .insert({
      nome: limpo,
      slug,
      descricao: entrada.descricao?.trim() || null,
      publicado: entrada.publicado ?? false,
      // O painel já nasce com o controle de período, que é o que responde ao
      // pedido de comparar com datas anteriores. Nascer sem ele obrigaria a
      // pessoa a descobrir sozinha que a comparação existe.
      controles: [{ tipo: "periodo", rotulo: "Período", padrao: entrada.periodoPadrao ?? "30d" }],
      atualizado_por: usuario.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  if (entrada.modelo) {
    const modelo = MODELOS.find((m) => m.chave === entrada.modelo);
    if (modelo) await aplicarModelo(supabase, data.id, modelo, usuario.id);
  }

  revalidatePath("/dashboard");
  return { ok: true, dado: { id: data.id } };
}

/** Monta o painel a partir de um modelo: tema, cabeçalho, o conjunto de dados
 *  com as colunas certas, as faixas e os cards já apontando para o conjunto.
 *
 *  Falha aqui não derruba o painel, que já está criado. Painel vazio é
 *  recuperável, painel que não existe porque a decoração falhou, não. */
async function aplicarModelo(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  painelId: number,
  modelo: Modelo,
  usuarioId: string,
) {
  const preset = PRESETS.find((p) => p.chave === modelo.preset)?.tema ?? TEMA_CLARO;

  await supabase
    .from("pnl_painel")
    .update({
      tema: preset,
      titulo: modelo.cabecalho?.titulo ?? null,
      subtitulo: modelo.cabecalho?.subtitulo ?? null,
      atualizado_por: usuarioId,
    })
    .eq("id", painelId);

  // O conjunto vem junto porque os painéis originais leem o Jira ao vivo e
  // aqui o dado é manual. Sem ele o modelo entregaria cards sem fonte.
  let conjuntoId: number | undefined;

  if (modelo.conjunto) {
    const chaveBase = aoSlug(modelo.conjunto.nome);
    const { data: jaExiste } = await supabase
      .from("dad_conjunto")
      .select("id")
      .eq("chave", chaveBase)
      .maybeSingle();

    if (jaExiste) {
      // Reaproveita em vez de criar "medicoes-da-semana-2": dois conjuntos com
      // as mesmas colunas viram duas verdades sobre o mesmo assunto.
      conjuntoId = jaExiste.id;
    } else {
      const { data: novo } = await supabase
        .from("dad_conjunto")
        .insert({
          nome: modelo.conjunto.nome,
          chave: chaveBase,
          descricao: modelo.conjunto.descricao,
          atualizado_por: usuarioId,
        })
        .select("id")
        .single();

      conjuntoId = novo?.id;

      if (conjuntoId) {
        await supabase.from("dad_campo").insert(
          modelo.conjunto.colunas.map((c, i) => ({
            conjunto_id: conjuntoId,
            chave: aoSlug(c.nome),
            nome: c.nome,
            tipo: c.tipo,
            formato: c.tipo === "numero" ? (c.formato ?? "inteiro") : "texto",
            casas: c.tipo === "numero" ? (c.casas ?? 0) : 0,
            opcoes: [],
            ordem: i,
          })),
        );
      }
    }
  }

  const campoData = modelo.conjunto?.colunas.find((c) => c.tipo === "data");

  for (let i = 0; i < modelo.faixas.length; i += 1) {
    const fm = modelo.faixas[i];

    const { data: faixa } = await supabase
      .from("pnl_faixa")
      .insert({
        painel_id: painelId,
        titulo: fm.titulo,
        descricao: fm.descricao ?? null,
        dica: fm.dica ?? null,
        colunas: fm.colunas,
        fundo: fm.fundo ?? "transparente",
        ordem: i,
      })
      .select("id")
      .single();

    if (!faixa) continue;

    await supabase.from("pnl_card").insert(
      fm.cards.map((cm, j) => ({
        faixa_id: faixa.id,
        tipo: cm.tipo ?? "numero",
        titulo: cm.titulo,
        definicao: cm.definicao,
        config: {
          ...(cm.tipo === "texto"
            ? { texto: cm.texto }
            : {
                conjuntoId,
                metrica: cm.metrica ?? "ultimo",
                campoValor: cm.coluna ? aoSlug(cm.coluna) : undefined,
                campoCategoria: cm.categoria ? aoSlug(cm.categoria) : undefined,
                // Só liga o período quando o conjunto tem data. Ligar sem data
                // deixaria o card comparando contra uma janela inexistente.
                campoData: campoData && cm.comparar ? aoSlug(campoData.nome) : undefined,
                comparar: !!cm.comparar && !!campoData,
                subirEhBom: cm.subirEhBom,
              }),
          destaque: cm.destaque,
        } as ConfigCard,
        largura: cm.largura ?? 1,
        ordem: j,
      })),
    );
  }
}

export async function renomearPainel(id: number, nome: string): Promise<Resultado<null>> {
  const limpo = nome.trim();
  if (limpo.length < 2) return { ok: false, erro: "O nome não pode ficar vazio." };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { error } = await contexto.supabase
    .from("pnl_painel")
    .update({ nome: limpo, atualizado_por: contexto.usuario.id })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/panels/${id}`);
  return { ok: true, dado: null };
}

export async function publicarPainel(id: number, publicado: boolean): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { error } = await contexto.supabase
    .from("pnl_painel")
    .update({ publicado, atualizado_por: contexto.usuario.id })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/panels/${id}`);
  return { ok: true, dado: null };
}

export async function excluirPainel(id: number): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  // Faixas e cards caem junto por ON DELETE CASCADE. Os conjuntos de dados NÃO
  // caem: eles são de quem digitou, não do painel, e podem estar em outro.
  const { error } = await contexto.supabase.from("pnl_painel").delete().eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard");
  return { ok: true, dado: null };
}

/** ------------------------------------------------------------------
 *  Conjuntos de dados
 *  ------------------------------------------------------------------ */

export type ColunaNova = { nome: string; tipo: TipoCampo; opcoes?: string[] };

export type NovoConjuntoEntrada = {
  nome: string;
  descricao?: string;
  colunas: ColunaNova[];
  /** Painel onde este conjunto vai aparecer. Escolhido, o conjunto já nasce
   *  com uma faixa e um card por coluna numérica, mais a tabela. Dado que
   *  nasce invisível é dado que ninguém confere, e um mês depois ninguém sabe
   *  se está certo. */
  painelId?: number;
};

export async function criarConjunto(
  entrada: NovoConjuntoEntrada,
): Promise<Resultado<{ id: number }>> {
  const limpo = entrada.nome.trim();
  if (limpo.length < 2) return { ok: false, erro: "Dê um nome ao conjunto." };

  const colunas = entrada.colunas.filter((c) => c.nome.trim().length > 0);
  if (colunas.length === 0) {
    return {
      ok: false,
      erro: "Um conjunto sem coluna nenhuma não guarda nada. Crie ao menos uma.",
    };
  }

  // Duas colunas com o mesmo nome viram a mesma chave, e a segunda sobrescreve
  // a primeira dentro do jsonb sem erro nenhum. Barrar aqui é mais barato do
  // que descobrir depois que metade dos dados sumiu.
  const chaves = colunas.map((c) => aoSlug(c.nome));
  const repetida = chaves.find((c, i) => chaves.indexOf(c) !== i);
  if (repetida) {
    return {
      ok: false,
      erro: `Duas colunas viram a mesma chave "${repetida}". Mude um dos nomes.`,
    };
  }

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase, usuario } = contexto;

  const chave = aoSlug(limpo) || `conjunto-${Date.now()}`;

  const { data: existe } = await supabase
    .from("dad_conjunto")
    .select("id")
    .eq("chave", chave)
    .maybeSingle();

  if (existe) return { ok: false, erro: `Já existe um conjunto chamado "${limpo}".` };

  const { data, error } = await supabase
    .from("dad_conjunto")
    .insert({
      nome: limpo,
      chave,
      descricao: entrada.descricao?.trim() || null,
      atualizado_por: usuario.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  const { error: erroCampos } = await supabase.from("dad_campo").insert(
    colunas.map((c, i) => ({
      conjunto_id: data.id,
      chave: aoSlug(c.nome),
      nome: c.nome.trim(),
      tipo: c.tipo,
      opcoes: c.tipo === "opcao" ? (c.opcoes ?? []) : [],
      ordem: i,
    })),
  );

  // Conjunto sem coluna é casca. Se a segunda gravação falhar, desfaz a
  // primeira: melhor não existir do que existir pela metade e a pessoa achar
  // que criou.
  if (erroCampos) {
    await supabase.from("dad_conjunto").delete().eq("id", data.id);
    return { ok: false, erro: `Não consegui criar as colunas: ${erroCampos.message}` };
  }

  if (entrada.painelId) {
    await montarFaixaDoConjunto(supabase, entrada.painelId, data.id, limpo, colunas);
    revalidatePath(`/panels/${entrada.painelId}`);
  }

  revalidatePath("/datasets");
  return { ok: true, dado: { id: data.id } };
}

/** Monta a faixa inicial do conjunto no painel escolhido.
 *
 *  Um card por coluna numérica, mais uma tabela com tudo. A definição de cada
 *  card sai da descrição da coluna, e quando ela não existe, de uma frase que
 *  diz de onde o número vem. Card sem definição não passaria na conferência do
 *  editor, e criar aqui um que não passaria lá seria incoerente.
 *
 *  Falha aqui NÃO derruba a criação do conjunto: o dado já está salvo, e
 *  perder a tabela inteira porque a decoração falhou seria desproporcional. */
async function montarFaixaDoConjunto(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  painelId: number,
  conjuntoId: number,
  nomeConjunto: string,
  colunas: ColunaNova[],
) {
  const { data: ultima } = await supabase
    .from("pnl_faixa")
    .select("ordem")
    .eq("painel_id", painelId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const numericas = colunas.filter((c) => c.tipo === "numero");
  const totalCards = numericas.length + 1;
  const colunasDaFaixa = Math.min(4, Math.max(1, totalCards));

  const { data: faixa, error } = await supabase
    .from("pnl_faixa")
    .insert({
      painel_id: painelId,
      titulo: nomeConjunto,
      descricao: null,
      colunas: colunasDaFaixa,
      ordem: (ultima?.ordem ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !faixa) return;

  // Tipado na mão porque os dois formatos de card têm config diferente e o
  // inferido do primeiro elemento não aceitaria o segundo.
  const cards: {
    faixa_id: number;
    tipo: string;
    titulo: string;
    definicao: string;
    config: ConfigCard;
    largura: number;
    ordem: number;
  }[] = numericas.map((c, i) => ({
    faixa_id: faixa.id,
    tipo: "numero",
    titulo: c.nome.trim(),
    definicao: `Soma de ${c.nome.trim()} no conjunto ${nomeConjunto}. Dado manual.`,
    config: {
      conjuntoId,
      metrica: "soma" as const,
      campoValor: aoSlug(c.nome),
      destaque: i === 0,
    },
    largura: 1,
    ordem: i,
  }));

  cards.push({
    faixa_id: faixa.id,
    tipo: "tabela",
    titulo: `${nomeConjunto}, linhas`,
    definicao: `Todas as linhas digitadas no conjunto ${nomeConjunto}, com as colunas na ordem em que foram criadas.`,
    config: { conjuntoId, colunas: colunas.map((c) => aoSlug(c.nome)) },
    largura: colunasDaFaixa,
    ordem: numericas.length,
  });

  await supabase.from("pnl_card").insert(cards);
}

export async function excluirConjunto(id: number): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  // Campos e registros caem por cascade. Card que apontava para este conjunto
  // NÃO cai: ele fica órfão e a tela do painel diz "fonte removida", que é
  // melhor do que sumir com o card e ninguém entender o que aconteceu.
  const { error } = await contexto.supabase.from("dad_conjunto").delete().eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/datasets");
  return { ok: true, dado: null };
}
