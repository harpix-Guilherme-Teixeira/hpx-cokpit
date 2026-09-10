import type { ReactNode } from "react";

/** Padrão de página da área interna.
 *
 *  Existe para o conteúdo parar de flutuar solto dentro do `main`. Três peças,
 *  sempre na mesma ordem: título com ação à direita, seções com rótulo, e
 *  cartão branco em volta do conteúdo. Sem isso cada tela inventa a própria
 *  margem e a área interna deixa de parecer um produto só. */

export function Pagina({ children }: { children: ReactNode }) {
  // `max-w-7xl` e não `mx-auto` sozinho: em tela larga o conteúdo encostado no
  // topo esquerdo é o padrão da esteira, centralizar deixaria a barra lateral
  // parecendo desalinhada do resto.
  return <div className="mx-auto w-full max-w-7xl">{children}</div>;
}

export function TituloPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-grey-600 text-xl font-bold lg:text-2xl">{titulo}</h1>
        {descricao && <p className="text-grey-400 mt-1 max-w-2xl text-sm">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Secao({
  titulo,
  contador,
  acao,
  children,
}: {
  titulo: string;
  contador?: number;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-grey-400 text-xs font-bold tracking-widest uppercase">
          {titulo}
          {typeof contador === "number" && (
            <span className="text-grey-300 ml-2 font-normal">{contador}</span>
          )}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-grey-300/60 rounded-xl border bg-white shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

/** Estado vazio com ação. Vazio sem saída é a tela que mais gera pergunta:
 *  a pessoa entende que não tem nada e não descobre como criar o primeiro. */
export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="border-grey-300/70 flex flex-col items-center gap-2 rounded-xl border border-dashed bg-white/60 px-6 py-12 text-center">
      <p className="text-grey-600 text-sm font-medium">{titulo}</p>
      <p className="text-grey-400 max-w-md text-sm">{texto}</p>
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="border-error/40 bg-error/5 text-error rounded-xl border px-5 py-4 text-sm">
      {children}
    </div>
  );
}
