"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";
import { IconAlertCircle, IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

/** Toast no padrão harpix, copiado de hpx-svc-front: cartão branco, borda na
 *  cor da variante, ícone à esquerda, título em grey-600 e descrição opcional
 *  em grey-400. Canto inferior direito, cinco segundos.
 *
 *  É `sonner.custom` e não `sonner.success` de propósito: o visual padrão do
 *  sonner não é o nosso, e usar os dois deixaria metade dos avisos com uma cara
 *  e metade com outra. */

type Variante = "padrao" | "sucesso" | "erro" | "alerta";

const BORDA: Record<Variante, string> = {
  padrao: "border-grey-300",
  sucesso: "border-success",
  erro: "border-error",
  alerta: "border-alert",
};

const ICONE: Record<Variante, ReactNode> = {
  padrao: null,
  sucesso: <IconCheck className="text-success mt-0.5 size-4 shrink-0" />,
  erro: <IconAlertCircle className="text-error mt-0.5 size-4 shrink-0" />,
  alerta: <IconExclamationCircle className="text-alert mt-0.5 size-4 shrink-0" />,
};

function Cartao({
  titulo,
  descricao,
  variante = "padrao",
}: {
  titulo: string;
  descricao?: string;
  variante?: Variante;
}) {
  return (
    <div
      className={twMerge(
        "flex w-[min(22rem,calc(100vw-2rem))] items-start gap-2 rounded-md border bg-white px-3 py-2 shadow-md",
        BORDA[variante],
      )}
    >
      {ICONE[variante]}
      <div className="flex min-w-0 flex-col">
        <span className="text-grey-600 text-sm font-medium">{titulo}</span>
        {descricao && <p className="text-grey-400 text-sm">{descricao}</p>}
      </div>
    </div>
  );
}

function mostrar(titulo: string, descricao?: string, variante: Variante = "padrao") {
  return sonner.custom(() => <Cartao titulo={titulo} descricao={descricao} variante={variante} />, {
    duration: 5000,
  });
}

export const aviso = {
  info: (titulo: string, descricao?: string) => mostrar(titulo, descricao, "padrao"),
  sucesso: (titulo: string, descricao?: string) => mostrar(titulo, descricao, "sucesso"),
  erro: (titulo: string, descricao?: string) => mostrar(titulo, descricao, "erro"),
  alerta: (titulo: string, descricao?: string) => mostrar(titulo, descricao, "alerta"),
};
