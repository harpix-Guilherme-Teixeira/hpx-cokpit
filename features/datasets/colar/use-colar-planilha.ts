"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aviso } from "@/componentes/ui/toast";
import { importarLinhas } from "@/lib/painel/acoes-dados";
import { converter, lerColagem, mapearColunas, primeiraEhCabecalho } from "@/lib/painel/converter";
import type { Campo } from "@/lib/painel/tipos";

type useColarPlanilhaProps = {
  conjuntoId: number;
  campos: Campo[];
};

export type LinhaAnalisada = {
  numero: number;
  celulas: { texto: string; erro?: string }[];
  valida: boolean;
};

export function useColarPlanilha({ conjuntoId, campos }: useColarPlanilhaProps) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState("");
  const [cabecalhoForcado, setCabecalhoForcado] = useState<boolean | null>(null);
  const [importando, iniciar] = useTransition();

  const matriz = useMemo(() => lerColagem(texto), [texto]);
  const primeira = matriz[0] ?? [];

  // A detecção de cabeçalho é palpite. Fica visível e dá para desligar, porque
  // errar para um lado importa o cabeçalho como dado e para o outro engole a
  // primeira linha de verdade.
  const detectado = primeira.length > 0 && primeiraEhCabecalho(primeira, campos);
  const temCabecalho = cabecalhoForcado ?? detectado;

  const mapa = useMemo(
    () => mapearColunas(primeira, campos, temCabecalho),
    [primeira, campos, temCabecalho],
  );
  const corpo = useMemo(() => (temCabecalho ? matriz.slice(1) : matriz), [matriz, temCabecalho]);

  const analise: LinhaAnalisada[] = useMemo(
    () =>
      corpo.map((linha, i) => {
        const celulas = mapa.map((chave, j) => {
          const bruto = linha[j] ?? "";
          if (!chave) return { texto: bruto };
          const campo = campos.find((c) => c.chave === chave)!;
          const conversao = converter(bruto, campo);
          return conversao.ok ? { texto: bruto } : { texto: bruto, erro: conversao.erro };
        });
        return {
          numero: i + 1 + (temCabecalho ? 1 : 0),
          celulas,
          valida: celulas.every((c) => !c.erro),
        };
      }),
    [corpo, mapa, campos, temCabecalho],
  );

  const validas = analise.filter((a) => a.valida).length;
  const colunasUsadas = mapa
    .map((chave, j) => ({ chave, j }))
    .filter((x): x is { chave: string; j: number } => x.chave !== null);
  const ignoradas = mapa
    .map((chave, j) =>
      chave ? null : temCabecalho ? primeira[j] || `coluna ${j + 1}` : `coluna ${j + 1}`,
    )
    .filter((x): x is string => x !== null);
  const faltamObrigatorias = campos
    .filter((c) => c.obrigatorio && !mapa.includes(c.chave))
    .map((c) => c.nome);

  function fechar() {
    setAberta(false);
    setTexto("");
    setCabecalhoForcado(null);
  }

  function importar() {
    iniciar(async () => {
      const r = await importarLinhas(conjuntoId, corpo, mapa);
      if (!r.ok) {
        aviso.erro("Não importei", r.erro);
        return;
      }
      aviso.sucesso(
        `${r.dado.inseridas} linha${r.dado.inseridas === 1 ? "" : "s"} importada${r.dado.inseridas === 1 ? "" : "s"}.`,
        r.dado.puladas > 0 ? `${r.dado.puladas} com erro ficaram de fora.` : undefined,
      );
      fechar();
      router.refresh();
    });
  }

  return {
    aberta,
    abrir: () => setAberta(true),
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
  };
}
