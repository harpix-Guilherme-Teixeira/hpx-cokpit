"use client";

import { useMemo, useState } from "react";
import { periodoDoPreset, type Periodo } from "@/lib/painel/motor";
import { variaveisDoTema, type Tema } from "@/lib/painel/tema";
import type { PainelCompleto } from "@/lib/painel/consultas";
import type { PresetPeriodo } from "@/lib/painel/tipos";
import { CardRender } from "./card-render";
import "./painel.css";

const PRESETS: { valor: PresetPeriodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "estaSemana", rotulo: "Esta semana" },
  { valor: "semanaPassada", rotulo: "Semana passada" },
  { valor: "esteMes", rotulo: "Este mês" },
];

type Props = {
  painel: PainelCompleto;
  /** No editor o tema vem do estado local, para a prévia mudar antes de salvar.
   *  No painel público não vem, e vale o que está gravado. */
  temaAoVivo?: Tema;
  /** Só o editor passa: destaca e permite selecionar clicando. */
  selecao?: { tipo: "faixa" | "card"; id: number } | null;
  aoSelecionar?: (alvo: { tipo: "faixa" | "card"; id: number }) => void;
};

export function PainelRender({ painel, temaAoVivo, selecao, aoSelecionar }: Props) {
  const tema = temaAoVivo ?? painel.tema;
  const editavel = typeof aoSelecionar === "function";

  const presetInicial =
    (painel as unknown as { controles?: { padrao?: PresetPeriodo }[] }).controles?.[0]?.padrao ??
    "30d";
  const [preset, setPreset] = useState<PresetPeriodo>(presetInicial);

  const periodo: Periodo | null = useMemo(() => periodoDoPreset(preset), [preset]);

  const visiveis = painel.faixas.filter((f) => f.visivel || editavel);

  return (
    <div className="pnl" style={variaveisDoTema(tema)}>
      <header className={tema.headerFixo ? "pnl-topo fixo" : "pnl-topo"}>
        <div>
          {tema.mostrarMarca && <div className="pnl-marca">{tema.marca}</div>}
          <h1>{painel.titulo || painel.nome}</h1>
          {(painel.subtitulo || painel.descricao) && (
            <div className="pnl-sub">{painel.subtitulo || painel.descricao}</div>
          )}
        </div>

        <div className="pnl-lido">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetPeriodo)}
            aria-label="Período"
            style={{
              background: "transparent",
              color: "inherit",
              border: "1px solid currentColor",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            {PRESETS.map((p) => (
              <option key={p.valor} value={p.valor} style={{ color: "#000" }}>
                {p.rotulo}
              </option>
            ))}
          </select>
          {periodo && (
            <div style={{ marginTop: 6 }}>
              {periodo.inicio.split("-").reverse().slice(0, 2).join("/")} a{" "}
              {periodo.fim.split("-").reverse().slice(0, 2).join("/")}
            </div>
          )}
        </div>
      </header>

      <div className="pnl-corpo">
        {visiveis.length === 0 && (
          <div className="pnl-vazio">
            Este painel ainda não tem faixa nenhuma. Em Personalizar, adicione a primeira.
          </div>
        )}

        {visiveis.map((faixa) => (
          <section
            key={faixa.id}
            className={`pnl-faixa fundo-${faixa.fundo}`}
            onClick={
              editavel
                ? (e) => {
                    e.stopPropagation();
                    aoSelecionar!({ tipo: "faixa", id: faixa.id });
                  }
                : undefined
            }
            style={
              editavel
                ? {
                    outline:
                      selecao?.tipo === "faixa" && selecao.id === faixa.id
                        ? "2px solid var(--pnl-acento)"
                        : undefined,
                    outlineOffset: 6,
                    borderRadius: "var(--pnl-raio)",
                    cursor: "pointer",
                    opacity: faixa.visivel ? 1 : 0.45,
                  }
                : undefined
            }
          >
            <div className="pnl-faixa-cab">
              <h2>{faixa.titulo}</h2>
              <span className="pnl-risco" />
              {faixa.dica && <span className="pnl-dica">{faixa.dica}</span>}
            </div>

            {faixa.descricao && <p className="pnl-faixa-desc">{faixa.descricao}</p>}

            {faixa.cards.length === 0 ? (
              <div className="pnl-vazio">Faixa sem card. Adicione um em Personalizar.</div>
            ) : (
              <div
                className="pnl-grelha"
                style={{ gridTemplateColumns: `repeat(${faixa.colunas}, minmax(0, 1fr))` }}
              >
                {faixa.cards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      // A largura do card é medida em colunas da faixa, e nunca
                      // pode passar do total: card de 4 numa faixa de 2 quebra
                      // a grade e empurra os vizinhos para fora.
                      gridColumn: `span ${Math.min(card.largura, faixa.colunas)}`,
                      ...(editavel
                        ? {
                            outline:
                              selecao?.tipo === "card" && selecao.id === card.id
                                ? "2px solid var(--pnl-acento)"
                                : undefined,
                            outlineOffset: 3,
                            borderRadius: "var(--pnl-raio)",
                          }
                        : {}),
                    }}
                    onClick={
                      editavel
                        ? (e) => {
                            e.stopPropagation();
                            aoSelecionar!({ tipo: "card", id: card.id });
                          }
                        : undefined
                    }
                  >
                    <CardRender
                      card={card}
                      fonte={
                        card.config.conjuntoId
                          ? painel.conjuntos[card.config.conjuntoId]
                          : undefined
                      }
                      periodo={periodo}
                      cor={tema.acento}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {tema.rodape && <p className="pnl-rodape">{tema.rodape}</p>}
    </div>
  );
}
