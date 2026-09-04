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
                <strong>Ainda não dá para prever data.</strong> Só existem{" "}
                {p.semanasDecorridas.toFixed(0)} semanas de histórico e menos da metade do trabalho
                que falta tem estimativa. Os números abaixo dizem o tamanho do que se sabe, e o
                tamanho do que não se sabe.
              </p>
              <div className="grade">
                <Card
                  rotulo="Cobertura da estimativa"
                  valor={p.cobertura !== null ? `${Math.round(p.cobertura * 100)}%` : "sem dado"}
                  define={`Das ${p.abertas} sub-tarefas ainda abertas, ${p.abertasComEstimativa} têm estimativa.`}
                  nota="É este número que trava a previsão de prazo. Enquanto ele não subir, projetar data é adivinhar sobre a metade que falta."
                  variante={p.cobertura !== null && p.cobertura < 0.8 ? "alerta" : undefined}
                />
                <Card
                  rotulo="Falta pela estimativa"
                  valor={h(p.restanteEstimadoH)}
                  define={`Estimativa das ${p.abertasComEstimativa} sub-tarefas abertas que foram estimadas.`}
                  nota={`As outras ${
                    p.abertas - p.abertasComEstimativa
                  } não entram, então o esforço real que falta é maior.`}
                />
                <Card
                  rotulo="Falta pela estatística"
                  valor={p.restanteAjustadoH !== null ? h(p.restanteAjustadoH) : "sem dado"}
                  define={`O mesmo valor corrigido pela aderência de ${
                    a !== null ? a.toFixed(2) : "?"
                  }x, medida nas ${
                    dados.esforco.pareadoItens
                  } sub-tarefas fechadas que tinham estimativa e apontamento.`}
                  nota="Abaixo de 1x significa que o time historicamente entrega em menos tempo do que estima."
                  variante="destaque"
                />
                <Card
                  rotulo="Vazão semanal"
                  valor={h(p.vazaoSemanalH)}
                  define={`Média de horas apontadas por semana desde ${dia(dados.periodo.inicio)}.`}
                  nota={`Apontado total dividido por ${p.semanasDecorridas.toFixed(
                    1,
                  )} semanas corridas. É média do período inteiro, não é a vazão da semana passada nem tendência.`}
                />
                <Card
                  rotulo="Dimensionadas por T-shirt"
                  valor={`${dados.dimensionamento.comTshirt} de ${dados.escopoTotal}`}
                  define="Histórias do escopo com o campo Tamanho T-Shirt preenchido."
                  nota={
                    dados.dimensionamento.comTshirt === 0
                      ? "Zero conferido com controle: o PTF inteiro tem 165 preenchidas, então o campo funciona. É o caminho para estimar história que ainda não virou sub-tarefa."
                      : "Caminho para estimar história que ainda não virou sub-tarefa."
                  }
                  variante={dados.dimensionamento.comTshirt === 0 ? "alerta" : undefined}
                />
              </div>
            </section>

            <section>
              <h2>Régua de tamanho e projeção por classe</h2>
              <p className="escopo">
                Custo real das{" "}
                <strong>
                  {dados.esforco.regua.historiasFechadas} histórias que fecharam por completo
                </strong>
                , com todas as sub-tarefas concluídas. Os limites de faixa são fixos, PP até 2h, P
                até 6h, M até 12h e G acima disso. O custo de cada faixa é{" "}
                <strong>medido, não arbitrado</strong>, e se recalcula a cada leitura.
              </p>
              <div className="grade seis">
                {dados.esforco.regua.faixas.map((f) => (
                  <Card
                    key={f.nome}
                    rotulo={`${f.nome} · ${f.ate > 1e6 ? "acima de 12h" : `até ${f.ate}h`}`}
                    valor={f.n > 0 ? h(f.mediaH) : "sem dado"}
                    define={`Custo médio real das histórias fechadas que caíram nesta faixa.`}
                    nota={`${f.n} ${f.n === 1 ? "história" : "histórias"} na amostra${
                      f.n > 0 && f.n < 5 ? ". Amostra pequena, este número vai se mover." : "."
                    }`}
                    variante={f.n > 0 && f.n < 5 ? "alerta" : undefined}
                  />
                ))}
                <Card
                  rotulo="Custo de uma história"
                  valor={h(dados.esforco.regua.mediaH)}
                  define="Média de todas as histórias fechadas, sem separar por faixa."
                  nota={`Mediana ${h(
                    dados.esforco.regua.medianaH,
                  )}. A média é maior que a mediana porque poucas histórias carregam muito esforço.`}
                  variante="destaque"
                />
              </div>

              <p className="escopo" style={{ marginTop: 24 }}>
                Projeção por <strong>classe de referência</strong>: se as{" "}
                {dados.esforco.projecao.historiasAbertas} histórias abertas custarem o mesmo que as
                que já fecharam, o esforço restante é este. Não depende de ninguém ter estimado
                nada, e por isso <strong>cobre o escopo inteiro</strong> em vez dos 47% que a
                estimativa cobre.
              </p>
              <div className="grade">
                <Card
                  rotulo="Falta, pela média"
                  valor={h(dados.esforco.projecao.porMediaH)}
                  define={`${dados.esforco.projecao.historiasAbertas} histórias abertas vezes ${h(
                    dados.esforco.regua.mediaH,
                  )}, o custo médio de uma história fechada.`}
                  nota="Cenário mais pesado, porque a média carrega o peso das poucas histórias caras."
                  variante="destaque"
                />
                <Card
                  rotulo="Falta, pela mediana"
                  valor={h(dados.esforco.projecao.porMedianaH)}
                  define={`As mesmas ${dados.esforco.projecao.historiasAbertas} histórias vezes ${h(
                    dados.esforco.regua.medianaH,
                  )}, o custo da história típica.`}
                  nota="Cenário mais leve, ignora que algumas histórias vão custar muito mais."
                />
                <Card
                  rotulo="Falta, pela estimativa"
                  valor={h(p.restanteEstimadoH)}
                  define={`Soma da estimativa nas ${p.abertasComEstimativa} sub-tarefas abertas que alguém estimou.`}
                  nota="Muito abaixo das duas projeções ao lado, porque cobre menos da metade do trabalho. Não use este número sozinho."
                  variante="alerta"
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
