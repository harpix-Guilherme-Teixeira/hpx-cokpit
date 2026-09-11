"use client";

import { AreaTexto } from "@/componentes/ui/area-texto";
import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { ROTULO_CADENCIA, type Cadencia } from "@/lib/painel/tipos";

import type { CriacaoConjunto } from "./use-novo-conjunto";

type PassoDonoProps = { criacao: CriacaoConjunto };

const CADENCIAS: Cadencia[] = ["diaria", "semanal", "quinzenal", "mensal", "sob_demanda"];

export function PassoDono({ criacao }: PassoDonoProps) {
  const { dono, setDono, cadencia, setCadencia, fonte, setFonte } = criacao;

  return (
    <div className="flex flex-col gap-5">
      <Campo
        rotulo="Quem atualiza"
        value={dono}
        onChange={(e) => setDono(e.target.value)}
        placeholder="Alline"
        dica="Aparece na faixa do painel, junto do prazo. Dado manual sem dono é dado que ninguém atualiza."
      />

      <Selecao
        rotulo="De quanto em quanto tempo"
        value={cadencia}
        onChange={(e) => setCadencia(e.target.value as Cadencia)}
        dica={
          cadencia === "sob_demanda"
            ? "Sem prazo combinado, o painel não avisa quando o dado envelhece."
            : `Passando do prazo sem linha nova, o card avisa que o dado está velho.`
        }
      >
        {CADENCIAS.map((c) => (
          <option key={c} value={c}>
            {ROTULO_CADENCIA[c]}
          </option>
        ))}
      </Selecao>

      <AreaTexto
        rotulo="De onde vem e como conferir"
        value={fonte}
        onChange={(e) => setFonte(e.target.value)}
        placeholder="Página de cada conector no Confluence, espaço HNG. O status sai da tabela de cabeçalho."
        dica="Escreva o caminho exato. É isso que permite outra pessoa chegar no mesmo número daqui a um mês, e é o que separa medição de opinião."
      />
    </div>
  );
}
