"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { excluirFaixa, salvarFaixa } from "@/lib/painel/acoes-construtor";
import type { PainelCompleto } from "@/lib/painel/consultas";

type Faixa = PainelCompleto["faixas"][number];

export function AjustesFaixa({
  painelId,
  faixa,
  aoFechar,
}: {
  painelId: number;
  faixa: Faixa;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [salvando, iniciar] = useTransition();
  const [form, setForm] = useState({
    titulo: faixa.titulo,
    descricao: faixa.descricao ?? "",
    dica: faixa.dica ?? "",
    colunas: faixa.colunas,
    fundo: faixa.fundo,
    recolhivel: faixa.recolhivel,
    visivel: faixa.visivel,
  });

  // Selecionar outra faixa tem que recarregar o formulário. Sem isto, clicar na
  // faixa vizinha mostraria os valores da anterior e salvar sobrescreveria uma
  // com os dados da outra.
  useEffect(() => {
    setForm({
      titulo: faixa.titulo,
      descricao: faixa.descricao ?? "",
      dica: faixa.dica ?? "",
      colunas: faixa.colunas,
      fundo: faixa.fundo,
      recolhivel: faixa.recolhivel,
      visivel: faixa.visivel,
    });
  }, [faixa]);

  function salvar() {
    iniciar(async () => {
      const r = await salvarFaixa(painelId, form, faixa.id);
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      aviso.sucesso("Faixa salva.");
      router.refresh();
    });
  }

  async function excluir() {
    const quantos = faixa.cards.length;
    const ok = await pedir({
      titulo: `Apagar a faixa "${faixa.titulo}"?`,
      texto:
        quantos > 0
          ? `${quantos} card${quantos > 1 ? "s vão" : " vai"} junto, e não dá para desfazer. Se você só quer tirar da tela, desmarque "Visível" em vez de apagar.`
          : "Não dá para desfazer.",
      confirmar:
        quantos > 0 ? `Apagar faixa e ${quantos} card${quantos > 1 ? "s" : ""}` : "Apagar faixa",
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await excluirFaixa(faixa.id, painelId);
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      aviso.sucesso("Faixa apagada.");
      aoFechar();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {dialogo}
      <div>
        <h2 className="text-grey-600 text-base font-semibold">Faixa</h2>
        <p className="text-grey-400 text-xs">O container que agrupa os cards.</p>
      </div>

      <Campo
        rotulo="Título"
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
      />

      <AreaTexto
        rotulo="Descrição"
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        dica="Linha de contexto abaixo do título."
      />

      <Campo
        rotulo="Dica à direita"
        placeholder="últimos 7 dias"
        value={form.dica}
        onChange={(e) => setForm({ ...form, dica: e.target.value })}
        dica="O texto pequeno alinhado à direita do título."
      />

      <Selecao
        rotulo="Colunas"
        value={String(form.colunas)}
        onChange={(e) => setForm({ ...form, colunas: Number(e.target.value) })}
        dica="Quantos cards cabem lado a lado. No celular vira uma coluna."
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Selecao>

      <Selecao
        rotulo="Fundo"
        value={form.fundo}
        onChange={(e) => setForm({ ...form, fundo: e.target.value as Faixa["fundo"] })}
      >
        <option value="transparente">Transparente</option>
        <option value="superficie">Superfície</option>
        <option value="acento">Acento suave</option>
      </Selecao>

      <label className="text-grey-500 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.visivel}
          onChange={(e) => setForm({ ...form, visivel: e.target.checked })}
          className="accent-primary size-4"
        />
        Visível no painel público
      </label>
      <p className="text-grey-400 -mt-2 text-xs">
        Desmarcar esconde sem apagar. Apagar leva os cards junto, e quem só queria tirar da tela por
        uma semana perderia o trabalho.
      </p>

      <div className="flex gap-2">
        <Botao onClick={salvar} disabled={salvando} className="flex-1">
          {salvando ? "Salvando..." : "Salvar faixa"}
        </Botao>
        <Botao tom="contorno" onClick={excluir} disabled={salvando} aria-label="Apagar faixa">
          <IconTrash size={16} />
        </Botao>
      </div>
    </div>
  );
}
