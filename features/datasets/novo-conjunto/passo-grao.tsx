"use client";

import { twMerge } from "tailwind-merge";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { MODELOS_CONJUNTO } from "@/lib/painel/modelos-conjunto";
import type { Grao } from "@/lib/painel/tipos";
import type { CriacaoConjunto } from "./use-novo-conjunto";

type PassoGraoProps = { criacao: CriacaoConjunto };

const GRAOS: { valor: Grao; titulo: string; explica: string; exemplos: string }[] = [
  {
    valor: "item",
    titulo: "Itens",
    explica:
      "Cada linha é uma coisa. A plataforma conta quantos existem, quantos em cada status, e o que entrou e saiu no período.",
    exemplos: "documentações, riscos, metas, decisões",
  },
  {
    valor: "medicao",
    titulo: "Medições",
    explica:
      "Cada linha é o valor de um período, digitado por alguém. A plataforma só repete esse valor e compara com o período anterior.",
    exemplos: "o total de uma semana que veio de outro sistema",
  },
];

export function PassoGrao({ criacao }: PassoGraoProps) {
  const { grao, setGrao, modelo, aplicarModelo, nome, setNome, descricao, setDescricao } = criacao;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-grey-600 text-sm font-medium">O que é uma linha?</span>
        {GRAOS.map((g) => (
          <label
            key={g.valor}
            className={twMerge(
              "flex cursor-pointer gap-3 rounded-lg border p-3",
              grao === g.valor ? "border-primary bg-primary/5" : "border-grey-300/60",
            )}
          >
            <input
              type="radio"
              name="grao"
              checked={grao === g.valor}
              onChange={() => setGrao(g.valor)}
              className="accent-primary mt-0.5 size-4"
            />
            <span>
              <span className="text-grey-600 block text-sm font-medium">{g.titulo}</span>
              <span className="text-grey-400 block text-xs">{g.explica}</span>
              <span className="text-grey-400 mt-1 block text-xs italic">Ex.: {g.exemplos}</span>
            </span>
          </label>
        ))}
      </div>

      {grao === "medicao" && (
        <p className="border-alert/60 text-grey-500 rounded-lg border px-3 py-2 text-xs">
          Se esse número já existe em outro sistema, digitar aqui cria uma cópia que envelhece e que
          ninguém consegue conferir. Quando der, registre os itens e deixe a plataforma contar.
        </p>
      )}

      <Selecao
        rotulo="Começar de um modelo"
        value={modelo}
        onChange={(e) => aplicarModelo(e.target.value)}
        dica={
          MODELOS_CONJUNTO.find((m) => m.chave === modelo)?.descricao ??
          "O modelo preenche colunas, cadência e fonte. Você muda tudo depois."
        }
      >
        <option value="">Em branco</option>
        {MODELOS_CONJUNTO.map((m) => (
          <option key={m.chave} value={m.chave}>
            {m.nome}
          </option>
        ))}
      </Selecao>

      <Campo
        rotulo="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Documentações de API"
        required
        autoFocus
      />

      <AreaTexto
        rotulo="O que é uma linha, em uma frase"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Cada linha é a documentação de um conector no Confluence."
        dica="Sem isso, em duas semanas vira discussão sobre o que o número está contando."
      />
    </div>
  );
}
