"use client";

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatar, formatarVariacao, type Apresentacao } from "@/lib/painel/formato";
import { resolverCard, type Periodo } from "@/lib/painel/motor";
import type { Campo, Card, Registro } from "@/lib/painel/tipos";

export type Fonte = { campos: Campo[]; registros: Registro[] } | undefined;

/** Apresentação do card: o que ele definiu, e o que faltar vem da coluna.
 *
 *  Essa herança é o coração do "se é % ou não": a natureza do número é da
 *  coluna, o card só ajusta a aparência. Card que sobrescrevesse o formato
 *  poderia mostrar como contagem uma coluna que é porcentagem. */
function apresentacao(card: Card, fonte: Fonte): Apresentacao {
  const c = card.config;
  const coluna = fonte?.campos.find((x) => x.chave === c.campoValor);

  return {
    formato: c.formato ?? coluna?.formato ?? "inteiro",
    casas: c.casas ?? coluna?.casas,
    unidade: c.unidade ?? coluna?.unidade ?? undefined,
    prefixo: c.prefixo,
  };
}

function Delta({ pct, subirEhBom = true }: { pct: number | null; subirEhBom?: boolean }) {
  const v = formatarVariacao(pct);
  if (!v) return null;
  if (v.texto === "igual") return <span className="pnl-delta neutro">igual</span>;
  const bom = v.sobe === subirEhBom;
  return <span className={`pnl-delta ${bom ? "bom" : "ruim"}`}>{v.texto}</span>;
}

export function CardRender({
  card,
  fonte,
  periodo,
  cor,
}: {
  card: Card;
  fonte: Fonte;
  periodo: Periodo | null;
  cor: string;
}) {
  const destaque = card.config.destaque ? "pnl-card destaque" : "pnl-card";

  if (card.tipo === "texto") {
    return (
      <div className={destaque}>
        <div className="pnl-rot">{card.titulo}</div>
        <p className="pnl-texto-livre">{card.config.texto}</p>
      </div>
    );
  }

  // Fonte apagada depois que o card foi montado. Some com o card seria pior:
  // ninguém entenderia por que o painel encolheu.
  if (!fonte) {
    return (
      <div className={destaque}>
        <div className="pnl-rot">{card.titulo}</div>
        <div className="pnl-vazio">
          A fonte de dados deste card não existe mais. Escolha outra em Personalizar.
        </div>
      </div>
    );
  }

  const r = resolverCard(card.config, card.tipo, fonte.registros, fonte.campos, periodo);
  const ap = apresentacao(card, fonte);

  const corpo = (() => {
    switch (card.tipo) {
      case "numero":
        return (
          <div className="pnl-valor">
            {formatar(r.valor, ap)}
            {card.config.comparar && (
              <Delta pct={r.variacaoPct} subirEhBom={card.config.subirEhBom ?? true} />
            )}
          </div>
        );

      case "progresso": {
        const meta = card.config.campoMeta
          ? Number(fonte.registros[0]?.valores?.[card.config.campoMeta] ?? 0)
          : 0;
        const pct = meta > 0 && r.valor !== null ? Math.min(100, (r.valor / meta) * 100) : null;
        return (
          <>
            <div className="pnl-valor">
              {formatar(r.valor, ap)}
              <span style={{ fontSize: 14, color: "var(--pnl-texto-fraco)" }}>
                de {formatar(meta, ap)}
              </span>
            </div>
            <div className="pnl-barra-fundo">
              <div className="pnl-barra-cheia" style={{ width: `${pct ?? 0}%` }} />
            </div>
            <div className="pnl-nota">
              {pct === null ? "sem meta definida" : `${Math.round(pct)}% do alvo`}
            </div>
          </>
        );
      }

      case "barra":
        return (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={r.categorias} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 11, fill: "var(--pnl-texto-fraco)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--pnl-borda)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--pnl-texto-fraco)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--pnl-superficie-alt)" }}
                  formatter={(v) => formatar(Number(v), ap)}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} fill={cor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "linha":
        return (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={r.pontos} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11, fill: "var(--pnl-texto-fraco)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--pnl-borda)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--pnl-texto-fraco)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(v) => formatar(Number(v), ap)} />
                <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case "pizza":
        return (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={r.categorias}
                  dataKey="valor"
                  nameKey="categoria"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {r.categorias.map((_, i) => (
                    // Opacidade decrescente em vez de paleta categórica: o
                    // design system harpix não tem uma, e inventar cor aqui
                    // criaria significado onde não existe.
                    <Cell key={i} fill={cor} opacity={1 - i * 0.13} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatar(Number(v), ap)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case "tabela": {
        const colunas = (card.config.colunas ?? []).map(
          (chave) => fonte.campos.find((c) => c.chave === chave)!,
        );
        return (
          <div className="pnl-tabela-envolve">
            <table className="pnl-tabela">
              <thead>
                <tr>
                  {colunas.filter(Boolean).map((c) => (
                    <th key={c.chave} className={c.tipo === "numero" ? "num" : undefined}>
                      {c.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.linhas.slice(0, 12).map((linha) => (
                  <tr key={linha.id}>
                    {colunas.filter(Boolean).map((c) => (
                      <td key={c.chave} className={c.tipo === "numero" ? "num" : undefined}>
                        {c.tipo === "numero"
                          ? formatar(Number(linha.valores[c.chave]), {
                              formato: c.formato,
                              casas: c.casas,
                              unidade: c.unidade ?? undefined,
                            })
                          : String(linha.valores[c.chave] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {r.linhas.length > 12 && (
              <p className="pnl-nota">e mais {r.linhas.length - 12} linhas</p>
            )}
          </div>
        );
      }

      case "lista":
        return (
          <ul className="pnl-lista">
            {r.linhas.slice(0, 8).map((linha) => (
              <li key={linha.id}>
                <span>{String(linha.valores[card.config.campoTitulo ?? ""] ?? "—")}</span>
                {card.config.campoStatus && (
                  <span className="pnl-etiqueta">
                    {String(linha.valores[card.config.campoStatus] ?? "—")}
                  </span>
                )}
              </li>
            ))}
            {r.linhas.length === 0 && <li className="pnl-nota">nenhum item</li>}
          </ul>
        );

      default:
        return null;
    }
  })();

  return (
    <div className={destaque}>
      <div className="pnl-rot">{card.titulo}</div>
      {corpo}
      {card.definicao && <div className="pnl-def">{card.definicao}</div>}
      {periodo && r.ignoraPeriodo && (
        <div className="pnl-nota">Este card não usa o período: nenhuma data foi escolhida.</div>
      )}
    </div>
  );
}
