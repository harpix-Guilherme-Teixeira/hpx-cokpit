"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aviso } from "@/componentes/ui/toast";
import { criarConjunto } from "@/lib/painel/acoes";
import { inferirColunas } from "@/lib/painel/inferir";
import { MODELOS_CONJUNTO } from "@/lib/painel/modelos-conjunto";
import { aoSlug } from "@/lib/painel/slug";
import { sugerirCards } from "@/lib/painel/sugestoes";
import type { Cadencia, ColunaDefinicao, Grao } from "@/lib/painel/tipos";

type useNovoConjuntoProps = { paineis: { id: number; nome: string }[] };

export const PASSOS = ["O que registrar", "Colunas", "Tempo", "Dono e fonte", "Onde aparece"];

export type ColunaEmEdicao = ColunaDefinicao & { uid: string };

const uid = () => Math.random().toString(36).slice(2, 10);

function colunaVazia(): ColunaEmEdicao {
  return {
    uid: uid(),
    nome: "",
    tipo: "texto",
    formato: "inteiro",
    casas: 0,
    opcoes: [],
    obrigatorio: false,
  };
}

export function useNovoConjunto({ paineis }: useNovoConjuntoProps) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [passo, setPasso] = useState(0);

  const [grao, setGrao] = useState<Grao>("item");
  const [modelo, setModelo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [colunas, setColunas] = useState<ColunaEmEdicao[]>([colunaVazia()]);
  const [linhas, setLinhas] = useState<string[][] | null>(null);
  const [campoDataUid, setCampoDataUid] = useState<string | null>(null);
  const [guardarHistorico, setGuardarHistorico] = useState(true);
  const [dono, setDono] = useState("");
  const [cadencia, setCadencia] = useState<Cadencia>("semanal");
  const [fonte, setFonte] = useState("");
  const [painelId, setPainelId] = useState(paineis[0] ? String(paineis[0].id) : "");
  const [marcados, setMarcados] = useState<Set<string> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const colunasDeData = colunas.filter((c) => c.tipo === "data" && c.nome.trim());

  /** A coluna de data escolhida recebe o papel que o grão pede. É o que faz a
   *  sugestão de card saber o que comparar, sem obrigar a pessoa a entender a
   *  palavra "papel". */
  const colunasFinais: ColunaEmEdicao[] = useMemo(
    () =>
      colunas.map((c) =>
        c.uid === campoDataUid && c.papel !== "data_conclusao"
          ? { ...c, papel: grao === "medicao" ? "periodo" : "data_evento" }
          : c,
      ),
    [colunas, campoDataUid, grao],
  );

  const sugestoes = useMemo(
    () => sugerirCards(grao, colunasFinais, nome),
    [grao, colunasFinais, nome],
  );

  const escolhidos =
    marcados ?? new Set(sugestoes.filter((s) => s.recomendado).map((s) => s.chave));

  function aplicarModelo(chave: string) {
    setModelo(chave);
    const m = MODELOS_CONJUNTO.find((x) => x.chave === chave);
    if (!m) return;

    const novas = m.colunas.map((c) => ({ ...c, uid: uid() }));
    setGrao(m.grao);
    setCadencia(m.cadencia);
    setFonte(m.fonte);
    setDescricao((atual) => atual || m.descricao);
    setNome((atual) => atual || m.nome);
    setColunas(novas);
    setLinhas(null);
    setMarcados(null);
    setCampoDataUid(
      novas.find((c) => c.papel === "periodo" || c.papel === "data_evento")?.uid ?? null,
    );
  }

  function colarPlanilha(texto: string) {
    const r = inferirColunas(texto, grao);
    if (r.colunas.length === 0) {
      aviso.erro(
        "Não li nada",
        "Cole o bloco copiado da planilha, com a primeira linha de títulos.",
      );
      return;
    }

    const novas = r.colunas.map((c) => ({ ...c, uid: uid() }));
    setColunas(novas);
    setLinhas(r.linhas);
    setMarcados(null);
    setCampoDataUid(
      novas.find((c) => c.papel === "periodo" || c.papel === "data_evento")?.uid ?? null,
    );
    aviso.sucesso(
      `${novas.length} colunas e ${r.linhas.length} linhas lidas.`,
      "O tipo de cada coluna é um palpite. Confira antes de continuar.",
    );
  }

  function mudarColuna(alvo: string, m: Partial<ColunaEmEdicao>) {
    setColunas((atual) => atual.map((c) => (c.uid === alvo ? { ...c, ...m } : c)));
  }

  function removerColuna(alvo: string) {
    setColunas((atual) => atual.filter((c) => c.uid !== alvo));
    if (campoDataUid === alvo) setCampoDataUid(null);
  }

  function moverColuna(alvo: string, direcao: -1 | 1) {
    setColunas((atual) => {
      const i = atual.findIndex((c) => c.uid === alvo);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function alternarCard(chave: string) {
    const base = new Set(escolhidos);
    if (base.has(chave)) base.delete(chave);
    else base.add(chave);
    setMarcados(base);
  }

  function validar(qual: number): string | null {
    if (qual === 0 && nome.trim().length < 2) return "Dê um nome ao conjunto.";

    if (qual === 1) {
      const nomeadas = colunas.filter((c) => c.nome.trim());
      if (nomeadas.length === 0) return "Um conjunto sem coluna nenhuma não guarda nada.";

      const chaves = nomeadas.map((c) => aoSlug(c.nome));
      const repetida = chaves.find((c, i) => chaves.indexOf(c) !== i);
      if (repetida) {
        return `Duas colunas viram a mesma chave "${repetida}". Mude um dos nomes, senão a segunda apaga a primeira.`;
      }

      const semOpcoes = nomeadas.find(
        (c) => c.tipo === "opcao" && c.opcoes.filter((o) => o.trim()).length === 0,
      );
      if (semOpcoes) return `A coluna "${semOpcoes.nome}" é do tipo opção e está sem opções.`;
    }

    if (qual === 2 && grao === "medicao" && !campoDataUid) {
      return "Medição precisa de uma coluna de data: é ela que diz de qual período é cada número.";
    }

    return null;
  }

  function avancar() {
    const problema = validar(passo);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }

  function voltar() {
    setErro(null);
    setPasso((p) => Math.max(p - 1, 0));
  }

  function limpar() {
    setPasso(0);
    setGrao("item");
    setModelo("");
    setNome("");
    setDescricao("");
    setColunas([colunaVazia()]);
    setLinhas(null);
    setCampoDataUid(null);
    setGuardarHistorico(true);
    setDono("");
    setCadencia("semanal");
    setFonte("");
    setPainelId(paineis[0] ? String(paineis[0].id) : "");
    setMarcados(null);
    setErro(null);
  }

  function fechar() {
    setAberta(false);
    limpar();
  }

  function criar() {
    for (let i = 0; i < PASSOS.length; i += 1) {
      const problema = validar(i);
      if (problema) {
        setPasso(i);
        setErro(problema);
        return;
      }
    }

    const nomeadas = colunasFinais.filter((c) => c.nome.trim());
    const indiceData = nomeadas.findIndex((c) => c.uid === campoDataUid);

    iniciar(async () => {
      const r = await criarConjunto({
        nome,
        descricao,
        grao,
        colunas: nomeadas.map(({ uid: _uid, ...c }) => c),
        campoDataIndice: indiceData >= 0 ? indiceData : null,
        guardarHistorico,
        dono,
        cadencia,
        fonte,
        painelId: painelId ? Number(painelId) : undefined,
        cards: [...escolhidos],
        linhas: linhas ?? undefined,
      });

      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      aviso.sucesso(
        "Conjunto criado.",
        r.dado.importadas > 0
          ? `${r.dado.importadas} linhas importadas${r.dado.puladas > 0 ? `, ${r.dado.puladas} com erro ficaram de fora` : ""}.`
          : undefined,
      );
      if (r.dado.avisoImportacao) aviso.alerta("As linhas não entraram", r.dado.avisoImportacao);

      const destino = r.dado.id;
      fechar();
      router.push(`/datasets/${destino}`);
    });
  }

  return {
    aberta,
    abrir: () => setAberta(true),
    fechar,
    passo,
    avancar,
    voltar,
    grao,
    setGrao,
    modelo,
    aplicarModelo,
    nome,
    setNome,
    descricao,
    setDescricao,
    colunas,
    colunasDeData,
    colarPlanilha,
    mudarColuna,
    removerColuna,
    moverColuna,
    adicionarColuna: () => setColunas((a) => [...a, colunaVazia()]),
    linhas,
    campoDataUid,
    setCampoDataUid,
    guardarHistorico,
    setGuardarHistorico,
    dono,
    setDono,
    cadencia,
    setCadencia,
    fonte,
    setFonte,
    paineis,
    painelId,
    setPainelId,
    sugestoes,
    escolhidos,
    alternarCard,
    erro,
    salvando,
    criar,
  };
}

export type CriacaoConjunto = ReturnType<typeof useNovoConjunto>;
