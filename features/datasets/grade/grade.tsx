"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { ROTULO_FORMATO } from "@/lib/painel/formato";
import type { Campo, Registro } from "@/lib/painel/tipos";
import { Celula } from "./celula";
import { useGrade } from "./use-grade";

type GradeProps = {
  conjuntoId: number;
  campos: Campo[];
  registros: Registro[];
  autores: Record<string, string>;
};

const ROTULO_TIPO: Record<Campo["tipo"], string> = {
  texto: "texto",
  numero: "número",
  data: "data",
  opcao: "opção",
  booleano: "sim ou não",
};

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Grade({ conjuntoId, campos, registros, autores }: GradeProps) {
  const {
    linhas,
    selecionados,
    ocupado,
    dialogo,
    editar,
    adicionar,
    alternar,
    alternarTodos,
    excluirSelecionados,
  } = useGrade({ conjuntoId, campos, registros });

  const todos = linhas.length > 0 && selecionados.size === linhas.length;

  return (
    <div className="flex flex-col gap-3">
      {dialogo}

      <div className="flex flex-wrap items-center gap-2">
        <Botao tom="contorno" tamanho="p" onClick={adicionar} disabled={ocupado}>
          <IconPlus size={14} />
          Nova linha
        </Botao>
        {selecionados.size > 0 && (
          <Botao tom="contorno" tamanho="p" onClick={excluirSelecionados} disabled={ocupado}>
            <IconTrash size={14} />
            Apagar {selecionados.size}
          </Botao>
        )}
        <span className="text-grey-400 ml-auto text-xs">
          Clique na célula para editar. Enter grava, Esc desfaz.
        </span>
      </div>

      <div className="border-grey-300/60 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-grey-100">
            <tr>
              <th className="border-grey-300/60 w-10 border-b px-3 py-2">
                <input
                  type="checkbox"
                  checked={todos}
                  onChange={alternarTodos}
                  aria-label="Selecionar todas"
                  className="accent-primary size-4"
                />
              </th>
              {campos.map((c) => (
                <th
                  key={c.chave}
                  title={c.descricao ?? undefined}
                  className="border-grey-300/60 border-b px-2 py-2 text-left align-bottom"
                >
                  <span className="text-grey-600 block text-xs font-semibold whitespace-nowrap">
                    {c.nome}
                    {c.obrigatorio && <span className="text-error">*</span>}
                  </span>
                  <span className="text-grey-400 block text-[11px] font-normal whitespace-nowrap">
                    {c.tipo === "numero" ? ROTULO_FORMATO[c.formato] : ROTULO_TIPO[c.tipo]}
                    {c.unidade ? `, ${c.unidade}` : ""}
                  </span>
                </th>
              ))}
              <th className="border-grey-300/60 text-grey-400 border-b px-3 py-2 text-left text-xs font-normal whitespace-nowrap">
                Atualizado
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td
                  colSpan={campos.length + 2}
                  className="text-grey-400 px-4 py-10 text-center text-sm"
                >
                  Nenhuma linha ainda. Use Nova linha ou cole direto do Excel.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr
                  key={l.id}
                  className={selecionados.has(l.id) ? "bg-primary/5" : "hover:bg-grey-100"}
                >
                  <td className="border-grey-300/40 border-b px-3">
                    <input
                      type="checkbox"
                      checked={selecionados.has(l.id)}
                      onChange={() => alternar(l.id)}
                      aria-label={`Selecionar linha ${l.id}`}
                      className="accent-primary size-4"
                    />
                  </td>
                  {campos.map((c) => (
                    <td key={c.chave} className="border-grey-300/40 border-b p-0.5">
                      <Celula
                        campo={c}
                        valor={l.valores[c.chave]}
                        aoConfirmar={(texto) => editar(l.id, c.chave, texto)}
                      />
                    </td>
                  ))}
                  <td className="border-grey-300/40 text-grey-400 border-b px-3 text-xs whitespace-nowrap">
                    {quando(l.atualizado_em)}
                    {l.atualizado_por && autores[l.atualizado_por]
                      ? `, ${autores[l.atualizado_por]}`
                      : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
