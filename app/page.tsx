"use client";

import { useEffect, useState } from "react";

type Dados = {
  atualizadoEm: string;
  identidade?: string;
  escopoTotal: number;
  periodo: { inicio: string | null; ultimaMexida: string | null };
  agente: {
    total: number;
    concluidas: number;
    andamento: number;
    backlog: number;
    bloqueadas: number;
  };
  bloqueio: { total: number; rascunho: number; real: number };
  refinamento: { refinadas: number; semRefino: number; doAgente: number };
  entrega: { concluidas: number; doAgente: number };
  dimensionamento: { comTshirt: number; semTshirt: number };
  previsibilidade: {
    restanteEstimadoH: number;
    restanteAjustadoH: number | null;
    vazaoSemanalH: number;
    semanasDecorridas: number;
    semanasRestantes: number | null;
  };
  esforco: {
    estimadoH: number;
    gastoH: number;
    subtarefas: number;
    concluidoEstimadoH: number;
    concluidoGastoH: number;
    pareadoEstimadoH: number;
    pareadoGastoH: number;
    pareadoItens: number;
    semEstimativa: number;
    aderencia: number | null;
  };
  erro?: string;
  erroUltimaLeitura?: string;
  demonstracao?: boolean;
};

const h = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const dia = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "?";

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
  const p = dados?.previsibilidade;

  return (
    <>
      <header className="topo">
        <div>
          <h1>Cockpit Upstream</h1>
          <div className="sub">harpix · Plataforma · sala de guerra 90 dias</div>
        </div>
        <div className="cabecaDireita">
          {dados && (
            <div className="janela">
              {dia(dados.periodo.inicio)} até {dia(dados.periodo.ultimaMexida)}
              <span className="janelaNota">do primeiro item do escopo até a última mexida</span>
            </div>
          )}
          <div className="selo">
            <span className={falha ? "ponto parado" : "ponto"} />
            {dados
              ? `Lido às ${new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR")}${
                  dados.identidade ? ` por ${dados.identidade}` : ""
                }`
              : "conectando"}
          </div>
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
            <strong>Os números abaixo podem estar velhos</strong>A última leitura do Jira falhou:{" "}
            {falha}
          </div>
        )}

        {!dados && !falha && <p className="esqueleto">Lendo o Jira pela primeira vez.</p>}

        {dados && p && (
          <>
            <section>
              <h2>Histórias do agente</h2>
              <p className="escopo">
                Das <strong>{dados.escopoTotal} histórias do escopo</strong> (projeto PTF sob a
                iniciativa HPX-31), estas são as que carregam o rótulo <code>rascunho-agente</code>.
                Acumulado desde <strong>{dia(dados.periodo.inicio)}</strong>, sem recorte de data.
              </p>
              <div className="grade seis">
                <Card
                  rotulo="Todas do agente"
                  valor={dados.agente.total}
                  define="Total acumulado que o agente escreveu."
                  nota={`${pct(dados.agente.total, dados.escopoTotal)}% do escopo`}
                  variante="destaque"
                />
                <Card
                  rotulo="Refinadas"
                  valor={dados.refinamento.doAgente}
                  define="Campo Refinado igual a Sim."
                  nota={`${pct(dados.refinamento.doAgente, dados.agente.total)}% das do agente`}
                />
                <Card
                  rotulo="Em andamento"
                  valor={dados.agente.andamento}
                  define="Em Desenvolvimento, Em Testes ou Liberado para Testes."
                />
                <Card
                  rotulo="Concluídas"
                  valor={dados.agente.concluidas}
                  define="Status Concluído."
                  nota={`${dados.entrega.concluidas} no escopo inteiro, contando as ${
                    dados.entrega.concluidas - dados.entrega.doAgente
                  } escritas por pessoa`}
                />
                <Card
                  rotulo="Bloqueadas"
                  valor={dados.agente.bloqueadas}
                  define="Status Bloqueado."
                  nota={`${pct(dados.agente.bloqueadas, dados.agente.total)}% das do agente`}
                  variante={dados.agente.bloqueadas > dados.agente.total / 2 ? "alerta" : undefined}
                />
                <Card
                  rotulo="Prontas"
                  valor={dados.agente.backlog}
                  define="Sprint Backlog, prontas para alguém puxar."
                />
              </div>
            </section>

            <section>
              <h2>Horas</h2>
              <p className="escopo">
                Somadas nas <strong>sub-tarefas</strong> das histórias do escopo, porque a
                estimativa mora um nível abaixo e somar na história devolveria zero.
              </p>
              <div className="grade">
                <Card
                  rotulo="Estimativa original"
                  valor={h(dados.esforco.estimadoH)}
                  define="Soma da estimativa original das sub-tarefas do escopo."
                  nota={`${dados.esforco.subtarefas} sub-tarefas`}
                />
                <Card
                  rotulo="Horas gastas"
                  valor={h(dados.esforco.gastoH)}
                  define="Soma do tempo que o time apontou nessas mesmas sub-tarefas."
                  nota={`${h(dados.esforco.gastoH - dados.esforco.estimadoH)} acima do estimado`}
                />
              </div>
            </section>

            <section>
              <h2>Previsibilidade</h2>
              <p className="escopo">
                Projeção a partir do que o time já entregou.{" "}
                <strong>Ela assume que o escopo para de crescer</strong>, e ele não está parando.
                Leia como ordem de grandeza, não como data.
              </p>
              <div className="grade">
                <Card
                  rotulo="Falta pela estimativa"
                  valor={h(p.restanteEstimadoH)}
                  define="Estimativa das sub-tarefas que ainda não foram concluídas."
                />
                <Card
                  rotulo="Falta pela estatística"
                  valor={p.restanteAjustadoH !== null ? h(p.restanteAjustadoH) : "sem dado"}
                  define={`O que falta, corrigido pela aderência de ${
                    a !== null ? a.toFixed(2) : "?"
                  }x medida nas ${dados.esforco.pareadoItens} sub-tarefas fechadas que tinham estimativa e apontamento.`}
                  nota={`${dados.esforco.semEstimativa} sub-tarefas fecharam sem nunca ter tido estimativa e ficam de fora dessa conta.`}
                  variante="destaque"
                />
                <Card
                  rotulo="Vazão semanal"
                  valor={h(p.vazaoSemanalH)}
                  define="Média de horas apontadas por semana desde o início do escopo."
                  nota={`${p.semanasDecorridas.toFixed(
                    1,
                  )} semanas corridas. É média do período, suaviza pico e vale.`}
                />
                <Card
                  rotulo="Semanas para acabar"
                  valor={p.semanasRestantes !== null ? p.semanasRestantes.toFixed(1) : "sem dado"}
                  define="Falta pela estatística dividido pela vazão semanal."
                  nota="Só vale se o escopo parar de crescer."
                />
                <Card
                  rotulo="Dimensionadas por T-shirt"
                  valor={`${dados.dimensionamento.comTshirt} de ${dados.escopoTotal}`}
                  define="Histórias do escopo com o campo Tamanho T-Shirt preenchido."
                  nota={
                    dados.dimensionamento.comTshirt === 0
                      ? "Zero real, conferido com controle: o PTF inteiro tem 165 preenchidas. O agente Dimensionador foi publicado e nunca rodou."
                      : "Base para estimar história que ainda não tem sub-tarefa."
                  }
                  variante={dados.dimensionamento.comTshirt === 0 ? "alerta" : undefined}
                />
              </div>
            </section>

            <section>
              <h2>Quem está no status Bloqueado</h2>
              <p className="escopo">
                As {dados.bloqueio.total} histórias do escopo em <code>Bloqueado</code>, separadas
                por origem. <strong>O Jira não diz o motivo do bloqueio</strong>, então isto separa
                quem escreveu, não a causa do impedimento.
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
                      do agente
                    </span>
                    <span>
                      <i style={{ background: "var(--erro)" }} />
                      de pessoa
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
                  rotulo="Escritas por pessoa"
                  valor={dados.bloqueio.real}
                  define="Bloqueado e sem o rótulo."
                  nota="Aqui é onde o impedimento de time costuma estar."
                  variante="destaque"
                />
              </div>
            </section>

            <p className="rodape">
              <strong>Como ler.</strong> Todo número desta tela sai da mesma população: as{" "}
              {dados.escopoTotal} histórias do projeto PTF sob a iniciativa HPX-31, o escopo da sala
              de guerra. Nada aqui olha o PTF inteiro, então os blocos reconciliam entre si. O
              período vai de {dia(dados.periodo.inicio)}, quando nasceu o primeiro item do escopo,
              até {dia(dados.periodo.ultimaMexida)}, a última mexida. A tela recarrega sozinha a
              cada minuto e o servidor guarda a leitura por mais um minuto, então o número pode ter
              até dois minutos de idade. O horário no topo diz com qual conta o Jira foi lido,
              porque o painel mostra o que essa conta enxerga.
            </p>
          </>
        )}
      </main>
    </>
  );
}
