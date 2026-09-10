"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { aviso } from "@/componentes/ui/toast";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { useConfirmacao } from "@/componentes/ui/confirmar";
import { excluirCard, salvarCard } from "@/lib/painel/acoes-construtor";
import { ROTULO_FORMATO, type Formato } from "@/lib/painel/formato";
import {
  EXPLICA_TIPO_CARD,
  METRICAS_POR_TIPO,
  OPERADORES_POR_TIPO,
  ROTULO_METRICA,
  ROTULO_OPERADOR,
  ROTULO_TIPO_CARD,
  metricaPrecisaDeCampo,
  type Card,
  type ConfigCard,
  type Filtro,
  type Metrica,
  type TipoCard,
} from "@/lib/painel/tipos";
import type { Fonte } from "./editor";

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-grey-300/60 border-b py-4 first:pt-0 last:border-b-0">
      <h3 className="text-grey-400 mb-2 text-xs font-bold tracking-widest uppercase">{titulo}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

const TIPOS = Object.keys(ROTULO_TIPO_CARD) as TipoCard[];

export function AjustesCard({
  painelId,
  card,
  faixas,
  fontes,
  aoFechar,
}: {
  painelId: number;
  card: Card;
  faixas: { id: number; titulo: string; colunas: number }[];
  fontes: Fonte[];
  aoFechar: () => void;
}) {
  const router = useRouter();
  const { pedir, dialogo } = useConfirmacao();
  const [salvando, iniciar] = useTransition();

  const [tipo, setTipo] = useState<TipoCard>(card.tipo);
  const [titulo, setTitulo] = useState(card.titulo);
  const [definicao, setDefinicao] = useState(card.definicao ?? "");
  const [faixaId, setFaixaId] = useState(card.faixa_id);
  const [largura, setLargura] = useState(card.largura);
  const [config, setConfig] = useState<ConfigCard>(card.config ?? {});

  // Trocar de card recarrega o formulário, senão salvar gravaria os valores do
  // card anterior por cima deste.
  useEffect(() => {
    setTipo(card.tipo);
    setTitulo(card.titulo);
    setDefinicao(card.definicao ?? "");
    setFaixaId(card.faixa_id);
    setLargura(card.largura);
    setConfig(card.config ?? {});
  }, [card]);

  const fonte = fontes.find((f) => f.id === config.conjuntoId);
  const campos = fonte?.campos ?? [];
  const camposData = campos.filter((c) => c.tipo === "data");

  const campoDaMetrica = campos.find((c) => c.chave === config.campoValor);

  /** Métricas que o tipo do campo escolhido suporta. Sem campo, só as que
   *  contam linha. É essa lista que impede soma de texto de existir no menu. */
  const metricas: Metrica[] = useMemo(() => {
    if (!campoDaMetrica) return ["contagem"];
    return METRICAS_POR_TIPO[campoDaMetrica.tipo];
  }, [campoDaMetrica]);

  const colunasDaFaixa = faixas.find((f) => f.id === faixaId)?.colunas ?? 4;

  function mudarConfig(m: Partial<ConfigCard>) {
    setConfig((c) => ({ ...c, ...m }));
  }

  function mudarFiltro(i: number, m: Partial<Filtro>) {
    setConfig((c) => ({
      ...c,
      filtros: (c.filtros ?? []).map((f, k) => (k === i ? { ...f, ...m } : f)),
    }));
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarCard(
        painelId,
        { faixaId, tipo, titulo, definicao, config, largura },
        card.id,
      );
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      aviso.sucesso("Card salvo.");
      router.refresh();
    });
  }

  async function excluir() {
    const ok = await pedir({
      titulo: `Apagar o card "${card.titulo}"?`,
      texto: "Não dá para desfazer. O conjunto de dados que ele usa continua intacto.",
      confirmar: "Apagar card",
      perigo: true,
    });
    if (!ok) return;

    iniciar(async () => {
      const r = await excluirCard(card.id, painelId);
      if (!r.ok) {
        aviso.erro(r.erro);
        return;
      }
      aviso.sucesso("Card apagado.");
      aoFechar();
      router.refresh();
    });
  }

  const precisaFonte = tipo !== "texto";

  return (
    <div className="flex flex-col">
      {dialogo}
      <div className="mb-2">
        <h2 className="text-grey-600 text-base font-semibold">Card</h2>
        <p className="text-grey-400 text-xs">{EXPLICA_TIPO_CARD[tipo]}</p>
      </div>

      <Grupo titulo="O que ele é">
        <Selecao rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCard)}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_CARD[t]}
            </option>
          ))}
        </Selecao>

        <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />

        <AreaTexto
          rotulo="Definição"
          value={definicao}
          onChange={(e) => setDefinicao(e.target.value)}
          dica="Obrigatória. É a frase embaixo do número, e é ela que impede o card de virar um número que ninguém sabe reproduzir."
        />
      </Grupo>

      <Grupo titulo="Onde ele mora">
        <Selecao
          rotulo="Faixa"
          value={String(faixaId)}
          onChange={(e) => setFaixaId(Number(e.target.value))}
        >
          {faixas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titulo}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Largura"
          value={String(largura)}
          onChange={(e) => setLargura(Number(e.target.value))}
          dica={`Em colunas. Esta faixa tem ${colunasDaFaixa}.`}
        >
          {Array.from({ length: colunasDaFaixa }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} de {colunasDaFaixa}
            </option>
          ))}
        </Selecao>
      </Grupo>

      {tipo === "texto" ? (
        <Grupo titulo="Conteúdo">
          <AreaTexto
            rotulo="Texto"
            value={config.texto ?? ""}
            onChange={(e) => mudarConfig({ texto: e.target.value })}
          />
        </Grupo>
      ) : (
        <>
          <Grupo titulo="De onde vem o número">
            <Selecao
              rotulo="Conjunto de dados"
              value={String(config.conjuntoId ?? "")}
              onChange={(e) =>
                // Trocar de conjunto zera campo, filtros e data: as chaves do
                // conjunto antigo não existem no novo, e deixá-las produziria
                // um card que filtra por coluna inexistente e mostra tudo.
                setConfig({
                  ...config,
                  conjuntoId: Number(e.target.value) || undefined,
                  campoValor: undefined,
                  campoCategoria: undefined,
                  campoData: undefined,
                  campoTitulo: undefined,
                  campoStatus: undefined,
                  colunas: undefined,
                  filtros: [],
                })
              }
            >
              <option value="">Escolha</option>
              {fontes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Selecao>

            {precisaFonte && !fonte && (
              <p className="text-grey-400 text-xs">Escolha o conjunto para os campos aparecerem.</p>
            )}

            {fonte && (
              <>
                {(tipo === "barra" || tipo === "pizza") && (
                  <Selecao
                    rotulo="Categoria"
                    value={config.campoCategoria ?? ""}
                    onChange={(e) => mudarConfig({ campoCategoria: e.target.value || undefined })}
                  >
                    <option value="">Escolha</option>
                    {campos.map((c) => (
                      <option key={c.chave} value={c.chave}>
                        {c.nome}
                      </option>
                    ))}
                  </Selecao>
                )}

                {tipo === "lista" && (
                  <>
                    <Selecao
                      rotulo="Campo do título"
                      value={config.campoTitulo ?? ""}
                      onChange={(e) => mudarConfig({ campoTitulo: e.target.value || undefined })}
                    >
                      <option value="">Escolha</option>
                      {campos.map((c) => (
                        <option key={c.chave} value={c.chave}>
                          {c.nome}
                        </option>
                      ))}
                    </Selecao>
                    <Selecao
                      rotulo="Campo do status"
                      value={config.campoStatus ?? ""}
                      onChange={(e) => mudarConfig({ campoStatus: e.target.value || undefined })}
                    >
                      <option value="">Nenhum</option>
                      {campos.map((c) => (
                        <option key={c.chave} value={c.chave}>
                          {c.nome}
                        </option>
                      ))}
                    </Selecao>
                  </>
                )}

                {tipo === "tabela" ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-grey-600 text-sm font-medium">Colunas visíveis</span>
                    {campos.map((c) => (
                      <label
                        key={c.chave}
                        className="text-grey-500 flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(config.colunas ?? []).includes(c.chave)}
                          onChange={(e) =>
                            mudarConfig({
                              colunas: e.target.checked
                                ? [...(config.colunas ?? []), c.chave]
                                : (config.colunas ?? []).filter((x) => x !== c.chave),
                            })
                          }
                          className="accent-primary size-4"
                        />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <Selecao
                      rotulo="Campo do valor"
                      value={config.campoValor ?? ""}
                      onChange={(e) => {
                        const chave = e.target.value || undefined;
                        const campo = campos.find((c) => c.chave === chave);
                        const permitidas = campo ? METRICAS_POR_TIPO[campo.tipo] : ["contagem"];
                        // Se a métrica atual não vale para o campo novo, cai
                        // para a primeira permitida em vez de ficar inválida.
                        mudarConfig({
                          campoValor: chave,
                          metrica: permitidas.includes(config.metrica ?? "contagem")
                            ? config.metrica
                            : (permitidas[0] as Metrica),
                        });
                      }}
                    >
                      <option value="">Nenhum, contar linhas</option>
                      {campos.map((c) => (
                        <option key={c.chave} value={c.chave}>
                          {c.nome}
                        </option>
                      ))}
                    </Selecao>

                    <Selecao
                      rotulo="Métrica"
                      value={config.metrica ?? "contagem"}
                      onChange={(e) => mudarConfig({ metrica: e.target.value as Metrica })}
                      dica={
                        metricaPrecisaDeCampo(config.metrica ?? "contagem")
                          ? undefined
                          : "Contagem conta linhas, não precisa de campo."
                      }
                    >
                      {metricas.map((m) => (
                        <option key={m} value={m}>
                          {ROTULO_METRICA[m]}
                        </option>
                      ))}
                    </Selecao>
                  </>
                )}

                {tipo === "progresso" && (
                  <Selecao
                    rotulo="Campo da meta"
                    value={config.campoMeta ?? ""}
                    onChange={(e) => mudarConfig({ campoMeta: e.target.value || undefined })}
                  >
                    <option value="">Escolha</option>
                    {campos
                      .filter((c) => c.tipo === "numero")
                      .map((c) => (
                        <option key={c.chave} value={c.chave}>
                          {c.nome}
                        </option>
                      ))}
                  </Selecao>
                )}
              </>
            )}
          </Grupo>

          {fonte && (
            <Grupo titulo="Período e comparação">
              <Selecao
                rotulo="Campo de data"
                value={config.campoData ?? ""}
                onChange={(e) =>
                  mudarConfig({
                    campoData: e.target.value || undefined,
                    // Sem data não existe janela anterior, então comparar cai
                    // junto em vez de ficar ligado sem efeito.
                    comparar: e.target.value ? config.comparar : false,
                  })
                }
                dica={
                  camposData.length === 0
                    ? "Este conjunto não tem coluna de data. O card vai ignorar o período, e a tela avisa isso."
                    : "É a data que o período do painel recorta."
                }
              >
                <option value="">Nenhum, ignora o período</option>
                {camposData.map((c) => (
                  <option key={c.chave} value={c.chave}>
                    {c.nome}
                  </option>
                ))}
              </Selecao>

              <label className="text-grey-500 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!config.comparar}
                  disabled={!config.campoData}
                  onChange={(e) => mudarConfig({ comparar: e.target.checked })}
                  className="accent-primary size-4 disabled:opacity-40"
                />
                Comparar com o período anterior
              </label>

              {config.comparar && (
                <label className="text-grey-500 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.subirEhBom ?? true}
                    onChange={(e) => mudarConfig({ subirEhBom: e.target.checked })}
                    className="accent-primary size-4"
                  />
                  Subir é bom
                </label>
              )}
              {config.comparar && (
                <p className="text-grey-400 -mt-1 text-xs">
                  Desmarque em bloqueio e retrabalho, senão uma queda de 99% sai em vermelho.
                </p>
              )}
            </Grupo>
          )}

          {fonte && (
            <Grupo titulo="Filtros">
              {(config.filtros ?? []).map((f, i) => {
                const campo = campos.find((c) => c.chave === f.campo);
                const operadores = campo ? OPERADORES_POR_TIPO[campo.tipo] : [];
                return (
                  <div
                    key={i}
                    className="border-grey-300/60 flex flex-col gap-2 rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Selecao
                        aria-label="Campo"
                        value={f.campo}
                        onChange={(e) => mudarFiltro(i, { campo: e.target.value })}
                        className="flex-1"
                      >
                        {campos.map((c) => (
                          <option key={c.chave} value={c.chave}>
                            {c.nome}
                          </option>
                        ))}
                      </Selecao>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            filtros: (config.filtros ?? []).filter((_, k) => k !== i),
                          })
                        }
                        aria-label="Remover filtro"
                        className="text-grey-400 hover:text-error rounded-md p-2"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>

                    <Selecao
                      aria-label="Operador"
                      value={f.operador}
                      onChange={(e) =>
                        mudarFiltro(i, { operador: e.target.value as Filtro["operador"] })
                      }
                    >
                      {operadores.map((o) => (
                        <option key={o} value={o}>
                          {ROTULO_OPERADOR[o]}
                        </option>
                      ))}
                    </Selecao>

                    {f.operador !== "vazio" && f.operador !== "naoVazio" && (
                      <Campo
                        aria-label="Valor"
                        placeholder="Valor"
                        value={String(f.valor ?? "")}
                        onChange={(e) => mudarFiltro(i, { valor: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}

              <Botao
                tom="fantasma"
                tamanho="p"
                className="self-start"
                onClick={() =>
                  setConfig({
                    ...config,
                    filtros: [
                      ...(config.filtros ?? []),
                      { campo: campos[0]?.chave ?? "", operador: "igual", valor: "" },
                    ],
                  })
                }
                disabled={campos.length === 0}
              >
                <IconPlus size={14} />
                Adicionar filtro
              </Botao>
            </Grupo>
          )}

          <Grupo titulo="Como o número se lê">
            <Selecao
              rotulo="Formato"
              value={config.formato ?? campoDaMetrica?.formato ?? "inteiro"}
              onChange={(e) => mudarConfig({ formato: e.target.value as Formato })}
              dica={
                campoDaMetrica
                  ? `Em branco, herda o formato da coluna "${campoDaMetrica.nome}".`
                  : "Porcentagem espera o valor já em 0 a 100."
              }
            >
              {(Object.keys(ROTULO_FORMATO) as Formato[]).map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FORMATO[f]}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Casas decimais"
              value={String(config.casas ?? 0)}
              onChange={(e) => mudarConfig({ casas: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Selecao>

            <div className="flex gap-2">
              <Campo
                rotulo="Prefixo"
                value={config.prefixo ?? ""}
                onChange={(e) => mudarConfig({ prefixo: e.target.value || undefined })}
              />
              <Campo
                rotulo="Sufixo"
                value={config.unidade ?? ""}
                onChange={(e) => mudarConfig({ unidade: e.target.value || undefined })}
              />
            </div>
          </Grupo>
        </>
      )}

      <Grupo titulo="Aparência">
        <label className="text-grey-500 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!config.destaque}
            onChange={(e) => mudarConfig({ destaque: e.target.checked })}
            className="accent-primary size-4"
          />
          Card de destaque
        </label>
        <p className="text-grey-400 -mt-2 text-xs">
          Fundo e número no acento. Um por faixa, no máximo dois: destaque em tudo é destaque em
          nada.
        </p>
      </Grupo>

      <div className="mt-4 flex gap-2">
        <Botao onClick={salvar} disabled={salvando} className="flex-1">
          {salvando ? "Salvando..." : "Salvar card"}
        </Botao>
        <Botao tom="contorno" onClick={excluir} disabled={salvando} aria-label="Apagar card">
          <IconTrash size={16} />
        </Botao>
      </div>
    </div>
  );
}
