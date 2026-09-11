"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
import type { Formato } from "./formato";
import type { Tema } from "./tema";
import {
  EXIGIDO_POR_CARD,
  metricaPrecisaDeCampo,
  type ConfigCard,
  type PresetPeriodo,
  type TipoCampo,
  type TipoCard,
} from "./tipos";

export type Resultado<T> = { ok: true; dado: T } | { ok: false; erro: string };

function aoSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** A RLS já barra quem não está na lista, mas o erro dela chega como "0 linhas
 *  afetadas", que na tela vira silêncio. Conferir antes deixa a mensagem
 *  honesta. */
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
      erro: `${usuario.email} não está na lista de quem pode editar.`,
    };
  }

  return { ok: true as const, supabase, usuario };
}

/** ------------------------------------------------------------------
 *  Tema do painel
 *  ------------------------------------------------------------------ */

export async function salvarTema(
  painelId: number,
  tema: Partial<Tema>,
  cabecalho?: { titulo?: string; subtitulo?: string },
  periodoPadrao?: PresetPeriodo,
): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { error } = await contexto.supabase
    .from("pnl_painel")
    .update({
      tema,
      titulo: cabecalho?.titulo?.trim() || null,
      subtitulo: cabecalho?.subtitulo?.trim() || null,
      // O período padrão é do painel, não de quem olha. Só entra no update
      // quando veio, senão salvar a cor de um painel apagaria o recorte dele.
      ...(periodoPadrao
        ? { controles: [{ tipo: "periodo", rotulo: "Período", padrao: periodoPadrao }] }
        : {}),
      atualizado_por: contexto.usuario.id,
    })
    .eq("id", painelId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: null };
}

/** ------------------------------------------------------------------
 *  Faixas, os containers
 *  ------------------------------------------------------------------ */

export type FaixaEntrada = {
  titulo: string;
  descricao?: string;
  dica?: string;
  colunas: number;
  fundo: "transparente" | "superficie" | "acento";
  recolhivel: boolean;
  visivel: boolean;
};

export async function salvarFaixa(
  painelId: number,
  entrada: FaixaEntrada,
  id?: number,
): Promise<Resultado<{ id: number }>> {
  const titulo = entrada.titulo.trim();
  if (titulo.length < 2) return { ok: false, erro: "Dê um título à faixa." };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase } = contexto;

  const corpo = {
    painel_id: painelId,
    titulo,
    descricao: entrada.descricao?.trim() || null,
    dica: entrada.dica?.trim() || null,
    colunas: entrada.colunas,
    fundo: entrada.fundo,
    recolhivel: entrada.recolhivel,
    visivel: entrada.visivel,
  };

  if (id) {
    const { error } = await supabase.from("pnl_faixa").update(corpo).eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/panels/${painelId}`);
    return { ok: true, dado: { id } };
  }

  // A nova entra no fim. Ordem por posição, nunca por data de criação, senão
  // rearranjar depois dependeria de quando cada uma nasceu.
  const { data: ultima } = await supabase
    .from("pnl_faixa")
    .select("ordem")
    .eq("painel_id", painelId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("pnl_faixa")
    .insert({ ...corpo, ordem: (ultima?.ordem ?? -1) + 1 })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: { id: data.id } };
}

export async function excluirFaixa(id: number, painelId: number): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  // Os cards de dentro caem por cascade. A tela avisa quantos antes de chamar.
  const { error } = await contexto.supabase.from("pnl_faixa").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: null };
}

/** Reordena a lista inteira de faixas a partir da ordem que o arrastar
 *  produziu. Aqui vale reescrever tudo, ao contrário do card: são poucas e o
 *  arrastar entrega a lista final, não um passo. */
export async function reordenarFaixas(
  painelId: number,
  idsNaOrdem: number[],
): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  for (let i = 0; i < idsNaOrdem.length; i += 1) {
    const { error } = await contexto.supabase
      .from("pnl_faixa")
      .update({ ordem: i })
      .eq("id", idsNaOrdem[i])
      .eq("painel_id", painelId);
    if (error) return { ok: false, erro: error.message };
  }

  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: null };
}

/** ------------------------------------------------------------------
 *  Cards
 *  ------------------------------------------------------------------ */

export type CardEntrada = {
  faixaId: number;
  tipo: TipoCard;
  titulo: string;
  definicao: string;
  config: ConfigCard;
  largura: number;
};

/** Confere ANTES de gravar. Card salvo pela metade vira gráfico vazio na tela
 *  pública, sem explicação, e ninguém descobre qual campo faltou. */
function conferirCard(entrada: CardEntrada): string | null {
  if (entrada.titulo.trim().length < 2) return "Dê um título ao card.";

  // Regra de produto, não de banco: número sem frase que o explique foi
  // exatamente o que produziu os indicadores irreproduzíveis do painel anterior.
  if (entrada.definicao.trim().length < 10) {
    return "Escreva o que este número significa. É a frase que aparece embaixo dele no painel.";
  }

  const faltando = EXIGIDO_POR_CARD[entrada.tipo].filter((chave) => {
    const v = entrada.config[chave];
    return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
  });
  if (faltando.length > 0) return `Faltou preencher: ${faltando.join(", ")}.`;

  const { metrica, campoValor, campoData, comparar } = entrada.config;

  if (metrica && metricaPrecisaDeCampo(metrica) && !campoValor) {
    return "Essa métrica precisa de um campo para calcular. Contagem é a única que conta linha.";
  }

  // Comparar exige período, e período exige campo de data. Sem isso a variação
  // seria contra uma janela que não existe, que é como se inventa um delta.
  if (comparar && !campoData) {
    return "Para comparar com o período anterior, escolha o campo de data que o período recorta.";
  }

  return null;
}

export async function salvarCard(
  painelId: number,
  entrada: CardEntrada,
  id?: number,
): Promise<Resultado<{ id: number }>> {
  const problema = conferirCard(entrada);
  if (problema) return { ok: false, erro: problema };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase } = contexto;

  const corpo = {
    faixa_id: entrada.faixaId,
    tipo: entrada.tipo,
    titulo: entrada.titulo.trim(),
    definicao: entrada.definicao.trim(),
    config: entrada.config,
    largura: entrada.largura,
  };

  if (id) {
    const { error } = await supabase.from("pnl_card").update(corpo).eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/panels/${painelId}`);
    return { ok: true, dado: { id } };
  }

  const { data: ultimo } = await supabase
    .from("pnl_card")
    .select("ordem")
    .eq("faixa_id", entrada.faixaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("pnl_card")
    .insert({ ...corpo, ordem: (ultimo?.ordem ?? -1) + 1 })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: { id: data.id } };
}

