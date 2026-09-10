"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChartBar,
  IconGripVertical,
  IconLayoutDashboard,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { Botao } from "@/componentes/ui/botao";
import {
  reordenarCards,
  reordenarFaixas,
  salvarCard,
  salvarFaixa,
} from "@/lib/painel/acoes-construtor";
import type { PainelCompleto } from "@/lib/painel/consultas";

export type Selecao = { tipo: "painel" } | { tipo: "faixa" | "card"; id: number };

/** Um DndContext só, com id prefixado para saber o que está sendo arrastado.
 *
 *  A primeira versão tinha um DndContext por faixa, aninhado no de fora. No
 *  dnd-kit isso não funciona: o contexto interno intercepta o sensor e o
 *  externo nunca recebe o evento, então nada se movia. Prefixo resolve sem
 *  aninhar: "f:" é faixa, "c:" é card. */
const idFaixa = (n: number) => `f:${n}`;
const idCard = (n: number) => `c:${n}`;
const numeroDe = (id: string) => Number(id.slice(2));
const ehFaixa = (id: string) => id.startsWith("f:");

function Item({
  id,
  ativo,
  recuo,
  icone,
  rotulo,
  aoClicar,
}: {
  id: string;
  ativo: boolean;
  recuo?: boolean;
  icone: React.ReactNode;
  rotulo: string;
  aoClicar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`flex items-center gap-1 rounded-md ${recuo ? "ml-4" : ""} ${
        ativo ? "bg-primary/10 text-primary" : "text-grey-500 hover:bg-grey-200"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Mover ${rotulo}`}
        // `touch-none` é obrigatório: sem ele o navegador trata o arrasto como
        // rolagem no toque e o item nunca sai do lugar no celular.
        className="text-grey-300 hover:text-grey-500 cursor-grab touch-none px-1 py-2 active:cursor-grabbing"
      >
        <IconGripVertical size={14} />
      </button>
      <button
        type="button"
        onClick={aoClicar}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm"
      >
        {icone}
        <span className="truncate">{rotulo}</span>
      </button>
    </div>
  );
}

/** A estrutura NÃO mora aqui, mora no editor.
 *
 *  Na primeira versão a árvore guardava a própria cópia e a prévia continuava
 *  lendo o que veio do servidor: o item andava na lista da esquerda e o painel
 *  do meio só pulava depois do refresh. Com o estado em cima, as duas leem da
 *  mesma fonte e o arrasto aparece nos dois lugares no mesmo quadro. */
