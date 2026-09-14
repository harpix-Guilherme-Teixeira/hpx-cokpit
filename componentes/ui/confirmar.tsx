"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Botao } from "./botao";

type Pedido = {
  titulo: string;
  texto?: string;
  /** O que o botão de confirmar diz. "Sim" não informa nada; "Apagar 6 cards"
   *  informa. */
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
  /** Lista embaixo do texto, como os cards que uma exclusão vai esvaziar. */
  itens?: string[];
  /** Linha em vermelho, para consequência que sai do sistema, como painel
   *  publicado que quem tem o link vai ver quebrado. */
  alerta?: string;
};

type Aberto = Pedido & { resolver: (v: boolean) => void };

/** Confirmação no padrão do sistema, no lugar do `confirm()` do navegador.
 *
 *  O nativo não aceita estilo, muda de cara em cada navegador, e no Chrome
 *  ganha uma caixa "não deixar este site abrir mais diálogos" que, marcada,
 *  faz toda confirmação seguinte passar direto. Apagar faixa sem perguntar
 *  seria o resultado.
 *
 *  Uso:
 *    const { pedir, dialogo } = useConfirmacao();
 *    if (!(await pedir({ titulo: "Apagar?" }))) return;
 *    ...
 *    return <>{dialogo}</>
 */
export function useConfirmacao() {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const pedir = useCallback(
    (p: Pedido) => new Promise<boolean>((resolver) => setAberto({ ...p, resolver })),
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  function responder(valor: boolean) {
    aberto?.resolver(valor);
    setAberto(null);
  }

  const dialogo: ReactNode = (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Esc responde "não". Deixar o padrão fecharia o diálogo sem resolver a
        // promessa, e quem chamou ficaria esperando para sempre.
        e.preventDefault();
        responder(false);
      }}
      className="w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-grey-300/60 bg-white p-0 shadow-md backdrop:bg-black/40"
    >
      {aberto && (
        <div className="p-6">
          <div className="flex items-start gap-3">
            {aberto.perigo && (
              <span className="bg-error/10 text-error mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                <IconAlertTriangle size={17} />
              </span>
            )}
            <div>
              <h2 className="text-grey-600 text-base font-semibold">{aberto.titulo}</h2>
              {aberto.texto && <p className="text-grey-400 mt-1 text-sm">{aberto.texto}</p>}
              {aberto.itens && aberto.itens.length > 0 && (
                <ul className="text-grey-500 mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-sm">
                  {aberto.itens.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {aberto.alerta && (
                <p className="text-error mt-2 text-sm font-medium">{aberto.alerta}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Botao type="button" tom="contorno" onClick={() => responder(false)}>
              {aberto.cancelar ?? "Cancelar"}
            </Botao>
            <Botao
              type="button"
              tom={aberto.perigo ? "perigo" : "primario"}
              onClick={() => responder(true)}
              autoFocus
            >
              {aberto.confirmar ?? "Confirmar"}
            </Botao>
          </div>
        </div>
      )}
    </dialog>
  );

  return { pedir, dialogo };
}
