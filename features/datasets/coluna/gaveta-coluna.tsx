"use client";

import type { ReactNode } from "react";
import { IconTrash } from "@tabler/icons-react";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Gaveta } from "@/componentes/ui/gaveta";
import { Selecao } from "@/componentes/ui/selecao";
import { EXEMPLO_FORMATO, ROTULO_FORMATO, type Formato } from "@/lib/painel/formato";
import type { Campo as CampoConjunto, TipoCampo } from "@/lib/painel/tipos";
import { useGavetaColuna } from "./use-gaveta-coluna";

type GavetaColunaProps = {
  conjuntoId: number;
  coluna?: CampoConjunto;
  children: ReactNode;
};

const TIPOS: { valor: TipoCampo; rotulo: string; explica: string }[] = [
  {
    valor: "texto",
    rotulo: "Texto",
    explica: "Nome, título, observação. Conta e agrupa, não soma.",
  },
  {
    valor: "numero",
    rotulo: "Número",
    explica: "Soma, média, mínimo e máximo. Escolha o formato abaixo.",
  },
  {
    valor: "data",
    rotulo: "Data",
    explica: "Liga os cards ao período do painel e à comparação com a semana anterior.",
  },
  {
    valor: "opcao",
    rotulo: "Opção",
    explica: "Lista fechada, como status. Evita quatro grafias da mesma coisa.",
  },
  { valor: "booleano", rotulo: "Sim ou não", explica: "Verdadeiro ou falso." },
];

const FORMATOS_NUMERO: Formato[] = ["inteiro", "decimal", "porcentagem", "horas", "moeda"];

export function GavetaColuna({ conjuntoId, coluna, children }: GavetaColunaProps) {
  const {
    aberta,
    abrir,
    fechar,
    form,
    mudar,
    erro,
    salvando,
    editando,
    tipoMudou,
    salvar,
    excluir,
    dialogo,
  } = useGavetaColuna({ conjuntoId, coluna });

  return (
    <>
      {dialogo}
      <span onClick={abrir} className="contents">
        {children}
      </span>

      <Gaveta
        aberta={aberta}
        fechar={fechar}
        titulo={editando ? `Coluna ${coluna?.nome}` : "Nova coluna"}
        descricao="O tipo e o formato decidem o que os cards vão conseguir calcular e como o número aparece."
        rodape={
          <div className="flex items-center justify-between gap-2">
            {editando ? (
              <Botao
                type="button"
                tom="contorno"
                onClick={excluir}
                disabled={salvando}
                aria-label="Apagar coluna"
              >
                <IconTrash size={16} />
              </Botao>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Botao type="button" tom="contorno" onClick={fechar}>
                Cancelar
              </Botao>
              <Botao type="button" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar coluna" : "Criar coluna"}
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
            placeholder="Horas apontadas"
            required
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <Selecao
              rotulo="Tipo"
              value={form.tipo}
              onChange={(e) => mudar({ tipo: e.target.value as TipoCampo })}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Selecao>
            <p className="text-grey-400 text-xs">
              {TIPOS.find((t) => t.valor === form.tipo)?.explica}
            </p>
            {tipoMudou && (
              <p className="border-alert/60 text-grey-500 rounded-lg border px-3 py-2 text-xs">
                Mudar o tipo não converte o que já foi digitado. Valores que não servirem no tipo
                novo passam a aparecer como traço nos cards até alguém corrigir na grade.
              </p>
            )}
          </div>

          {form.tipo === "numero" && (
            <>
              <Selecao
                rotulo="Formato"
                value={form.formato}
                onChange={(e) => mudar({ formato: e.target.value as Formato })}
                dica={`Aparece assim: ${EXEMPLO_FORMATO[form.formato]}.${
                  form.formato === "porcentagem"
                    ? " Digite de 0 a 100: 87 é 87%. Nada é multiplicado por cem."
                    : ""
                }`}
              >
                {FORMATOS_NUMERO.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_FORMATO[f]}
                  </option>
                ))}
              </Selecao>

              <Selecao
                rotulo="Casas decimais"
                value={String(form.casas)}
                onChange={(e) => mudar({ casas: Number(e.target.value) })}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Selecao>
            </>
          )}

          <Campo
            rotulo="Unidade"
            value={form.unidade ?? ""}
            onChange={(e) => mudar({ unidade: e.target.value })}
            placeholder="conectores, PRs, histórias"
            dica="Sufixo livre, para o que não cabe nos formatos. Opcional."
          />

          {form.tipo === "opcao" && (
            <AreaTexto
              rotulo="Opções"
              rows={5}
              value={form.opcoes.join("\n")}
              onChange={(e) => mudar({ opcoes: e.target.value.split("\n") })}
              placeholder={"Análise\nPronto\nPendente"}
              dica="Uma por linha. Na grade e na colagem, o que não estiver na lista é recusado."
            />
          )}

          <AreaTexto
            rotulo="O que esta coluna mede"
            value={form.descricao ?? ""}
            onChange={(e) => mudar({ descricao: e.target.value })}
            dica="Aparece ao passar o mouse no cabeçalho da grade. Coluna sem isso vira discussão sobre o que o número conta."
          />

          <label className="text-grey-500 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.obrigatorio}
              onChange={(e) => mudar({ obrigatorio: e.target.checked })}
              className="accent-primary size-4"
            />
            Obrigatória
          </label>

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
