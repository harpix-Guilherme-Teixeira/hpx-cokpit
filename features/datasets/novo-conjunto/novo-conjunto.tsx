"use client";

import { IconPlus } from "@tabler/icons-react";
import { Botao } from "@/componentes/ui/botao";
import { Gaveta } from "@/componentes/ui/gaveta";
import { IndicadorPassos } from "./indicador-passos";
import { PassoColunas } from "./passo-colunas";
import { PassoDono } from "./passo-dono";
import { PassoGrao } from "./passo-grao";
import { PassoPainel } from "./passo-painel";
import { PassoTempo } from "./passo-tempo";
import { PASSOS, useNovoConjunto } from "./use-novo-conjunto";

type NovoConjuntoProps = {
  tom?: "primario" | "contorno";
  rotulo?: string;
  paineis: { id: number; nome: string }[];
};

export function NovoConjunto({
  tom = "primario",
  rotulo = "Novo conjunto",
  paineis,
}: NovoConjuntoProps) {
  const criacao = useNovoConjunto({ paineis });
  const { aberta, abrir, fechar, passo, avancar, voltar, erro, salvando, criar } = criacao;

  const ultimo = passo === PASSOS.length - 1;

  return (
    <>
      <Botao tom={tom} onClick={abrir}>
        {tom === "primario" && <IconPlus size={16} />}
        {rotulo}
      </Botao>

      <Gaveta
        aberta={aberta}
        fechar={fechar}
        titulo="Novo conjunto de dados"
        descricao="Cinco perguntas. São elas que fazem o número ser conferível daqui a um mês."
        rodape={
          <div className="flex items-center justify-between gap-2">
            <Botao
              type="button"
              tom="contorno"
              onClick={passo === 0 ? fechar : voltar}
              disabled={salvando}
            >
              {passo === 0 ? "Cancelar" : "Voltar"}
            </Botao>
            <Botao type="button" onClick={ultimo ? criar : avancar} disabled={salvando}>
              {salvando ? "Criando..." : ultimo ? "Criar conjunto" : "Continuar"}
            </Botao>
          </div>
        }
      >
        <IndicadorPassos passos={PASSOS} atual={passo} />

        {passo === 0 && <PassoGrao criacao={criacao} />}
        {passo === 1 && <PassoColunas criacao={criacao} />}
        {passo === 2 && <PassoTempo criacao={criacao} />}
        {passo === 3 && <PassoDono criacao={criacao} />}
        {passo === 4 && <PassoPainel criacao={criacao} />}

        {erro && (
          <p className="border-error/40 bg-error/5 text-error mt-4 rounded-lg border px-3 py-2 text-sm">
            {erro}
          </p>
        )}
      </Gaveta>
    </>
  );
}
