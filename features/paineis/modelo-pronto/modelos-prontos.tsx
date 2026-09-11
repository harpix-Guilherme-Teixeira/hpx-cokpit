"use client";

import { IconBolt } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { MODELOS } from "@/lib/painel/modelos";
import { useModeloPronto } from "./use-modelo-pronto";

/** Um clique e o painel nasce inteiro: faixas, cards, tema e o conjunto de
 *  dados com as colunas certas, mais a linha desta semana já aberta. */
export function ModelosProntos() {
  const { criar, criando } = useModeloPronto();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {MODELOS.map((m) => (
        <div
          key={m.chave}
          className="border-grey-300/60 flex flex-col justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-grey-600 font-medium">{m.nome}</p>
            <p className="text-grey-400 mt-1 text-sm">{m.descricao}</p>
            <p className="text-grey-400 mt-2 text-xs">
              {m.faixas.length} faixas, {m.faixas.reduce((t, f) => t + f.cards.length, 0)} cards e o
              conjunto “{m.conjunto?.nome}” com {m.conjunto?.colunas.length} colunas, já com a linha
              de hoje aberta para você digitar.
            </p>
          </div>

          <Botao
            onClick={() => criar(m.chave)}
            disabled={criando !== null}
            className="self-start"
          >
            <IconBolt size={16} />
            {criando === m.chave ? "Criando..." : "Criar em um clique"}
          </Botao>
        </div>
      ))}
    </div>
  );
}
