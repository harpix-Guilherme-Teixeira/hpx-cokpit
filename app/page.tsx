"use client";

import { useEffect, useState } from "react";

type Dados = {
  atualizadoEm: string;
  identidade?: string;
  escopoTotal: number;
  agente: {
    total: number;
    concluidas: number;
    andamento: number;
    backlog: number;
    bloqueadas: number;
  };
  bloqueio: { total: number; rascunho: number; real: number };
  refinamento: { refinadas: number; semRefino: number };
  entrega: { concluidas: number; doAgente: number };
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

/** Card com definição obrigatória: todo número declara o que está contando. */
function Card({
  rotulo,
  valor,
  define,
  nota,
  variante,
  children,
}: {
  rotulo: string;
  valor: string | number;
  define: string;
  nota?: string;
  variante?: "destaque" | "alerta";
  children?: React.ReactNode;
}) {
  return (
    <div className={variante ? `card ${variante}` : "card"}>
      <div className="rotulo">{rotulo}</div>
      <div className="num menor">{valor}</div>
      <div className="define">{define}</div>
      {children}
      {nota && <div className="nota">{nota}</div>}
    </div>
  );
}

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
            ? `Lido às ${new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR")}${
                dados.identidade ? ` por ${dados.identidade}` : ""
              }`
            : "conectando"}
        </div>
      </header>

      <main>
        {dados?.demonstracao && (
          <div className="demo" role="status">
            <strong>Modo demonstração</strong>
            Números congelados de 02/09/2026. A tela não falou com o Jira.
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
              <h2>Escopo da sala de guerra</h2>
              <div className="grade">
                <Card
                  rotulo="Histórias no escopo"
                  valor={dados.escopoTotal}
                  define="Histórias do projeto PTF sob a iniciativa HPX-31. É a população de tudo nesta tela."
                  nota={`${dados.agente.total} escritas pelo agente, ${
                    dados.escopoTotal - dados.agente.total
                  } por pessoa.`}
                  variante="destaque"
                />
              </div>
            </section>

            <section>
              <h2>Produção do agente de história</h2>
              <p className="escopo">
                Das <strong>{dados.escopoTotal} histórias do escopo</strong>, estas são as que
                carregam o rótulo <code>rascunho-agente</code>. Acumulado desde o início, sem
                recorte de data. As quatro caixas de status somam o total escrito pelo agente.
              </p>
              <div className="grade">
                <Card
                  rotulo="Escritas pelo agente"
                  valor={dados.agente.total}
                  define="Total acumulado, tudo que o agente já escreveu e ainda tem o rótulo."
                  nota="É um piso: história aprovada antes de o rótulo virar permanente ficou sem marca."
                  variante="destaque"
                />
                <Card
                  rotulo="Concluídas, escritas pelo agente"
                  valor={dados.agente.concluidas}
                  define="Status Concluído, contando só as que têm o rótulo do agente."
                  nota={`${pct(dados.agente.concluidas, dados.agente.total)}% do que o agente escreveu. Medir o escopo inteiro dá um número maior, veja o bloco de entrega.`}
                />
                <Card
                  rotulo="Em desenvolvimento ou teste"
                  valor={dados.agente.andamento}
                  define="Em Desenvolvimento, Em Testes ou Liberado para Testes."
                />
                <Card
                  rotulo="No backlog"
                  valor={dados.agente.backlog}
                  define="Sprint Backlog. Prontas para alguém puxar."
                />
                <Card
                  rotulo="Paradas em Bloqueado"
                  valor={dados.agente.bloqueadas}
                  define="Status Bloqueado. Não estão na fila, estão travadas."
                  nota={`${pct(dados.agente.bloqueadas, dados.agente.total)}% de tudo que o agente escreveu`}
                  variante={
                    dados.agente.bloqueadas > dados.agente.total / 2 ? "alerta" : undefined
                  }
                />
              </div>
            </section>

            <section>
              <h2>Quem está no status Bloqueado</h2>
              <p className="escopo">
                Histórias do escopo em <code>Bloqueado</code>, separadas por terem ou não o rótulo
                do agente. <strong>O Jira não diz o motivo do bloqueio.</strong> A separação é por
                origem da história, não por causa do impedimento.
              </p>
              <div className="grade">
                <Card
                  rotulo="Total em Bloqueado"
                  valor={dados.bloqueio.total}
                  define="Todas as histórias do escopo nesse status."
                >
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
                      escritas pelo agente
                    </span>
                    <span>
                      <i style={{ background: "var(--erro)" }} />
                      não escritas pelo agente
                    </span>
                  </div>
                </Card>
                <Card
                  rotulo="Escritas pelo agente"
                  valor={dados.bloqueio.rascunho}
                  define="Bloqueado e com o rótulo rascunho-agente."
                  nota="Provável fila de revisão, mas isso é leitura nossa, não dado do Jira."
                />
                <Card
                  rotulo="Não escritas pelo agente"
                  valor={dados.bloqueio.real}
                  define="Bloqueado e sem o rótulo."
                  nota="Aqui é onde o impedimento de time costuma estar."
                  variante="destaque"
                />
              </div>
            </section>

            <section>
              <h2>Entrega e esforço da sala de guerra</h2>
              <p className="escopo">
                Mesmo escopo dos blocos acima. As horas somam as <strong>sub-tarefas</strong> das
                histórias, porque a estimativa mora um nível abaixo e somar na história devolveria
                zero.
              </p>
              <div className="grade">
                <Card
                  rotulo="Histórias concluídas no escopo"
                  valor={dados.entrega.concluidas}
                  define="Todas as histórias concluídas sob a iniciativa HPX-31, escritas por quem quer que seja."
                  nota={`${dados.entrega.doAgente} vieram do agente e ${
                    dados.entrega.concluidas - dados.entrega.doAgente
                  } de pessoa. É este o total do escopo, não o do bloco do agente.`}
                  variante="destaque"
                />
                <Card
                  rotulo="Entrega vinda do agente"
                  valor={`${pct(dados.entrega.doAgente, dados.entrega.concluidas)}%`}
                  define="Fatia das histórias concluídas do escopo que o agente escreveu."
                  nota={`${dados.entrega.doAgente} de ${dados.entrega.concluidas}`}
                />
                <Card
                  rotulo="Horas estimadas"
                  valor={h(dados.esforco.estimadoH)}
                  define="Soma da estimativa original de todas as sub-tarefas do escopo."
                  nota={`${dados.esforco.subtarefas} sub-tarefas`}
                />
                <Card
                  rotulo="Horas apontadas"
                  valor={h(dados.esforco.gastoH)}
                  define="Soma do tempo que o time registrou nessas mesmas sub-tarefas."
                />
                <Card
                  rotulo="Aderência da estimativa"
                  valor={a !== null ? `${a.toFixed(2)}x` : "sem dado"}
                  define="Apontado dividido pelo estimado, contando só o que já foi concluído."
                  nota={`${h(dados.esforco.concluidoGastoH)} gastas contra ${h(
                    dados.esforco.concluidoEstimadoH,
                  )} estimadas.${
                    a !== null && a > 1.15
                      ? " O realizado está acima do estimado, a previsão está otimista."
                      : ""
                  }`}
                  variante={a !== null && a > 1.15 ? "alerta" : undefined}
                />
              </div>
            </section>

            <section>
              <h2>Refinamento</h2>
              <p className="escopo">
                As {dados.escopoTotal} histórias do escopo, pelo campo <code>Refinado</code>. As
                duas caixas somam o escopo inteiro.
              </p>
              <div className="grade">
                <Card
                  rotulo="Refinadas"
                  valor={dados.refinamento.refinadas}
                  define="Campo Refinado marcado como Sim."
                  nota={`${pct(dados.refinamento.refinadas, escopo)}% do escopo`}
                >
                  <div className="barra" aria-hidden="true">
                    <span
                      style={{
                        width: `${pct(dados.refinamento.refinadas, escopo)}%`,
                        background: "var(--verde)",
                      }}
                    />
                  </div>
                </Card>
                <Card
                  rotulo="Sem refinamento"
                  valor={dados.refinamento.semRefino}
                  define="Campo Refinado vazio ou marcado como Não."
                />
              </div>
            </section>

            <p className="rodape">
              <strong>Como ler.</strong> Todo número desta tela sai da mesma população: as{" "}
              {dados.escopoTotal} histórias do projeto PTF que estão sob a iniciativa HPX-31, o
              escopo da sala de guerra. Nada aqui olha o PTF inteiro, então os blocos reconciliam
              entre si. A tela recarrega sozinha a cada minuto e o servidor guarda a leitura por mais
              um minuto, então o número pode ter até dois minutos de idade. O horário no topo é o da
              leitura de verdade, e diz com qual conta o Jira foi lido, porque o painel mostra o que
              essa conta enxerga.
            </p>
          </>
        )}
      </main>
    </>
  );
}
