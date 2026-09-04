"use client";

import { useEffect, useState } from "react";

type Dados = {
  atualizadoEm: string;
  agente: { total: number; concluidas: number; andamento: number; fila: number };
  bloqueio: { total: number; rascunho: number; real: number };
  refinamento: { refinadas: number; semRefino: number };
  esforco: {
    estimadoH: number;
    gastoH: number;
    subtarefas: number;
    concluidoEstimadoH: number;
    concluidoGastoH: number;
    aderencia: number | null;
  };
  erro?: string;
  erroUltimaLeitura?: string;
  demonstracao?: boolean;
};

const h = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function Pagina() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const r = await fetch("/api/cockpit", { cache: "no-store" });
        const j = (await r.json()) as Dados;
        if (!vivo) return;
        if (!r.ok || j.erro) {
          setFalha(j.erro ?? `A API respondeu ${r.status}`);
          return;
        }
        setFalha(j.erroUltimaLeitura ?? null);
        setDados(j);
      } catch (e) {
        if (vivo) setFalha(e instanceof Error ? e.message : "falha de rede");
      }
    };
    buscar();
    const id = setInterval(buscar, 60_000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  const a = dados?.esforco.aderencia ?? null;
  const escopo = dados ? dados.refinamento.refinadas + dados.refinamento.semRefino : 0;

  return (
    <>
      <header className="topo">
        <div>
          <h1>Cockpit Upstream</h1>
          <div className="sub">harpix · Plataforma · sala de guerra 90 dias</div>
        </div>
        <div className="selo">
          <span className={falha ? "ponto parado" : "ponto"} />
          {dados
            ? `Lido do Jira às ${new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR")}`
            : "conectando"}
        </div>
      </header>

      <main>
        {dados?.demonstracao && (
          <div className="demo" role="status">
            <strong>Modo demonstração</strong>
            Estes números estão congelados na medição manual de 02/09/2026. A tela não falou com o
            Jira. Serve só para aprovar o visual, e só funciona em desenvolvimento.
          </div>
        )}

        {/* O painel nunca mostra zero calado quando a leitura falha. */}
        {falha && (
          <div className="aviso" role="alert">
            <strong>Os números abaixo podem estar velhos</strong>
            A última leitura do Jira falhou: {falha}
          </div>
        )}

        {!dados && !falha && <p className="esqueleto">Lendo o Jira pela primeira vez.</p>}

        {dados && (
          <>
            <section>
              <h2>Produção do agente de história</h2>
              <div className="grade">
                <div className="card destaque">
                  <div className="rotulo">Histórias escritas pelo agente</div>
                  <div className="num">{dados.agente.total}</div>
                  <div className="nota">
                    É um piso. História aprovada antes da mudança do rótulo não tem marca.
                  </div>
                </div>
                <div className="card">
                  <div className="rotulo">Concluídas</div>
                  <div className="num">{dados.agente.concluidas}</div>
                  <div className="nota">
                    {pct(dados.agente.concluidas, dados.agente.total)}% do que o agente escreveu
                  </div>
                </div>
                <div className="card">
                  <div className="rotulo">Em andamento</div>
                  <div className="num">{dados.agente.andamento}</div>
                </div>
                <div className="card">
                  <div className="rotulo">Na fila</div>
                  <div className="num">{dados.agente.fila}</div>
                </div>
              </div>
            </section>

            <section>
              <h2>Esforço no escopo da sala de guerra</h2>
              <div className="grade">
                <div className="card">
                  <div className="rotulo">Horas estimadas</div>
                  <div className="num menor">{h(dados.esforco.estimadoH)}</div>
                  <div className="nota">{dados.esforco.subtarefas} sub-tarefas</div>
                </div>
                <div className="card">
                  <div className="rotulo">Horas apontadas</div>
                  <div className="num menor">{h(dados.esforco.gastoH)}</div>
                </div>
                <div className={a !== null && a > 1.15 ? "card alerta" : "card"}>
                  <div className="rotulo">Aderência no que já fechou</div>
                  <div className="num menor">{a !== null ? `${a.toFixed(2)}x` : "sem dado"}</div>
                  <div className="nota">
                    {h(dados.esforco.concluidoGastoH)} gastas contra {h(dados.esforco.concluidoEstimadoH)}{" "}
                    estimadas.
                    {a !== null && a > 1.15 ? " O realizado está acima do estimado." : ""}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2>Bloqueio, separando rascunho de bloqueio de verdade</h2>
              <div className="grade">
                <div className="card">
                  <div className="rotulo">Histórias em Bloqueado</div>
                  <div className="num menor">{dados.bloqueio.total}</div>
                  <div className="barra" aria-hidden="true">
                    <span
                      style={{
                        width: `${pct(dados.bloqueio.rascunho, dados.bloqueio.total)}%`,
                        background: "var(--borda-forte)",
                      }}
                    />
                    <span
                      style={{
                        width: `${pct(dados.bloqueio.real, dados.bloqueio.total)}%`,
                        background: "var(--erro)",
                      }}
                    />
                  </div>
                  <div className="legenda">
                    <span>
                      <i style={{ background: "var(--borda-forte)" }} />
                      rascunho aguardando revisão
                    </span>
                    <span>
                      <i style={{ background: "var(--erro)" }} />
                      bloqueio de verdade
                    </span>
                  </div>
                </div>
                <div className="card">
                  <div className="rotulo">Rascunho do agente parado</div>
                  <div className="num menor">{dados.bloqueio.rascunho}</div>
                  <div className="nota">Não é impedimento, é fila de revisão.</div>
                </div>
                <div className="card destaque">
                  <div className="rotulo">Bloqueio de verdade</div>
                  <div className="num menor">{dados.bloqueio.real}</div>
                  <div className="nota">Este é o número que pede ação.</div>
                </div>
              </div>
            </section>

            <section>
              <h2>Refinamento do escopo</h2>
              <div className="grade">
                <div className="card">
                  <div className="rotulo">Refinadas</div>
                  <div className="num menor">{dados.refinamento.refinadas}</div>
                  <div className="barra" aria-hidden="true">
                    <span
                      style={{
                        width: `${pct(dados.refinamento.refinadas, escopo)}%`,
                        background: "var(--verde)",
                      }}
                    />
                  </div>
                  <div className="nota">{pct(dados.refinamento.refinadas, escopo)}% do escopo</div>
                </div>
                <div className="card">
                  <div className="rotulo">Sem refinamento</div>
                  <div className="num menor">{dados.refinamento.semRefino}</div>
                </div>
              </div>
            </section>

            <p className="rodape">
              Números lidos direto do Jira, projeto PTF, escopo da iniciativa HPX-31. A tela recarrega
              sozinha a cada minuto. Estimativa e apontamento são somados na sub-tarefa, porque na
              história esses campos vêm vazios.
            </p>
          </>
        )}
      </main>
    </>
  );
}
