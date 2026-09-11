"use server";

import { revalidatePath } from "next/cache";
import type { clienteServidor } from "@/lib/supabase/servidor";
import { exigirAutor } from "./autor";
import { converter } from "./converter";
import type { Campo } from "./tipos";

export type Resultado<T> = { ok: true; dado: T } | { ok: false; erro: string };

/** Teto de uma colagem. Acima disso a planilha provavelmente arrastou linhas
 *  vazias formatadas até o fim da aba, e gravar 60 mil linhas em branco não é o
 *  que ninguém quis. */
const TETO_COLAGEM = 5000;
const LOTE = 500;

async function lerCampos(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  conjuntoId: number,
): Promise<Campo[]> {
  const { data } = await supabase
    .from("dad_campo")
    .select(
      "id, conjunto_id, chave, nome, tipo, formato, casas, unidade, descricao, opcoes, obrigatorio, ordem",
    )
    .eq("conjunto_id", conjuntoId)
    .order("ordem");
  return (data ?? []) as Campo[];
}

/** Linha em branco, sem validação. É rascunho: os obrigatórios aparecem
 *  marcados na grade e cada célula valida quando é editada. Exigir tudo
 *  preenchido para a linha existir obrigaria a digitar num formulário à parte,
 *  que é o que a grade existe para evitar. */
export async function novaLinha(conjuntoId: number): Promise<Resultado<{ id: number }>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { data, error } = await contexto.supabase
    .from("dad_registro")
    .insert({ conjunto_id: conjuntoId, valores: {}, atualizado_por: contexto.usuario.id })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: { id: data.id } };
}

/** Grava UMA célula. Lê a linha, mescla e regrava, em vez de receber a linha
 *  inteira do navegador: se duas abas editassem colunas diferentes da mesma
 *  linha, mandar a linha inteira faria a segunda apagar a edição da primeira. */
export async function editarCelula(
  conjuntoId: number,
  registroId: number,
  chave: string,
  texto: string,
): Promise<Resultado<null>> {
  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase, usuario } = contexto;

  const campo = (await lerCampos(supabase, conjuntoId)).find((c) => c.chave === chave);
  if (!campo) return { ok: false, erro: "Essa coluna não existe mais. Recarregue a página." };

  const conversao = converter(texto, campo);
  if (!conversao.ok) return { ok: false, erro: conversao.erro };

  const { data: atual } = await supabase
    .from("dad_registro")
    .select("valores")
    .eq("id", registroId)
    .eq("conjunto_id", conjuntoId)
    .maybeSingle();

  if (!atual) return { ok: false, erro: "Essa linha não existe mais. Recarregue a página." };

  const { error } = await supabase
    .from("dad_registro")
    .update({
      valores: { ...(atual.valores as Record<string, unknown>), [chave]: conversao.valor },
      atualizado_por: usuario.id,
    })
    .eq("id", registroId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: null };
}

export async function excluirLinhas(
  conjuntoId: number,
  ids: number[],
): Promise<Resultado<{ apagadas: number }>> {
  if (ids.length === 0) return { ok: true, dado: { apagadas: 0 } };

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };

  const { error, count } = await contexto.supabase
    .from("dad_registro")
    .delete({ count: "exact" })
    .eq("conjunto_id", conjuntoId)
    .in("id", ids);

  if (error) return { ok: false, erro: error.message };
  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: { apagadas: count ?? 0 } };
}

/** Importa o bloco colado da planilha.
 *
 *  Grava só as linhas válidas e devolve quantas ficaram de fora. A prévia já
 *  mostrou quais têm erro e o botão dizia "importar N válidas", então pular as
 *  inválidas é o que a pessoa pediu, não uma surpresa.
 *
 *  A conversão roda de novo aqui, com o mesmo `converter` da prévia. O
 *  navegador não é fonte confiável de dado já convertido. */
export async function importarLinhas(
  conjuntoId: number,
  corpo: string[][],
  mapa: (string | null)[],
): Promise<Resultado<{ inseridas: number; puladas: number }>> {
  if (corpo.length === 0) return { ok: false, erro: "Nada para importar." };
  if (corpo.length > TETO_COLAGEM) {
    return {
      ok: false,
      erro: `São ${corpo.length} linhas, o teto é ${TETO_COLAGEM}. Confira se a planilha não arrastou linhas vazias até o fim da aba.`,
    };
  }

  const contexto = await exigirAutor();
  if (!contexto.ok) return { ok: false, erro: contexto.erro };
  const { supabase, usuario } = contexto;

  const campos = await lerCampos(supabase, conjuntoId);
  const porChave = new Map(campos.map((c) => [c.chave, c]));

  if (!mapa.some((chave) => chave && porChave.has(chave))) {
    return { ok: false, erro: "Nenhuma coluna colada corresponde a uma coluna do conjunto." };
  }

  const faltando = campos.filter((c) => c.obrigatorio && !mapa.includes(c.chave));
  if (faltando.length > 0) {
    return {
      ok: false,
      erro: `A colagem não tem as colunas obrigatórias: ${faltando.map((c) => c.nome).join(", ")}.`,
    };
  }

  const validas: Record<string, unknown>[] = [];
  let puladas = 0;

  for (const linha of corpo) {
    const valores: Record<string, unknown> = {};
    let ok = true;

    mapa.forEach((chave, j) => {
      if (!ok || !chave) return;
      const campo = porChave.get(chave);
      if (!campo) return;
      const conversao = converter(linha[j], campo);
      if (conversao.ok) valores[chave] = conversao.valor;
      else ok = false;
    });

    if (ok) validas.push(valores);
    else puladas += 1;
  }

  for (let i = 0; i < validas.length; i += LOTE) {
    const { error } = await supabase.from("dad_registro").insert(
      validas.slice(i, i + LOTE).map((valores) => ({
        conjunto_id: conjuntoId,
        valores,
        atualizado_por: usuario.id,
      })),
    );

    // Lote que falha no meio para tudo e diz quantas entraram. Seguir
    // gravando os lotes seguintes deixaria um buraco no meio da tabela que
    // ninguém saberia onde está.
    if (error) {
      revalidatePath(`/datasets/${conjuntoId}`);
      return {
        ok: false,
        erro: `Gravei ${i} de ${validas.length} linhas e o lote seguinte falhou: ${error.message}`,
      };
    }
  }

  revalidatePath(`/datasets/${conjuntoId}`);
  return { ok: true, dado: { inseridas: validas.length, puladas } };
}
