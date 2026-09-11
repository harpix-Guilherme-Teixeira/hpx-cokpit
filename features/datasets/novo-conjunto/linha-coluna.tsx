"use client";

import { useState } from "react";
import { IconChevronDown, IconChevronRight, IconChevronUp, IconTrash } from "@tabler/icons-react";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { EXEMPLO_FORMATO, ROTULO_FORMATO, type Formato } from "@/lib/painel/formato";
import { ROTULO_PAPEL, type PapelCampo, type TipoCampo } from "@/lib/painel/tipos";
import type { ColunaEmEdicao } from "./use-novo-conjunto";

type LinhaColunaProps = {
  coluna: ColunaEmEdicao;
  primeira: boolean;
  ultima: boolean;
  aoMudar: (m: Partial<ColunaEmEdicao>) => void;
  aoRemover: () => void;
  aoMover: (direcao: -1 | 1) => void;
};

const TIPOS: { valor: TipoCampo; rotulo: string }[] = [
  { valor: "texto", rotulo: "Texto" },
  { valor: "numero", rotulo: "Número" },
  { valor: "data", rotulo: "Data" },
  { valor: "opcao", rotulo: "Opção" },
  { valor: "booleano", rotulo: "Sim ou não" },
];

const FORMATOS: Formato[] = ["inteiro", "decimal", "porcentagem", "horas", "moeda"];

/** Papéis que fazem sentido para cada tipo. Oferecer "status" numa coluna de
 *  data criaria sugestão de card que nunca funciona. */
function papeisDoTipo(tipo: TipoCampo): PapelCampo[] {
  if (tipo === "data") return ["data_evento", "data_conclusao", "periodo"];
  if (tipo === "opcao" || tipo === "texto") return ["titulo", "status", "responsavel"];
  return [];
}

export function LinhaColuna({
  coluna,
  primeira,
  ultima,
  aoMudar,
  aoRemover,
  aoMover,
}: LinhaColunaProps) {
  const [aberto, setAberto] = useState(false);
  const papeis = papeisDoTipo(coluna.tipo);

  return (
    <div className="border-grey-300/60 rounded-lg border">
      <div className="flex items-start gap-2 p-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar detalhes" : "Abrir detalhes"}
          aria-expanded={aberto}
          className="text-grey-400 hover:text-grey-600 mt-2 rounded p-1"
        >
          {aberto ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </button>

        <div className="flex-1">
          <Campo
            aria-label="Nome da coluna"
            placeholder="Nome da coluna"
            value={coluna.nome}
            onChange={(e) => aoMudar({ nome: e.target.value })}
          />
        </div>

        <div className="w-32">
          <Selecao
            aria-label="Tipo"
            value={coluna.tipo}
            onChange={(e) => {
              const tipo = e.target.value as TipoCampo;
              // Papel que não serve para o tipo novo sai junto, senão fica
              // um "status" pendurado numa coluna de número.
              const papel = papeisDoTipo(tipo).includes(coluna.papel as PapelCampo)
                ? coluna.papel
                : undefined;
              aoMudar({ tipo, papel });
            }}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Selecao>
        </div>

        <div className="mt-1 flex">
          <button
            type="button"
            onClick={() => aoMover(-1)}
            disabled={primeira}
            aria-label="Subir coluna"
            className="text-grey-400 hover:text-grey-600 rounded p-1 disabled:opacity-30"
          >
            <IconChevronUp size={15} />
          </button>
          <button
            type="button"
            onClick={() => aoMover(1)}
            disabled={ultima}
            aria-label="Descer coluna"
            className="text-grey-400 hover:text-grey-600 rounded p-1 disabled:opacity-30"
          >
            <IconChevronDown size={15} />
          </button>
          <button
            type="button"
            onClick={aoRemover}
            aria-label="Remover coluna"
            className="text-grey-400 hover:text-error rounded p-1"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {coluna.papel && !aberto && (
        <p className="text-grey-400 px-2 pb-2 pl-10 text-xs">{ROTULO_PAPEL[coluna.papel]}</p>
      )}

      {aberto && (
        <div className="border-grey-300/60 flex flex-col gap-3 border-t p-3">
          {papeis.length > 0 && (
            <Selecao
              rotulo="O que esta coluna é no item"
              value={coluna.papel ?? ""}
              onChange={(e) => aoMudar({ papel: (e.target.value || undefined) as PapelCampo })}
              dica="É o que faz o construtor sugerir contar por status e comparar com o período anterior."
            >
              <option value="">Nada em especial</option>
              {papeis.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </Selecao>
          )}

          {coluna.tipo === "numero" && (
            <div className="flex gap-2">
              <Selecao
                rotulo="Formato"
                value={coluna.formato}
                onChange={(e) => aoMudar({ formato: e.target.value as Formato })}
                dica={`Aparece assim: ${EXEMPLO_FORMATO[coluna.formato]}`}
              >
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_FORMATO[f]}
                  </option>
                ))}
              </Selecao>
              <div className="w-24">
                <Selecao
                  rotulo="Casas"
                  value={String(coluna.casas)}
                  onChange={(e) => aoMudar({ casas: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Selecao>
              </div>
            </div>
          )}

          {coluna.tipo === "opcao" && (
            <AreaTexto
              rotulo="Opções"
              rows={4}
              value={coluna.opcoes.join("\n")}
              onChange={(e) => aoMudar({ opcoes: e.target.value.split("\n") })}
              placeholder={"Análise\nPronto\nPendente"}
              dica="Uma por linha. O que não estiver na lista é recusado na digitação."
            />
          )}

          <Campo
            rotulo="Unidade"
            value={coluna.unidade ?? ""}
            onChange={(e) => aoMudar({ unidade: e.target.value })}
            placeholder="conectores, PRs"
          />

          <AreaTexto
            rotulo="O que esta coluna mede"
            rows={2}
            value={coluna.descricao ?? ""}
            onChange={(e) => aoMudar({ descricao: e.target.value })}
            dica="Aparece ao passar o mouse no cabeçalho da grade."
          />

          <label className="text-grey-500 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={coluna.obrigatorio}
              onChange={(e) => aoMudar({ obrigatorio: e.target.checked })}
              className="accent-primary size-4"
            />
            Obrigatória
          </label>
        </div>
      )}
    </div>
  );
}
