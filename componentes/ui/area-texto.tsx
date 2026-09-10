import { twMerge } from "tailwind-merge";
import { useId, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function AreaTexto({ rotulo, erro, dica, className, id, ...resto }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-grey-600 text-sm font-medium">
        {rotulo}
      </label>
      <textarea
        id={idCampo}
        rows={3}
        aria-invalid={!!erro}
        className={twMerge(
          "border-grey-300 text-grey-600 placeholder:text-grey-400 w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors",
          "focus:border-primary focus:ring-primary/20 focus:ring-2",
          erro && "border-error",
          className,
        )}
        {...resto}
      />
      {erro ? (
        <p className="text-error text-xs">{erro}</p>
      ) : dica ? (
        <p className="text-grey-400 text-xs">{dica}</p>
      ) : null}
    </div>
  );
}
