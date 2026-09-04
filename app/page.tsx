"use client";

import { useEffect, useState } from "react";

type Dados = {
  atualizadoEm: string;
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
  refinamento: {
    refinadas: number;
    semRefino: number;
    doAgente: number;
    refinadasSemEstimativa: number;
    refinadasComEstimativa: number;
  };
  entrega: { concluidas: number; doAgente: number };
  dimensionamento: { comTshirt: number; semTshirt: number };
  previsibilidade: {
    restanteEstimadoH: number;
    restanteAjustadoH: number | null;
    vazaoSemanalH: number;
    semanasDecorridas: number;
    abertas: number;
    abertasComEstimativa: number;
    cobertura: number | null;
  };
  esforco: {
    estimadoH: number;
    gastoH: number;
    subtarefas: number;
    regua: {
      faixas: { nome: string; de: number; ate: number; n: number; mediaH: number }[];
      historiasFechadas: number;
      mediaH: number;
      medianaH: number;
    };
    projecao: { historiasAbertas: number; porMediaH: number; porMedianaH: number };
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
              ? `Lido do Jira às ${new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR")}`
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
                iniciativa HPX-31), estas são as que o agente escreveu. Contagem acumulada desde{" "}
                {dia(dados.periodo.inicio)}, não é do mês.
              </p>
              <div className="grade seis">
                <Card
                  rotulo="Todas do agente"
                  valor={dados.agente.total}
                  define="Histórias que carregam o rótulo rascunho-agente."
                  nota={`${pct(
                    dados.agente.total,
                    dados.escopoTotal,
                  )}% do escopo. Somando as ${dados.agente.concluidas} concluídas do agente, mais em andamento, bloqueadas e prontas, fecha este total.`}
                  variante="destaque"
                />
                <Card
                  rotulo="Refinadas"
                  valor={dados.refinamento.doAgente}
                  define="Campo Refinado marcado como Sim."
                  nota={`${pct(
                    dados.refinamento.doAgente,
                    dados.agente.total,
                  )}% das do agente. Refinada não é estimada: ${
                    dados.refinamento.refinadasSemEstimativa
                  } das ${dados.refinamento.refinadas} refinadas do escopo não têm nenhuma sub-tarefa estimada.`}
                />
                <Card
                  rotulo="Em andamento"
                  valor={dados.agente.andamento}
                  define="Em Desenvolvimento, Em Testes ou Liberado para Testes."
                />
                <Card
                  rotulo="Concluídas no escopo"
                  valor={dados.entrega.concluidas}
                  define="Status Concluído, contando as histórias do escopo inteiro, escritas por quem quer que seja."
                  nota={`${dados.entrega.doAgente} vieram do agente e ${
                    dados.entrega.concluidas - dados.entrega.doAgente
                  } de pessoa. É o único card deste bloco que não é só do agente.`}
                  variante="destaque"
                />
                <Card
                  rotulo="Bloqueadas"
                  valor={dados.agente.bloqueadas}
                  define="Status Bloqueado."
                  nota={`${pct(
                    dados.agente.bloqueadas,
                    dados.agente.total,
                  )}% das do agente. O Jira registra o status, não o motivo. A quebra está no último bloco.`}
                  variante={dados.agente.bloqueadas > dados.agente.total / 2 ? "alerta" : undefined}
                />
                <Card
                  rotulo="Prontas"
                  valor={dados.agente.backlog}
                  define="Sprint Backlog, disponíveis para alguém puxar."
                />
              </div>
            </section>

            <section>
              <h2>Horas</h2>
              <p className="escopo">
                Somadas nas <strong>sub-tarefas</strong>, porque a estimativa mora um nível abaixo
                da história e somar na história devolveria zero.
              </p>
              <div className="grade">
                <Card
                  rotulo="Estimativa original"
                  valor={h(dados.esforco.estimadoH)}
                  define={`Soma da estimativa nas ${dados.esforco.subtarefas} sub-tarefas do escopo. Quem nunca foi estimado entra como zero.`}
                  nota="Por isso este número é piso, não é o esforço total previsto."
                />
                <Card
                  rotulo="Horas apontadas"
                  valor={h(dados.esforco.gastoH)}
                  define="Soma do tempo que o time registrou nessas mesmas sub-tarefas."
                  nota="Fora desta conta ficam cerca de 42h apontadas em ritos, melhorias e sub-bugs, que o painel ainda não soma."
                />
              </div>
            </section>

            <section>
              <h2>Previsibilidade</h2>
              <p className="escopo">
                <strong>Hoje não dá para prever quando acaba.</strong> Este bloco existe para dizer
                o porquê, e o que precisa mudar para conseguirmos. As duas caixas da direita são as
                que travam: enquanto elas não caírem, somar horas responde sobre menos da metade do
                trabalho.
              </p>
              <div className="grade">
                <Card
                  rotulo="Falta, no mínimo"
                  valor={h(p.restanteEstimadoH)}
                  define={`Soma da estimativa nas ${p.abertasComEstimativa} sub-tarefas abertas que alguém estimou.`}
                  nota="É piso, não é total. O esforço real que falta é maior, porque a maior parte do que está aberto nunca foi estimado."
                  variante="destaque"
                />
                <Card
                  rotulo="Sub-tarefas abertas sem estimativa"
                  valor={p.abertas - p.abertasComEstimativa}
                  define={`De ${p.abertas} sub-tarefas ainda abertas, só ${p.abertasComEstimativa} têm estimativa.`}
                  nota="Cada uma destas é trabalho que existe e não entra em nenhuma conta de prazo."
                  variante="alerta"
                />
                <Card
                  rotulo="Histórias sem dimensionamento"
                  valor={dados.dimensionamento.semTshirt}
                  define="Histórias do escopo com o campo Tamanho T-Shirt vazio."
                  nota={
                    dados.dimensionamento.comTshirt === 0
                      ? "Nenhuma foi dimensionada. O zero é real, conferido com controle: o PTF inteiro tem 165 preenchidas, então o campo funciona. É o caminho para estimar história que ainda não virou sub-tarefa."
                      : "Caminho para estimar história que ainda não virou sub-tarefa."
                  }
                  variante={dados.dimensionamento.comTshirt === 0 ? "alerta" : undefined}
                />
              </div>
            </section>

            <section>
              <h2>Quem está no status Bloqueado</h2>
              <p className="escopo">
                As {dados.bloqueio.total} histórias do escopo em <code>Bloqueado</code>. O Jira
                registra o status, <strong>não o motivo</strong>, então a separação abaixo é por
                quem escreveu a história, não pela causa do impedimento.
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
                  nota="O Jira não diz se está esperando revisão ou travada por dependência. Só sabemos que está em Bloqueado e que o agente escreveu."
                />
                <Card
                  rotulo="Escritas por pessoa"
                  valor={dados.bloqueio.real}
                  define="Bloqueado e sem o rótulo do agente."
                  nota="Estava neste mesmo número ontem, enquanto o total de bloqueadas subiu. São duas observações, não é tendência."
                  variante="destaque"
                />
              </div>
            </section>

            <p className="rodape">
              <strong>Como ler.</strong> Todo número desta tela sai da mesma população, as{" "}
              {dados.escopoTotal} histórias do projeto PTF sob a iniciativa HPX-31. Nada aqui olha o
              PTF inteiro, então os blocos reconciliam entre si. O período vai de{" "}
              {dia(dados.periodo.inicio)}, quando nasceu o primeiro item do escopo, até{" "}
              {dia(dados.periodo.ultimaMexida)}, a última mexida em qualquer item. A tela recarrega
              sozinha a cada minuto e o servidor guarda a leitura por mais um minuto, então o número
              pode ter até dois minutos de idade. Quando a leitura falha, o painel mantém o último
              número bom e avisa em vermelho, nunca mostra zero calado.
            </p>
          </>
        )}
      </main>
    </>
  );
}
