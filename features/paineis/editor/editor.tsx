"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
} from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { Botao } from "@/componentes/ui/botao";
import { PainelRender } from "@/features/paineis/renderizador/painel-render";
import { salvarTema } from "@/lib/painel/acoes-construtor";
import type { PainelCompleto } from "@/lib/painel/consultas";
import type { Campo } from "@/lib/painel/tipos";
import type { Tema } from "@/lib/painel/tema";
import { Arvore, type Selecao } from "./arvore";
import { AjustesTema } from "./ajustes-tema";
import { AjustesFaixa } from "./ajustes-faixa";
import { AjustesCard } from "./ajustes-card";

export type Fonte = { id: number; nome: string; chave: string; campos: Campo[] };

const LARGURAS = {
  desktop: "100%",
  tablet: "834px",
  celular: "390px",
} as const;

type Dispositivo = keyof typeof LARGURAS;

export function Editor({ painel, fontes }: { painel: PainelCompleto; fontes: Fonte[] }) {
  const router = useRouter();

  // O tema vive no estado enquanto a pessoa mexe, e só vai ao banco quando ela
  // salva. É isso que faz a cor mudar na hora: a prévia lê daqui, não do banco.
  const [tema, setTema] = useState<Tema>(painel.tema);
  const [cabecalho, setCabecalho] = useState({
    titulo: painel.titulo ?? "",
    subtitulo: painel.subtitulo ?? "",
  });
  const [sujo, setSujo] = useState(false);

  /** A estrutura vive aqui para a árvore e a prévia lerem a MESMA lista. Se
   *  cada uma tivesse a sua, arrastar mexeria numa e não na outra. */
  const [faixas, setFaixas] = useState(painel.faixas);

  const [selecao, setSelecao] = useState<Selecao>({ tipo: "painel" });
  const [dispositivo, setDispositivo] = useState<Dispositivo>("desktop");
  const [aba, setAba] = useState<"estrutura" | "previa" | "ajustes">("previa");
  const [salvando, iniciar] = useTransition();

  function mudarTema(mudanca: Partial<Tema>) {
    setTema((t) => ({ ...t, ...mudanca }));
    setSujo(true);
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarTema(painel.id, tema, cabecalho);
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      setSujo(false);
      aviso.sucesso("Aparência salva.");
      router.refresh();
    });
  }

  // O servidor manda a versão nova depois de cada gravação; adotar aqui evita
  // a tela ficar mostrando o que o banco já não tem.
  useEffect(() => {
    setFaixas(painel.faixas);
  }, [painel.faixas]);

  const painelLocal = { ...painel, faixas };

  const faixaSelecionada =
    selecao.tipo === "faixa" ? faixas.find((f) => f.id === selecao.id) : undefined;

  const cardSelecionado =
    selecao.tipo === "card"
      ? faixas.flatMap((f) => f.cards).find((c) => c.id === selecao.id)
      : undefined;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-grey-200">
      {/* barra de cima */}
      <header className="border-grey-300/60 bg-background flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/panels/${painel.id}`}
            className="text-grey-400 hover:text-grey-600 flex items-center gap-1 text-sm"
          >
            <IconArrowLeft size={16} />
            <span className="hidden sm:inline">Sair do editor</span>
          </Link>
          <span className="text-grey-600 truncate text-sm font-medium">{painel.nome}</span>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          {(
            [
              ["desktop", IconDeviceDesktop],
              ["tablet", IconDeviceTablet],
              ["celular", IconDeviceMobile],
            ] as const
          ).map(([chave, Icone]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setDispositivo(chave)}
              aria-label={chave}
              aria-pressed={dispositivo === chave}
              className={`rounded-md p-2 ${
                dispositivo === chave
                  ? "bg-grey-200 text-grey-600"
                  : "text-grey-400 hover:bg-grey-200"
              }`}
            >
              <Icone size={18} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-grey-400 hidden text-xs sm:inline">
            {sujo ? "alterações não salvas" : "tudo salvo"}
          </span>
          <Botao onClick={salvar} disabled={salvando || !sujo}>
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </header>

      {/* abas, só no mobile */}
      <div className="border-grey-300/60 bg-background flex shrink-0 border-b lg:hidden">
        {(["estrutura", "previa", "ajustes"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`flex-1 px-3 py-2.5 text-sm capitalize ${
              aba === a
                ? "text-primary border-primary border-b-2 font-medium"
                : "text-grey-400 border-b-2 border-transparent"
            }`}
          >
            {a === "previa" ? "prévia" : a}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* esquerda: estrutura */}
        <aside
          className={`border-grey-300/60 bg-background w-full shrink-0 overflow-y-auto border-r p-3 lg:block lg:w-64 ${
            aba === "estrutura" ? "block" : "hidden"
          }`}
        >
          <Arvore
            painelId={painel.id}
            faixas={faixas}
            aoMudarEstrutura={setFaixas}
            selecao={selecao}
            aoSelecionar={(s) => {
              setSelecao(s);
              setAba("ajustes");
            }}
          />
        </aside>

        {/* meio: prévia */}
        <main
          className={`min-w-0 flex-1 overflow-y-auto bg-grey-200 p-4 lg:block ${
            aba === "previa" ? "block" : "hidden"
          }`}
        >
          <div
            className="mx-auto overflow-hidden rounded-xl border border-grey-300/60 bg-white shadow-sm transition-[max-width] duration-200"
            style={{ maxWidth: LARGURAS[dispositivo] }}
          >
            <PainelRender
              painel={painelLocal}
              temaAoVivo={tema}
              selecao={selecao.tipo === "painel" ? null : selecao}
              aoSelecionar={(alvo) => {
                setSelecao(alvo);
                setAba("ajustes");
              }}
            />
          </div>
        </main>

        {/* direita: ajustes do que estiver selecionado */}
        <aside
          className={`border-grey-300/60 bg-background w-full shrink-0 overflow-y-auto border-l p-4 lg:block lg:w-80 ${
            aba === "ajustes" ? "block" : "hidden"
          }`}
        >
          {selecao.tipo === "painel" && (
            <AjustesTema
              tema={tema}
              cabecalho={cabecalho}
              aoMudarTema={mudarTema}
              aoMudarCabecalho={(c) => {
                setCabecalho((x) => ({ ...x, ...c }));
                setSujo(true);
              }}
            />
          )}

          {faixaSelecionada && (
            <AjustesFaixa
              painelId={painel.id}
              faixa={faixaSelecionada}
              aoFechar={() => setSelecao({ tipo: "painel" })}
            />
          )}

          {cardSelecionado && (
            <AjustesCard
              painelId={painel.id}
              card={cardSelecionado}
              faixas={faixas.map((f) => ({
                id: f.id,
                titulo: f.titulo,
                colunas: f.colunas,
              }))}
              fontes={fontes}
              aoFechar={() => setSelecao({ tipo: "painel" })}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
