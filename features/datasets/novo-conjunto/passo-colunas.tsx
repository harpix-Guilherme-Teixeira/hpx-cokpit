"use client";

import { useState } from "react";
import { IconClipboard, IconPlus } from "@tabler/icons-react";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { LinhaColuna } from "./linha-coluna";
import type { CriacaoConjunto } from "./use-novo-conjunto";

type PassoColunasProps = { criacao: CriacaoConjunto };

export function PassoColunas({ criacao }: PassoColunasProps) {
  const {
    grao,
    colunas,
    linhas,
    colarPlanilha,
    mudarColuna,
    removerColuna,
    moverColuna,
    adicionarColuna,
  } = criacao;

  const [colando, setColando] = useState(false);
  const [texto, setTexto] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-grey-400 text-xs">
        {grao === "item"
          ? "Um item costuma ter título, status, responsável e as datas em que entrou e saiu. São elas que viram contagem por status e movimento do período."
          : "Uma medição precisa da data do período e das colunas de número. A data é o que permite comparar uma semana com a anterior."}
      </p>

      {colando ? (
        <div className="border-grey-300/60 flex flex-col gap-2 rounded-lg border p-3">
          <AreaTexto
            rotulo="Cole a planilha"
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ctrl+V aqui"
            className="font-mono text-xs"
            dica="A primeira linha é lida como os nomes das colunas. O tipo de cada uma sai dos valores."
          />
          <div className="flex justify-end gap-2">
            <Botao type="button" tom="contorno" tamanho="p" onClick={() => setColando(false)}>
              Cancelar
            </Botao>
            <Botao
              type="button"
              tamanho="p"
              onClick={() => {
                colarPlanilha(texto);
                setColando(false);
                setTexto("");
              }}
              disabled={!texto.trim()}
            >
              Ler planilha
            </Botao>
          </div>
        </div>
      ) : (
        <Botao
          type="button"
          tom="contorno"
          tamanho="p"
          className="self-start"
          onClick={() => setColando(true)}
        >
          <IconClipboard size={14} />
          Montar a partir de uma planilha
        </Botao>
      )}

      {linhas && linhas.length > 0 && (
        <p className="border-success/50 text-grey-500 rounded-lg border bg-white px-3 py-2 text-xs">
          {linhas.length} linhas lidas da planilha. Elas entram junto quando você criar o conjunto.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {colunas.map((c, i) => (
          <LinhaColuna
            key={c.uid}
            coluna={c}
            primeira={i === 0}
            ultima={i === colunas.length - 1}
            aoMudar={(m) => mudarColuna(c.uid, m)}
            aoRemover={() => removerColuna(c.uid)}
            aoMover={(d) => moverColuna(c.uid, d)}
          />
        ))}
      </div>

      <Botao
        type="button"
        tom="fantasma"
        tamanho="p"
        className="self-start"
        onClick={adicionarColuna}
      >
        <IconPlus size={14} />
        Adicionar coluna
      </Botao>
    </div>
  );
}
