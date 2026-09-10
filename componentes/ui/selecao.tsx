import { twMerge } from "tailwind-merge";
import { useId, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo?: string;
  erro?: string;
  dica?: string;
};

export function Selecao({ rotulo, erro, dica, className, id, children, ...resto }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <label htmlFor={idCampo} className="text-grey-600 text-sm font-medium">
          {rotulo}
        </label>
      )}
      <select
        id={idCampo}
        aria-invalid={!!erro}
        className={twMerge(
          "border-grey-300 text-grey-600 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-colors",
          "focus:border-primary focus:ring-primary/20 focus:ring-2",
          erro && "border-error",
          className,
        )}
        {...resto}
      >
        {children}
      </select>
      {erro ? (
        <p className="text-error text-xs">{erro}</p>
      ) : dica ? (
        <p className="text-grey-400 text-xs">{dica}</p>
      ) : null}
    </div>
  );
}
