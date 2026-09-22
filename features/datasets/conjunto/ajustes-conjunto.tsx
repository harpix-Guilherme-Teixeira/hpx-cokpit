"use client";

import type { ReactNode } from "react";
import { IconTrash } from "@tabler/icons-react";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Gaveta } from "@/componentes/ui/gaveta";
import { Selecao } from "@/componentes/ui/selecao";
import { ROTULO_CADENCIA, type Cadencia } from "@/lib/painel/tipos";
import { useAjustesConjunto } from "./use-ajustes-conjunto";

type AjustesConjuntoProps = {
  id: number;
  nome: string;
  descricao: string | null;
  dono: string | null;
  cadencia: Cadencia;
  fonte: string | null;
  children: ReactNode;
};

const CADENCIAS = Object.keys(ROTULO_CADENCIA) as Cadencia[];

export function AjustesConjunto({ children, ...conjunto }: AjustesConjuntoProps) {
  const { aberta, abrir, fechar, form, mudar, erro, salvando, salvar, excluir, dialogo } =
    useAjustesConjunto(conjunto);

  return (
    <>
      {dialogo}
      <span onClick={abrir} className="contents">
        {children}
      </span>

      <Gaveta
        aberta={aberta}
        fechar={fechar}
        titulo={`Conjunto ${conjunto.nome}`}
        descricao="Nome, dono e origem. As colunas se editam clicando nelas, na própria tela."
        rodape={
          <div className="flex items-center justify-between gap-2">
            <Botao
              type="button"
              tom="contorno"
              onClick={excluir}
              disabled={salvando}
              aria-label="Apagar conjunto"
            >
              <IconTrash size={16} />
            </Botao>
            <div className="flex gap-2">
              <Botao type="button" tom="contorno" onClick={fechar}>
                Cancelar
              </Botao>
              <Botao type="button" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar conjunto"}
              </Botao>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Campo
            rotulo="Nome"
            value={form.nome}
            onChange={(e) => mudar({ nome: e.target.value })}
            required
            autoFocus
          />

          <AreaTexto
            rotulo="O que este conjunto guarda"
            value={form.descricao ?? ""}
            onChange={(e) => mudar({ descricao: e.target.value })}
            dica="Aparece embaixo do nome, na tela dos dados."
          />

          <Campo
            rotulo="Quem mantém"
            value={form.dono ?? ""}
            onChange={(e) => mudar({ dono: e.target.value })}
            placeholder="Alline Cavalcante"
            dica="Aparece no aviso quando o dado envelhece além da cadência."
          />

          <Selecao
            rotulo="Cadência"
            value={form.cadencia}
            onChange={(e) => mudar({ cadencia: e.target.value as Cadencia })}
            dica="De quanto em quanto tempo deveria entrar linha nova. É o que faz o card avisar que o número está velho."
          >
            {CADENCIAS.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CADENCIA[c]}
              </option>
            ))}
          </Selecao>

          <AreaTexto
            rotulo="De onde vem e como conferir"
            rows={4}
            value={form.fonte ?? ""}
            onChange={(e) => mudar({ fonte: e.target.value })}
            dica="Sem isto, número digitado vira afirmação que ninguém consegue refazer."
          />

          {erro && (
            <p className="border-error/40 bg-error/5 text-error rounded-lg border px-3 py-2 text-sm">
              {erro}
            </p>
          )}
        </div>
      </Gaveta>
    </>
  );
}
