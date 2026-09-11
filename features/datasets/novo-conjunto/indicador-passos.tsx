"use client";

import { twMerge } from "tailwind-merge";

type IndicadorPassosProps = {
  passos: string[];
  atual: number;
};

export function IndicadorPassos({ passos, atual }: IndicadorPassosProps) {
  return (
    <ol className="mb-5 flex items-center gap-1">
      {passos.map((p, i) => (
        <li key={p} className="flex flex-1 items-center gap-1">
          <span
            aria-current={i === atual ? "step" : undefined}
            className={twMerge(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              i < atual && "bg-primary/15 text-primary",
              i === atual && "bg-primary text-white",
              i > atual && "bg-grey-200 text-grey-400",
            )}
          >
            {i + 1}
          </span>
          {/* O nome do passo só aparece no atual: cinco rótulos lado a lado não
              cabem na largura da gaveta sem virar sopa de letra. */}
          {i === atual && <span className="text-grey-600 truncate text-xs font-medium">{p}</span>}
          {i < passos.length - 1 && <span className="bg-grey-300/70 h-px flex-1" />}
        </li>
      ))}
    </ol>
  );
}
