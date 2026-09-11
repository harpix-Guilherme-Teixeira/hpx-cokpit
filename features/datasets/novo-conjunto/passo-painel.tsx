"use client";

import { Selecao } from "@/componentes/ui/selecao";
import { ROTULO_TIPO_CARD } from "@/lib/painel/tipos";
import type { CriacaoConjunto } from "./use-novo-conjunto";

type PassoPainelProps = { criacao: CriacaoConjunto };

export function PassoPainel({ criacao }: PassoPainelProps) {
  const { paineis, painelId, setPainelId, sugestoes, escolhidos, alternarCard } = criacao;

  return (
    <div className="flex flex-col gap-5">
      <Selecao
        rotulo="Aparece no painel"
        value={painelId}
        onChange={(e) => setPainelId(e.target.value)}
        dica={
          painelId
            ? "Vou criar uma faixa nesse painel com os cards marcados abaixo."
            : "Sem painel, o conjunto fica só na área de Dados e não aparece em lugar nenhum."
        }
      >
        <option value="">Nenhum, só guardar os dados</option>
        {paineis.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </Selecao>

      {painelId && (
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-grey-600 text-sm font-medium">Cards a criar</span>
            <p className="text-grey-400 text-xs">
              Sugeridos a partir do que você definiu. Tudo continua editável depois em Personalizar.
            </p>
          </div>

          {sugestoes.length === 0 ? (
            <p className="text-grey-400 text-xs">
              Nenhuma sugestão ainda. Volte e defina ao menos uma coluna.
            </p>
          ) : (
            sugestoes.map((s) => (
              <label
                key={s.chave}
                className="border-grey-300/60 flex cursor-pointer gap-3 rounded-lg border p-3"
              >
                <input
                  type="checkbox"
                  checked={escolhidos.has(s.chave)}
                  onChange={() => alternarCard(s.chave)}
                  className="accent-primary mt-0.5 size-4"
                />
                <span className="min-w-0">
                  <span className="text-grey-600 block text-sm font-medium">
                    {s.titulo}
                    <span className="text-grey-400 ml-2 text-xs font-normal">
                      {ROTULO_TIPO_CARD[s.tipo]}
                    </span>
                  </span>
                  <span className="text-grey-400 block text-xs">{s.definicao}</span>
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
