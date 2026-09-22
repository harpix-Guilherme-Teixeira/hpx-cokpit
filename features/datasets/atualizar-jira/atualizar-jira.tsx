"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { aviso } from "@/componentes/ui/toast";

type Resposta = {
  ok?: boolean;
  erro?: string;
  lidoPor?: string;
  semana?: string;
  gravado?: Record<string, number>;
  linha?: string;
};

/** Dispara a mesma rota que o cron de sexta usa.
 *
 *  É o mesmo caminho de propósito: um botão com cálculo próprio acabaria
 *  divergindo do robô, e aí o número mudaria conforme quem atualizou. */
export function AtualizarDoJira() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function atualizar() {
    setOcupado(true);
    try {
      const r = await fetch("/api/cron/review-semanal?forcar=1", { cache: "no-store" });
      const corpo = (await r.json()) as Resposta;

      if (!r.ok || corpo.erro) {
        aviso.erro("Não consegui buscar no Jira", corpo.erro ?? `Resposta ${r.status}.`);
        return;
      }

      const valores = corpo.gravado ?? {};
      aviso.sucesso(
        `Semana de ${corpo.semana} ${corpo.linha === "criada" ? "criada" : "atualizada"}.`,
        `Histórias do agente ${valores["historias-criadas-pelo-agente"]}, concluídas ${valores["atividades-concluidas"]}, bloqueadas ${valores["bloqueadas-agora"]}. Lido com a conta de ${corpo.lidoPor}.`,
      );
      router.refresh();
    } catch {
      aviso.erro("Não consegui buscar no Jira", "A chamada não completou. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Botao tom="contorno" onClick={atualizar} disabled={ocupado}>
      <IconRefresh size={16} className={ocupado ? "animate-spin" : undefined} />
      {ocupado ? "Buscando no Jira..." : "Atualizar do Jira"}
    </Botao>
  );
}
