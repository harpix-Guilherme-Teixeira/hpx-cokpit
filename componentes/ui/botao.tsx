import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

const estilos = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  {
    variants: {
      tom: {
        primario: "bg-primary text-white hover:bg-primary/90",
        contorno: "border border-grey-300 text-grey-600 hover:bg-grey-200",
        fantasma: "text-grey-500 hover:bg-grey-200",
        perigo: "bg-error text-white hover:bg-error/90",
      },
      tamanho: {
        m: "h-10 px-4 text-sm",
        p: "h-8 px-3 text-xs",
        g: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { tom: "primario", tamanho: "m" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof estilos>;

export function Botao({ className, tom, tamanho, ...resto }: Props) {
  return <button className={twMerge(estilos({ tom, tamanho }), className)} {...resto} />;
}
