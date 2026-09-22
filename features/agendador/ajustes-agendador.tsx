"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCalendarClock } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { Selecao } from "@/componentes/ui/selecao";
import { aviso } from "@/componentes/ui/toast";
import { salvarAgendador } from "@/lib/acoes-agendador";

const DIAS = [
  { valor: 0, rotulo: "Domingo" },
  { valor: 1, rotulo: "Segunda-feira" },
  { valor: 2, rotulo: "Terça-feira" },
  { valor: 3, rotulo: "Quarta-feira" },
  { valor: 4, rotulo: "Quinta-feira" },
  { valor: 5, rotulo: "Sexta-feira" },
  { valor: 6, rotulo: "Sábado" },
];

type AjustesAgendadorProps = {
  ativo: boolean;
  diaSemana: number;
};

export function AjustesAgendador({ ativo, diaSemana }: AjustesAgendadorProps) {
  const router = useRouter();
  const [ligado, setLigado] = useState(ativo);
  const [dia, setDia] = useState(diaSemana);
  const [salvando, iniciar] = useTransition();

  const mudou = ligado !== ativo || dia !== diaSemana;

  function salvar() {
    iniciar(async () => {
      const r = await salvarAgendador({ ativo: ligado, diaSemana: dia });
      if (!r.ok) {
        aviso.erro("Não salvei o agendamento", r.erro);
        return;
      }
      aviso.sucesso(
        ligado ? `Agendado para toda ${DIAS[dia].rotulo.toLowerCase()}.` : "Agendamento desligado.",
      );
      router.refresh();
    });
  }

  return (
    <div className="border-grey-300/60 rounded-xl border bg-white p-5 shadow-sm">
      <label className="border-grey-300/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          checked={ligado}
          onChange={(e) => setLigado(e.target.checked)}
          className="accent-primary mt-0.5 size-4"
        />
        <span>
          <span className="text-grey-600 block text-sm font-medium">
            Buscar os números do Jira sozinho
          </span>
          <span className="text-grey-400 block text-xs">
            Desligado, os três indicadores automáticos só mudam quando alguém clica em Atualizar.
          </span>
        </span>
      </label>

      <div className="mt-4 max-w-sm">
        <Selecao
          rotulo="Dia da semana"
          value={String(dia)}
          onChange={(e) => setDia(Number(e.target.value))}
          disabled={!ligado}
          dica="Sempre ao meio dia, horário de Brasília. A hora é fixa e mudá-la exige publicar uma versão nova."
        >
          {DIAS.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.rotulo}
            </option>
          ))}
        </Selecao>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Botao onClick={salvar} disabled={!mudou || salvando}>
          <IconCalendarClock size={16} />
          {salvando ? "Salvando..." : "Salvar agendamento"}
        </Botao>
        {mudou && !salvando && <span className="text-grey-400 text-xs">alterações não salvas</span>}
      </div>
    </div>
  );
}
