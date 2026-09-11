"use client";

import { Selecao } from "@/componentes/ui/selecao";
import type { CriacaoConjunto } from "./use-novo-conjunto";

type PassoTempoProps = { criacao: CriacaoConjunto };

export function PassoTempo({ criacao }: PassoTempoProps) {
  const {
    grao,
    colunasDeData,
    campoDataUid,
    setCampoDataUid,
    guardarHistorico,
    setGuardarHistorico,
  } = criacao;

  return (
    <div className="flex flex-col gap-5">
      {colunasDeData.length === 0 ? (
        <p className="border-alert/60 text-grey-500 rounded-lg border px-3 py-2 text-sm">
          Nenhuma coluna de data. Sem ela os cards não conseguem recortar por período nem comparar
          com a semana anterior: eles vão mostrar sempre o total de tudo. Volte e crie uma coluna de
          data se isso importar.
        </p>
      ) : (
        <Selecao
          rotulo={
            grao === "medicao"
              ? "Qual coluna diz de qual período é cada medição?"
              : "Qual data diz quando o item aconteceu?"
          }
          value={campoDataUid ?? ""}
          onChange={(e) => setCampoDataUid(e.target.value || null)}
          dica="É a data que o período do painel recorta, e a que faz a comparação com o período anterior existir."
        >
          <option value="">Nenhuma, os cards ignoram o período</option>
          {colunasDeData.map((c) => (
            <option key={c.uid} value={c.uid}>
              {c.nome}
            </option>
          ))}
        </Selecao>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-grey-500 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={guardarHistorico}
            onChange={(e) => setGuardarHistorico(e.target.checked)}
            className="accent-primary size-4"
          />
          Guardar o histórico de cada mudança
        </label>
        <p className="text-grey-400 text-xs">
          A grade sobrescreve o valor da célula. Com o histórico ligado, cada mudança fica gravada
          com data e autor, e a plataforma consegue responder quantos estavam em cada status semana
          passada. Sem ele, essa pergunta fica sem resposta, igual ao Jira.
        </p>
      </div>
    </div>
  );
}
