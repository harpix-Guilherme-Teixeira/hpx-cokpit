"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Gaveta } from "@/componentes/ui/gaveta";
import { Selecao } from "@/componentes/ui/selecao";
import { criarConjunto, type ColunaNova } from "@/lib/painel/acoes";
import type { TipoCampo } from "@/lib/painel/tipos";

const TIPOS: { valor: TipoCampo; rotulo: string; explica: string }[] = [
  { valor: "texto", rotulo: "Texto", explica: "Nome, título, observação" },
  { valor: "numero", rotulo: "Número", explica: "Soma, média, mínimo e máximo" },
  { valor: "data", rotulo: "Data", explica: "Liga o card ao período do painel" },
  { valor: "opcao", rotulo: "Opção", explica: "Lista fechada, como status" },
  { valor: "booleano", rotulo: "Sim ou não", explica: "Verdadeiro ou falso" },
];

type Props = {
  tom?: "primario" | "contorno";
  rotulo?: string;
  /** Painéis onde este conjunto pode aparecer. Vem do servidor porque o menu
   *  precisa existir antes do primeiro clique. */
  paineis: { id: number; nome: string }[];
};

export function NovoConjunto({ tom = "primario", rotulo = "Novo conjunto", paineis }: Props) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [colunas, setColunas] = useState<ColunaNova[]>([{ nome: "", tipo: "texto" }]);
  const [painelId, setPainelId] = useState<string>(paineis[0] ? String(paineis[0].id) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function mudarColuna(i: number, mudanca: Partial<ColunaNova>) {
    setColunas((atual) => atual.map((c, k) => (k === i ? { ...c, ...mudanca } : c)));
  }

  function limpar() {
    setNome("");
    setDescricao("");
    setColunas([{ nome: "", tipo: "texto" }]);
    setPainelId(paineis[0] ? String(paineis[0].id) : "");
    setErro(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciar(async () => {
      const r = await criarConjunto({
        nome,
        descricao,
        colunas,
        painelId: painelId ? Number(painelId) : undefined,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aviso.sucesso("Conjunto criado.");
      setAberta(false);
      limpar();
      router.push(`/datasets/${r.dado.id}`);
    });
  }

  return (
    <>
      <Botao tom={tom} onClick={() => setAberta(true)}>
        {tom === "primario" && <IconPlus size={16} />}
        {rotulo}
      </Botao>

      <Gaveta
        aberta={aberta}
        fechar={() => setAberta(false)}
        titulo="Novo conjunto de dados"
        descricao="Uma tabela que você nomeia. É dela que os cards puxam número."
        rodape={
          <div className="flex justify-end gap-2">
            <Botao type="button" tom="contorno" onClick={() => setAberta(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-novo-conjunto" disabled={salvando}>
              {salvando ? "Criando..." : "Criar conjunto"}
            </Botao>
          </div>
        }
      >
        <form id="form-novo-conjunto" onSubmit={enviar} className="flex flex-col gap-5">
          <Campo
            rotulo="Nome"
            placeholder="Documentações de API"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
          />

          <AreaTexto
            rotulo="Descrição"
            placeholder="O que cada linha representa."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            dica="Escreva o que é UMA linha. Conjunto sem isso vira discussão sobre o que o número está contando."
          />

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-grey-600 text-sm font-medium">Colunas</p>
              <p className="text-grey-400 text-xs">
                O tipo decide o que o construtor vai oferecer depois: soma só existe em número,
                período só recorta por data. Escolher errado aqui some com a opção lá na frente.
              </p>
            </div>

            {colunas.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <Campo
                    rotulo=""
                    aria-label={`Nome da coluna ${i + 1}`}
                    placeholder="Nome da coluna"
                    value={c.nome}
                    onChange={(e) => mudarColuna(i, { nome: e.target.value })}
                  />
                </div>
                <div className="w-40">
                  <Selecao
                    aria-label={`Tipo da coluna ${i + 1}`}
                    value={c.tipo}
                    onChange={(e) => mudarColuna(i, { tipo: e.target.value as TipoCampo })}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </Selecao>
                </div>
                <button
                  type="button"
                  onClick={() => setColunas((a) => a.filter((_, k) => k !== i))}
                  disabled={colunas.length === 1}
                  aria-label={`Remover coluna ${i + 1}`}
                  className="text-grey-400 hover:bg-grey-200 hover:text-error mt-1 rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}

            {colunas.some((c) => c.tipo === "opcao") && (
              <p className="text-grey-400 border-grey-300/60 rounded-lg border border-dashed px-3 py-2 text-xs">
                As opções de cada coluna do tipo Opção são definidas na tela do conjunto, depois de
                criar.
              </p>
            )}

            <Botao
              type="button"
              tom="fantasma"
              tamanho="p"
              onClick={() => setColunas((a) => [...a, { nome: "", tipo: "texto" }])}
              className="self-start"
            >
              <IconPlus size={14} />
              Adicionar coluna
            </Botao>
          </div>

          <Selecao
            rotulo="Aparece no painel"
            value={painelId}
            onChange={(e) => setPainelId(e.target.value)}
            dica={
              painelId
                ? "Ao criar, já monto uma faixa nesse painel com um card por coluna numérica e uma tabela com tudo. Dado que nasce invisível é dado que ninguém confere."
                : "Sem painel, o conjunto fica só na área de Dados e não aparece em lugar nenhum."
            }
          >
            <option value="">Nenhum, só guardar os dados</option>
            {paineis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Selecao>

          {erro && (
            <p className="border-error/40 bg-error/5 text-error rounded-lg border px-3 py-2 text-sm">
              {erro}
            </p>
          )}
        </form>
      </Gaveta>
    </>
  );
}
