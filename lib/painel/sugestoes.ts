import { aoSlug } from "./slug";
import type { ColunaDefinicao, ConfigCard, Grao, TipoCard } from "./tipos";

export type Sugestao = {
  chave: string;
  tipo: TipoCard;
  titulo: string;
  definicao: string;
  config: Omit<ConfigCard, "conjuntoId">;
  largura: number;
  recomendado: boolean;
};

const OPCOES_EM_CARD = 3;
const NUMEROS_RECOMENDADOS = 4;

/** Cards que fazem sentido para o conjunto, decididos pelo GRÃO e pelo papel
 *  das colunas.
 *
 *  Roda na prévia e no servidor com a mesma entrada, e o servidor só aceita a
 *  lista de chaves escolhidas, nunca a configuração pronta vinda do navegador.
 *
 *  A versão anterior somava toda coluna numérica, qualquer que fosse o
 *  conjunto. Para itens isso não faz sentido: ninguém quer a soma dos status,
 *  quer quantos estão em cada um. */
export function sugerirCards(grao: Grao, colunas: ColunaDefinicao[], nome: string): Sugestao[] {
  const nomeadas = colunas.filter((c) => c.nome.trim());
  const chave = (c: ColunaDefinicao) => aoSlug(c.nome);
  const assunto = nome.trim() || "itens";

  const titulo = nomeadas.find((c) => c.papel === "titulo");
  const status = nomeadas.find((c) => c.papel === "status");
  const evento = nomeadas.find((c) => c.papel === "data_evento");
  const conclusao = nomeadas.find((c) => c.papel === "data_conclusao");
  const periodo = nomeadas.find((c) => c.papel === "periodo");
  const numeros = nomeadas.filter((c) => c.tipo === "numero");

  const tabela: Sugestao = {
    chave: "tabela",
    tipo: "tabela",
    titulo: `${assunto}, linhas`,
    definicao: `As linhas digitadas em ${assunto}, com todas as colunas.`,
    config: { colunas: nomeadas.map(chave) },
    largura: 6,
    recomendado: false,
  };

  if (grao === "medicao") {
    const cards: Sugestao[] = numeros.map((n, i) => ({
      chave: `ultimo-${chave(n)}`,
      tipo: "numero",
      titulo: n.nome,
      definicao: `Último valor de ${n.nome} digitado dentro do período, comparado com o último do período anterior.`,
      config: {
        metrica: "ultimo",
        campoValor: chave(n),
        campoData: periodo ? chave(periodo) : undefined,
        comparar: !!periodo,
      },
      largura: 1,
      recomendado: i < NUMEROS_RECOMENDADOS,
    }));

    if (numeros[0] && periodo) {
      cards.push({
        chave: `evolucao-${chave(numeros[0])}`,
        tipo: "linha",
        titulo: `Evolução de ${numeros[0].nome}`,
        definicao: `${numeros[0].nome} de cada medição ao longo do período.`,
        config: { metrica: "soma", campoValor: chave(numeros[0]), campoData: chave(periodo) },
        largura: 2,
        recomendado: true,
      });
    }

    return [...cards, tabela];
  }

  const cards: Sugestao[] = [
    {
      chave: "total",
      tipo: "numero",
      titulo: `Total de ${assunto}`,
      definicao: `Quantos itens existem em ${assunto}, cada linha contada uma vez.`,
      config: { metrica: "contagem", destaque: true },
      largura: 1,
      recomendado: true,
    },
  ];

  if (status) {
    status.opcoes
      .filter((o) => o.trim())
      .slice(0, OPCOES_EM_CARD)
      .forEach((opcao, i) =>
        cards.push({
          chave: `status-${aoSlug(opcao)}`,
          tipo: "numero",
          titulo: `Em ${opcao}`,
          definicao: `Itens com ${status.nome} igual a ${opcao} agora. É o estado de hoje, não o movimento do período.`,
          config: {
            metrica: "contagem",
            filtros: [{ campo: chave(status), operador: "igual", valor: opcao }],
          },
          largura: 1,
          recomendado: i < 2,
        }),
      );

    cards.push({
      chave: "por-status",
      tipo: "barra",
      titulo: `${assunto} por ${status.nome.toLowerCase()}`,
      definicao: `Quantos itens em cada ${status.nome.toLowerCase()}. Item sem ${status.nome.toLowerCase()} aparece como "sem valor", para o total fechar.`,
      config: { metrica: "contagem", campoCategoria: chave(status) },
      largura: 2,
      recomendado: true,
    });
  }

  if (evento) {
    cards.push({
      chave: "novos",
      tipo: "numero",
      titulo: "Novos no período",
      definicao: `Itens com ${evento.nome} dentro do período do painel, comparado com o período anterior de mesmo tamanho.`,
      config: { metrica: "contagem", campoData: chave(evento), comparar: true },
      largura: 1,
      recomendado: true,
    });
  }

  if (conclusao) {
    cards.push({
      chave: "concluidos",
      tipo: "numero",
      titulo: "Concluídos no período",
      definicao: `Itens com ${conclusao.nome} dentro do período do painel, comparado com o período anterior de mesmo tamanho.`,
      config: { metrica: "contagem", campoData: chave(conclusao), comparar: true },
      largura: 1,
      recomendado: true,
    });
  }

  if (titulo) {
    cards.push({
      chave: "lista",
      tipo: "lista",
      titulo: `Lista de ${assunto}`,
      definicao: `Cada item pelo ${titulo.nome.toLowerCase()}${status ? `, com o ${status.nome.toLowerCase()} ao lado` : ""}.`,
      config: { campoTitulo: chave(titulo), campoStatus: status ? chave(status) : undefined },
      largura: 2,
      recomendado: !!status,
    });
  }

  return [...cards, tabela];
}