export function Arvore({
  painelId,
  faixas: local,
  aoMudarEstrutura: setLocal,
  selecao,
  aoSelecionar,
}: {
  painelId: number;
  faixas: PainelCompleto["faixas"];
  aoMudarEstrutura: (f: PainelCompleto["faixas"]) => void;
  selecao: Selecao;
  aoSelecionar: (s: Selecao) => void;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [arrastando, setArrastando] = useState<string | null>(null);

  const sensores = useSensors(
    // Distância mínima, senão o clique de selecionar vira arrasto de dois pixels.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function faixaDoCard(cardId: number) {
    return local.find((f) => f.cards.some((c) => c.id === cardId));
  }

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    const { active, over } = e;
    if (!over) return;

    const de = String(active.id);
    const para = String(over.id);
    if (de === para) return;

    const antes = local;

    // ---------- faixa muda de posição ----------
    if (ehFaixa(de)) {
      if (!ehFaixa(para)) return;
      const i = local.findIndex((f) => f.id === numeroDe(de));
      const j = local.findIndex((f) => f.id === numeroDe(para));
      if (i < 0 || j < 0) return;

      const nova = arrayMove(local, i, j);
      setLocal(nova);

      iniciar(async () => {
        const r = await reordenarFaixas(
          painelId,
          nova.map((f) => f.id),
        );
        if (!r.ok) {
          setLocal(antes);
          aviso.erro(r.erro);
          return;
        }
        router.refresh();
      });
      return;
    }

    // ---------- card muda de posição, na mesma faixa ou em outra ----------
    const cardId = numeroDe(de);
    const origem = faixaDoCard(cardId);
    if (!origem) return;

    // Soltar sobre a faixa manda para o fim dela. Soltar sobre um card entra
    // na posição daquele card.
    const destino = ehFaixa(para)
      ? local.find((f) => f.id === numeroDe(para))
      : faixaDoCard(numeroDe(para));
    if (!destino) return;

    const card = origem.cards.find((c) => c.id === cardId)!;

    const nova = local.map((f) => {
      if (f.id === origem.id && f.id === destino.id) {
        const i = f.cards.findIndex((c) => c.id === cardId);
        const j = ehFaixa(para)
          ? f.cards.length - 1
          : f.cards.findIndex((c) => c.id === numeroDe(para));
        return { ...f, cards: arrayMove(f.cards, i, j) };
      }
      if (f.id === origem.id) return { ...f, cards: f.cards.filter((c) => c.id !== cardId) };
      if (f.id === destino.id) {
        const j = ehFaixa(para)
          ? f.cards.length
          : f.cards.findIndex((c) => c.id === numeroDe(para));
        const copia = [...f.cards];
        copia.splice(Math.max(0, j), 0, card);
        return { ...f, cards: copia };
      }
      return f;
    });

    setLocal(nova);

    iniciar(async () => {
      const alvo = nova.find((f) => f.id === destino.id)!;
      const r = await reordenarCards(
        painelId,
        destino.id,
        alvo.cards.map((c) => c.id),
      );

      if (!r.ok) {
        setLocal(antes);
        aviso.erro(r.erro);
        return;
      }

      // Mudou de faixa: a de origem também precisa ter a ordem reescrita, senão
      // ficam buracos na numeração e o próximo arrasto cai no lugar errado.
      if (origem.id !== destino.id) {
        const restante = nova.find((f) => f.id === origem.id)!;
        await reordenarCards(
          painelId,
          origem.id,
          restante.cards.map((c) => c.id),
        );
      }

      router.refresh();
    });
  }

  function novaFaixa() {
    iniciar(async () => {
      const r = await salvarFaixa(painelId, {
        titulo: "Nova faixa",
        colunas: 4,
        fundo: "transparente",
        recolhivel: false,
        visivel: true,
      });
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      router.refresh();
      aoSelecionar({ tipo: "faixa", id: r.dado.id });
    });
  }

  function novoCard(faixaId: number) {
    iniciar(async () => {
      // Nasce como texto porque é o único tipo que não exige fonte de dados.
      // Nascer como número obrigaria a escolher conjunto e métrica antes de o
      // card existir, e o primeiro clique viraria um formulário.
      const r = await salvarCard(painelId, {
        faixaId,
        tipo: "texto",
        titulo: "Novo card",
        definicao: "Escreva aqui o que este card mostra.",
        config: { texto: "Clique para editar." },
        largura: 1,
      });
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      router.refresh();
      aoSelecionar({ tipo: "card", id: r.dado.id });
    });
  }

  const rotuloArrastado = (() => {
    if (!arrastando) return null;
    if (ehFaixa(arrastando)) return local.find((f) => f.id === numeroDe(arrastando))?.titulo;
    return local.flatMap((f) => f.cards).find((c) => c.id === numeroDe(arrastando))?.titulo;
  })();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => aoSelecionar({ tipo: "painel" })}
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
          selecao.tipo === "painel"
            ? "bg-primary/10 text-primary font-medium"
            : "text-grey-500 hover:bg-grey-200"
        }`}
      >
        <IconSettings size={16} />
        Aparência do painel
      </button>

      <p className="text-grey-400 mt-3 px-2 text-xs font-bold tracking-widest uppercase">
        Estrutura
      </p>

      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setArrastando(String(e.active.id))}
        onDragCancel={() => setArrastando(null)}
        onDragEnd={aoSoltar}
      >
        <SortableContext
          items={local.map((f) => idFaixa(f.id))}
          strategy={verticalListSortingStrategy}
        >
          {local.map((faixa) => (
            <div key={faixa.id} className="mb-1">
              <Item
                id={idFaixa(faixa.id)}
                ativo={selecao.tipo === "faixa" && selecao.id === faixa.id}
                icone={<IconLayoutDashboard size={16} />}
                rotulo={faixa.titulo}
                aoClicar={() => aoSelecionar({ tipo: "faixa", id: faixa.id })}
              />

              <SortableContext
                items={faixa.cards.map((c) => idCard(c.id))}
                strategy={verticalListSortingStrategy}
              >
                {faixa.cards.map((card) => (
                  <Item
                    key={card.id}
                    id={idCard(card.id)}
                    recuo
                    ativo={selecao.tipo === "card" && selecao.id === card.id}
                    icone={<IconChartBar size={14} />}
                    rotulo={card.titulo}
                    aoClicar={() => aoSelecionar({ tipo: "card", id: card.id })}
                  />
                ))}
              </SortableContext>

              <button
                type="button"
                onClick={() => novoCard(faixa.id)}
                className="text-grey-400 hover:text-primary ml-8 flex items-center gap-1 py-1.5 text-xs"
              >
                <IconPlus size={13} />
                Card
              </button>
            </div>
          ))}
        </SortableContext>

        {/* O fantasma que segue o cursor. Sem ele o arrasto fica invisível
            enquanto a lista se reorganiza embaixo. */}
        <DragOverlay>
          {rotuloArrastado ? (
            <div className="border-primary bg-background text-grey-600 rounded-md border px-3 py-2 text-sm shadow-md">
              {rotuloArrastado}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Botao tom="contorno" tamanho="p" onClick={novaFaixa} className="mt-3">
        <IconPlus size={14} />
        Adicionar faixa
      </Botao>
    </div>
  );
}
