"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Gaveta } from "@/componentes/ui/gaveta";
import { Selecao } from "@/componentes/ui/selecao";
import { criarPainel } from "@/lib/painel/acoes";
import type { PresetPeriodo } from "@/lib/painel/tipos";
import { MODELOS } from "@/lib/painel/modelos";

const PERIODOS: { valor: PresetPeriodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "estaSemana", rotulo: "Esta semana" },
  { valor: "semanaPassada", rotulo: "Semana passada" },
  { valor: "esteMes", rotulo: "Este mês" },
];

function aoSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Props = { tom?: "primario" | "contorno"; rotulo?: string };

export function NovoPainel({ tom = "primario", rotulo = "Novo painel" }: Props) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [periodo, setPeriodo] = useState<PresetPeriodo>("30d");
  const [publicado, setPublicado] = useState(false);
  const [modelo, setModelo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  // O endereço acompanha o nome até a pessoa mexer nele. Depois disso ela
  // manda: reescrever por baixo o que alguém digitou é o jeito rápido de
  // publicar num link diferente do que a pessoa achava que tinha escolhido.
  const slugFinal = slugTocado ? aoSlug(slug) : aoSlug(nome);

  function limpar() {
    setNome("");
    setDescricao("");
    setSlug("");
    setSlugTocado(false);
    setPeriodo("30d");
    setPublicado(false);
    setModelo("");
    setErro(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciar(async () => {
      const r = await criarPainel({
        nome,
        descricao,
        slug: slugFinal,
        periodoPadrao: periodo,
        publicado,
        modelo: modelo || undefined,
      });

      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      aviso.sucesso("Painel criado.");
      setAberta(false);
      limpar();
      router.push(`/panels/${r.dado.id}`);
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
        titulo="Novo painel"
        descricao="Um painel é uma tela pública, montada por faixas e cards."
        rodape={
          <div className="flex justify-end gap-2">
            <Botao type="button" tom="contorno" onClick={() => setAberta(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-novo-painel" disabled={salvando}>
              {salvando ? "Criando..." : "Criar painel"}
            </Botao>
          </div>
        }
      >
        <form id="form-novo-painel" onSubmit={enviar} className="flex flex-col gap-5">
          <Campo
            rotulo="Nome"
            placeholder="Cockpit da semana"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
          />

          <div className="flex flex-col gap-2">
            <Selecao rotulo="Começar de" value={modelo} onChange={(e) => setModelo(e.target.value)}>
              <option value="">Em branco</option>
              {MODELOS.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {m.nome}
                </option>
              ))}
            </Selecao>
            <p className="text-grey-400 text-xs">
              {modelo
                ? MODELOS.find((m) => m.chave === modelo)?.descricao
                : "Painel sem faixa nenhuma. Você monta do zero."}
            </p>
            {modelo && (
              <p className="border-grey-300/60 text-grey-400 rounded-lg border border-dashed px-3 py-2 text-xs">
                O modelo copia a estrutura e as cores do painel que está no ar, e cria o conjunto de
                dados com as colunas certas. Depois é tudo seu: cor, faixa, card e texto continuam
                editáveis em Personalizar.
              </p>
            )}
          </div>

          <AreaTexto
            rotulo="Descrição"
            placeholder="O que este painel responde, em uma frase."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            dica="Aparece abaixo do título no painel público. Opcional, mas painel sem contexto vira números soltos."
          />

          <Campo
            rotulo="Endereço público"
            value={slugTocado ? slug : slugFinal}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value);
            }}
            dica={slugFinal ? `Vai ficar em /p/${slugFinal}` : "Preencha o nome para gerar."}
          />

          <Selecao
            rotulo="Período padrão"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PresetPeriodo)}
            dica="A barra no topo do painel já abre nesse recorte. Quem visita pode trocar."
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>

          <label className="border-grey-300/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="accent-primary mt-0.5 size-4"
            />
            <span>
              <span className="text-grey-600 block text-sm font-medium">Publicar agora</span>
              <span className="text-grey-400 block text-xs">
                Publicado, o painel abre para qualquer pessoa com o link, sem login. Dá para deixar
                como rascunho e publicar depois de montar.
              </span>
            </span>
          </label>

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
