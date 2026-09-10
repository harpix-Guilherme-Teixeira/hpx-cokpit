import { twMerge } from "tailwind-merge";
import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
  dica?: string;
};

/** Campo com rótulo, dica e erro. O erro é ligado ao input por
 *  `aria-describedby` e `aria-invalid`, senão leitor de tela anuncia o campo
 *  como válido enquanto a tela mostra vermelho. */
export function Campo({ rotulo, erro, dica, className, id, ...resto }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idErro = `${idCampo}-erro`;
  const idDica = `${idCampo}-dica`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-grey-600 text-sm font-medium">
        {rotulo}
        {resto.required && <span className="text-error ml-0.5">*</span>}
      </label>

      <input
        id={idCampo}
        aria-invalid={!!erro}
        aria-describedby={erro ? idErro : dica ? idDica : undefined}
        className={twMerge(
          "border-grey-300 text-grey-600 placeholder:text-grey-400 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-colors",
          "focus:border-primary focus:ring-primary/20 focus:ring-2",
          erro && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        {...resto}
      />

      {erro ? (
        <p id={idErro} className="text-error text-xs">
          {erro}
        </p>
      ) : dica ? (
        <p id={idDica} className="text-grey-400 text-xs">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
