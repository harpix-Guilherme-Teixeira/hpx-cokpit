import type { ReactNode } from "react";

type Props = {
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
};

/** Mesma moldura de login dos outros sistemas da harpix, copiada de
 *  hpx-svc-front/src/components/auth-layout.tsx: card centralizado sobre
 *  grey-200, largura de leitura, marca em minúscula no laranja. */
export function AuthLayout({ titulo, subtitulo, children }: Props) {
  return (
    <main className="bg-grey-200 flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-grey-300/60 bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <span className="text-primary text-2xl font-bold lowercase">harpix</span>
          {!!titulo && <h1 className="text-grey-600 text-xl font-semibold">{titulo}</h1>}
          {!!subtitulo && <p className="text-grey-400 text-sm">{subtitulo}</p>}
        </div>

        {children}
      </div>
    </main>
  );
}