export async function excluirCard(id: number, painelId: number): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { error } = await contexto.supabase.from("pnl_card").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: null };
}

/** Aplica o resultado do arrastar: o card pode ter mudado de faixa E de
 *  posição na mesma ação, por isso as duas coisas vão juntas. */
export async function reordenarCards(
  painelId: number,
  faixaId: number,
  idsNaOrdem: number[],
): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  for (let i = 0; i < idsNaOrdem.length; i += 1) {
    const { error } = await contexto.supabase
      .from("pnl_card")
      .update({ faixa_id: faixaId, ordem: i })
      .eq("id", idsNaOrdem[i]);
    if (error) return { ok: false, erro: error.message };
  }

  revalidatePath(`/panels/${painelId}`);
  return { ok: true, dado: null };
}

/** ------------------------------------------------------------------
 *  Colunas de um conjunto
 *  ------------------------------------------------------------------ */

export type ColunaEntrada = {
  nome: string;
  tipo: TipoCampo;
  formato: Formato;
  casas: number;
  unidade?: string;
  descricao?: string;
  opcoes: string[];
  obrigatorio: boolean;
};

export async function salvarColuna(
  conjuntoId: number,
  entrada: ColunaEntrada,
  id?: number,
): Promise<Resultado<{ id: number }>> {
  const nome = entrada.nome.trim();
  if (nome.length < 1) return { ok: false, erro: "Dê um nome à coluna." };

  const chave = aoSlug(nome);
  if (!chave) return { ok: false, erro: "Esse nome não gera uma chave válida. Use letras." };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase } = contexto;

  const { data: colidiu } = await supabase
    .from("dad_campo")
    .select("id")
    .eq("conjunto_id", conjuntoId)
    .eq("chave", chave)
    .maybeSingle();

  // Chave repetida sobrescreveria o valor dentro do jsonb sem erro nenhum, e
  // metade do dado sumiria em silêncio.
  if (colidiu && colidiu.id !== id) {
    return { ok: false, erro: `Já existe uma coluna com a chave "${chave}".` };
  }

  const corpo = {
    conjunto_id: conjuntoId,
    chave,
    nome,
    tipo: entrada.tipo,
    // Formato só faz sentido em número. Guardar "porcentagem" numa coluna de
    // texto deixaria a tela tentando pôr % em nome de conector.
    formato: entrada.tipo === "numero" ? entrada.formato : "texto",
    casas: entrada.tipo === "numero" ? entrada.casas : 0,
    unidade: entrada.unidade?.trim() || null,
    descricao: entrada.descricao?.trim() || null,
    opcoes: entrada.tipo === "opcao" ? entrada.opcoes.filter((o) => o.trim()) : [],
    obrigatorio: entrada.obrigatorio,
  };

  if (id) {
    const { error } = await supabase.from("dad_campo").update(corpo).eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/datasets/${conjuntoId}`);
    return { ok: true, dado: { id } };
  }

  const { data: ultima } = await supabase
    .from("dad_campo")
    .select("ordem")
    .eq("conjunto_id", conjuntoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("dad_campo")
    .insert({ ...corpo, ordem: (ultima?.ordem ?? -1) + 1 })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: { id: data.id } };
}

export async function excluirColuna(id: number, conjuntoId: number): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  // O valor já digitado nas linhas continua no jsonb, órfão. É de propósito:
  // apagar coluna por engano não pode levar junto dado que ninguém recupera.
  // Recriar a coluna com a mesma chave traz tudo de volta.
  const { error } = await contexto.supabase.from("dad_campo").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: null };
}

export async function reordenarColunas(
  conjuntoId: number,
  idsNaOrdem: number[],
): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  for (let i = 0; i < idsNaOrdem.length; i += 1) {
    const { error } = await contexto.supabase
      .from("dad_campo")
      .update({ ordem: i })
      .eq("id", idsNaOrdem[i])
      .eq("conjunto_id", conjuntoId);
    if (error) return { ok: false, erro: error.message };
  }

  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: null };
}
