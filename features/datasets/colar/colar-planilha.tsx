"use client";

import { IconClipboard } from "@tabler/icons-react";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Gaveta } from "@/componentes/ui/gaveta";
import type { Campo } from "@/lib/painel/tipos";
import { useColarPlanilha } from "./use-colar-planilha";

type ColarPlanilhaProps = {
  conjuntoId: number;
  campos: Campo[];
};

const PREVIA = 15;

export function ColarPlanilha({ conjuntoId, campos }: ColarPlanilhaProps) {
  const {
    aberta,
    abrir,
    fechar,
    texto,
    setTexto,
    temCabecalho,
    setCabecalhoForcado,
    analise,
    validas,
    colunasUsadas,
    ignoradas,
    faltamObrigatorias,
    importando,
    importar,
  } = useColarPlanilha({ conjuntoId, campos });

  const comErro = analise.length - validas;
  const bloqueado = importando || validas === 0 || faltamObrigatorias.length > 0;

  return (
    <>
      <Botao tom="contorno" onClick={abrir} disabled={campos.length === 0}>
        <IconClipboard size={16} />
        Colar do Excel
      </Botao>

      <Gaveta
        aberta={aberta}
        fechar={fechar}
        titulo="Colar do Excel"
        descricao="Selecione as células na planilha, Ctrl+C, e cole aqui. Funciona com Excel e Google Sheets."
        rodape={
          <div className="flex items-center justify-between gap-3">
            <span className="text-grey-400 text-xs">
              {analise.length > 0 &&
                (comErro > 0
                  ? `${comErro} com erro fica${comErro > 1 ? "m" : ""} de fora`
                  : "tudo válido")}
            </span>
            <div className="flex gap-2">
              <Botao type="button" tom="contorno" onClick={fechar}>
                Cancelar
              </Botao>
              <Botao type="button" onClick={importar} disabled={bloqueado}>
                {importando
                  ? "Importando..."
                  : `Importar ${validas} linha${validas === 1 ? "" : "s"}`}
              </Botao>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <AreaTexto
            rotulo="Dados colados"
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui com Ctrl+V"
            className="font-mono text-xs"
            dica="Número aceita 1.234,5 e 87%. Data aceita dd/mm/aaaa. Porcentagem é gravada de 0 a 100, 87% vira 87."
          />

          {analise.length > 0 && (
            <>
              <label className="text-grey-500 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={temCabecalho}
                  onChange={(e) => setCabecalhoForcado(e.target.checked)}
                  className="accent-primary size-4"
                />
                A primeira linha é o cabeçalho
              </label>
              <p className="text-grey-400 -mt-3 text-xs">
                {temCabecalho
                  ? "As colunas casam pelo nome."
                  : "As colunas casam pela posição, na ordem do conjunto."}
              </p>

              {faltamObrigatorias.length > 0 && (
                <p className="border-error/40 bg-error/5 text-error rounded-lg border px-3 py-2 text-sm">
                  Faltam colunas obrigatórias: {faltamObrigatorias.join(", ")}.
                </p>
              )}

              {ignoradas.length > 0 && (
                <p className="border-alert/60 text-grey-500 rounded-lg border bg-white px-3 py-2 text-xs">
                  Sem coluna correspondente, vão ser ignoradas: {ignoradas.join(", ")}.
                </p>
              )}

              <div className="border-grey-300/60 overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-grey-100">
                    <tr>
                      <th className="text-grey-400 px-2 py-1.5 text-left font-normal">linha</th>
                      {colunasUsadas.map(({ chave }) => (
                        <th
                          key={chave}
                          className="text-grey-600 px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                        >
                          {campos.find((c) => c.chave === chave)?.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analise.slice(0, PREVIA).map((linha) => (
                      <tr key={linha.numero} className={linha.valida ? "" : "bg-error/5"}>
                        <td className="text-grey-400 border-grey-300/40 border-t px-2 py-1">
                          {linha.numero}
                        </td>
                        {colunasUsadas.map(({ chave, j }) => {
                          const celula = linha.celulas[j];
                          return (
                            <td
                              key={chave}
                              title={celula?.erro}
                              className={`border-grey-300/40 border-t px-2 py-1 whitespace-nowrap ${
                                celula?.erro ? "text-error font-medium" : "text-grey-600"
                              }`}
                            >
                              {celula?.texto || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-grey-400 text-xs">
                {analise.length > PREVIA ? `Mostrando ${PREVIA} de ${analise.length} linhas. ` : ""}
                Passe o mouse na célula em vermelho para ver o motivo.
              </p>
            </>
          )}
        </div>
      </Gaveta>
    </>
  );
}
