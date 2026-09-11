"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { paraTexto } from "@/lib/painel/converter";
import type { Campo } from "@/lib/painel/tipos";

type CelulaProps = {
  campo: Campo;
  valor: unknown;
  aoConfirmar: (texto: string) => boolean;
};

/** Célula da grade. Edita no lugar, grava ao sair do campo ou no Enter, e o
 *  Esc devolve o valor anterior sem gravar. Opção vira lista e sim ou não vira
 *  caixa, porque digitar "Análise" à mão é o jeito certo de criar uma quarta
 *  grafia da mesma opção. */
export function Celula({ campo, valor, aoConfirmar }: CelulaProps) {
  const original = paraTexto(valor, campo);
  const [texto, setTexto] = useState(original);

  useEffect(() => {
    setTexto(original);
  }, [original]);

  const faltaObrigatorio = campo.obrigatorio && original === "";

  const base = twMerge(
    "text-grey-600 w-full min-w-28 rounded bg-transparent px-2 py-1.5 text-sm outline-none",
    "focus:ring-primary/30 focus:bg-white focus:ring-2",
    faltaObrigatorio && "bg-error/5",
  );

  function confirmar() {
    if (texto === original) return;
    if (!aoConfirmar(texto)) setTexto(original);
  }

  if (campo.tipo === "booleano") {
    return (
      <input
        type="checkbox"
        checked={valor === true}
        onChange={(e) => aoConfirmar(e.target.checked ? "sim" : "não")}
        aria-label={campo.nome}
        className="accent-primary mx-2 size-4"
      />
    );
  }

  if (campo.tipo === "opcao" && campo.opcoes.length > 0) {
    return (
      <select
        value={original}
        onChange={(e) => aoConfirmar(e.target.value)}
        aria-label={campo.nome}
        aria-invalid={faltaObrigatorio}
        className={base}
      >
        <option value="">—</option>
        {campo.opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setTexto(original);
      }}
      placeholder={campo.tipo === "data" ? "dd/mm/aaaa" : undefined}
      inputMode={campo.tipo === "numero" ? "decimal" : undefined}
      aria-label={campo.nome}
      aria-invalid={faltaObrigatorio}
      className={twMerge(base, campo.tipo === "numero" && "text-right tabular-nums")}
    />
  );
}
