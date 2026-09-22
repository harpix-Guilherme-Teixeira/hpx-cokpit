"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlugConnected, IconPlugConnectedX } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { aviso } from "@/componentes/ui/toast";
import { desconectarJira } from "@/lib/acoes-integracao";
import { LogoJira } from "./logo-jira";

type CartaoJiraProps = {
  conectado: boolean;
  conta?: string;
  siteUrl?: string;
};

export function CartaoJira({ conectado, conta, siteUrl }: CartaoJiraProps) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [ocupado, iniciar] = useTransition();

  async function sair() {
    const ok = await pedir({
      titulo: "Desconectar sua conta do Jira?",
      texto:
        "Os painéis que puxam do Jira param de atualizar com a sua credencial. Os números já gravados continuam onde estão.",
      confirmar: "Desconectar",
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await desconectarJira();
      if (!r.ok) {
        aviso.erro("Não desconectei", r.erro);
        return;
      }
      aviso.sucesso("Conta desconectada.");
      router.refresh();
    });
  }

  return (
    <div className="border-grey-300/60 rounded-xl border bg-white p-5 shadow-sm">
      {dialogo}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="border-grey-300/60 flex size-11 shrink-0 items-center justify-center rounded-lg border bg-white">
            <LogoJira tamanho={26} />
          </span>

          <div className="min-w-0">
            <p className="text-grey-600 font-medium">Jira</p>
            <p className="text-grey-400 mt-1 max-w-xl text-sm">
              Conecte sua conta para os painéis puxarem os números direto do Jira, sem digitar. A
              leitura acontece com a sua credencial, então o Jira registra como sua.
            </p>

            {conectado && (
              <p className="text-grey-500 mt-3 text-sm">
                Conectado como <span className="font-medium">{conta}</span>
                {siteUrl && (
                  <span className="text-grey-400"> em {siteUrl.replace(/^https?:\/\//, "")}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={
              conectado
                ? "bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium"
                : "bg-grey-200 text-grey-400 rounded-full px-2.5 py-1 text-xs font-medium"
            }
          >
            {conectado ? "conectado" : "não conectado"}
          </span>

          {conectado ? (
            <Botao tom="contorno" onClick={sair} disabled={ocupado}>
              <IconPlugConnectedX size={16} />
              {ocupado ? "Desconectando..." : "Desconectar"}
            </Botao>
          ) : (
            <a href="/api/integrations/jira/start">
              <Botao>
                <IconPlugConnected size={16} />
                Conectar Jira
              </Botao>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
