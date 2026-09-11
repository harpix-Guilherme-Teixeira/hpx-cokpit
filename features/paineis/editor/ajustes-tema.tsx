"use client";

import { Campo } from "@/componentes/ui/campo";
import { Selecao } from "@/componentes/ui/selecao";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { PRESETS, type Tema } from "@/lib/painel/tema";
import type { PresetPeriodo } from "@/lib/painel/tipos";

const PERIODOS: { valor: PresetPeriodo; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "estaSemana", rotulo: "Esta semana" },
  { valor: "semanaPassada", rotulo: "Semana passada" },
  { valor: "esteMes", rotulo: "Este mês" },
];

function Cor({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
}) {
  // O seletor nativo não aceita rgba, e o preset escuro usa rgba no acento
  // suave. Nesse caso o campo de texto continua funcionando e o quadradinho
  // mostra o mais próximo, em vez de a tela quebrar.
  const hex = /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "#000000";

  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-grey-500 text-sm">{rotulo}</span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="border-grey-300 text-grey-500 h-8 w-24 rounded-md border px-2 font-mono text-xs"
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => aoMudar(e.target.value)}
          aria-label={rotulo}
          className="border-grey-300 size-8 cursor-pointer rounded-md border bg-white p-0.5"
        />
      </span>
    </label>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-grey-300/60 border-b py-4 first:pt-0 last:border-b-0">
      <h3 className="text-grey-400 mb-2 text-xs font-bold tracking-widest uppercase">{titulo}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function AjustesTema({
  tema,
  cabecalho,
  periodoPadrao,
  aoMudarTema,
  aoMudarCabecalho,
  aoMudarPeriodo,
}: {
  tema: Tema;
  cabecalho: { titulo: string; subtitulo: string };
  periodoPadrao: PresetPeriodo;
  aoMudarTema: (m: Partial<Tema>) => void;
  aoMudarCabecalho: (m: Partial<{ titulo: string; subtitulo: string }>) => void;
  aoMudarPeriodo: (p: PresetPeriodo) => void;
}) {
  return (
    <div>
      <h2 className="text-grey-600 mb-1 text-base font-semibold">Aparência do painel</h2>
      <p className="text-grey-400 mb-4 text-xs">
        Tudo aqui muda na prévia na hora. Nada vai para o ar até você salvar.
      </p>

      <Grupo titulo="Preset">
        <Selecao
          value={tema.preset}
          onChange={(e) => {
            const p = PRESETS.find((x) => x.chave === e.target.value);
            // Trocar preset substitui o tema inteiro. Mesclar deixaria uma cor
            // do tema claro sobrando no escuro, e ninguém acharia qual.
            if (p) aoMudarTema(p.tema);
          }}
          dica={PRESETS.find((p) => p.chave === tema.preset)?.descricao}
        >
          {PRESETS.map((p) => (
            <option key={p.chave} value={p.chave}>
              {p.nome}
            </option>
          ))}
          <option value="personalizado">personalizado</option>
        </Selecao>
      </Grupo>

      <Grupo titulo="Período">
        <Selecao
          rotulo="Período padrão"
          value={periodoPadrao}
          onChange={(e) => aoMudarPeriodo(e.target.value as PresetPeriodo)}
          dica="O recorte em que o painel abre. Quem visita pode trocar no topo, e essa troca é só dele: não muda o padrão daqui."
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </Selecao>
      </Grupo>

      <Grupo titulo="Cabeçalho">
        <Campo
          rotulo="Título"
          placeholder="Usa o nome do painel se ficar vazio"
          value={cabecalho.titulo}
          onChange={(e) => aoMudarCabecalho({ titulo: e.target.value })}
        />
        <Campo
          rotulo="Subtítulo"
          value={cabecalho.subtitulo}
          onChange={(e) => aoMudarCabecalho({ subtitulo: e.target.value })}
        />
        <Cor
          rotulo="Fundo"
          valor={tema.headerFundo}
          aoMudar={(v) => aoMudarTema({ headerFundo: v })}
        />
        <Cor
          rotulo="Texto"
          valor={tema.headerTexto}
          aoMudar={(v) => aoMudarTema({ headerTexto: v })}
        />

        <label className="text-grey-500 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tema.headerFixo}
            onChange={(e) => aoMudarTema({ headerFixo: e.target.checked })}
            className="accent-primary size-4"
          />
          Fixo ao rolar
        </label>

        <label className="text-grey-500 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tema.mostrarMarca}
            onChange={(e) => aoMudarTema({ mostrarMarca: e.target.checked })}
            className="accent-primary size-4"
          />
          Mostrar marca
        </label>

        {tema.mostrarMarca && (
          <Campo
            rotulo="Texto da marca"
            value={tema.marca}
            onChange={(e) => aoMudarTema({ marca: e.target.value })}
          />
        )}
      </Grupo>

      <Grupo titulo="Cores">
        <Cor rotulo="Acento" valor={tema.acento} aoMudar={(v) => aoMudarTema({ acento: v })} />
        <Cor
          rotulo="Acento suave"
          valor={tema.acentoSuave}
          aoMudar={(v) => aoMudarTema({ acentoSuave: v })}
        />
        <Cor rotulo="Fundo" valor={tema.fundo} aoMudar={(v) => aoMudarTema({ fundo: v })} />
        <Cor
          rotulo="Superfície"
          valor={tema.superficie}
          aoMudar={(v) => aoMudarTema({ superficie: v })}
        />
        <Cor
          rotulo="Superfície alt"
          valor={tema.superficieAlt}
          aoMudar={(v) => aoMudarTema({ superficieAlt: v })}
        />
        <Cor rotulo="Texto" valor={tema.texto} aoMudar={(v) => aoMudarTema({ texto: v })} />
        <Cor
          rotulo="Texto suave"
          valor={tema.textoSuave}
          aoMudar={(v) => aoMudarTema({ textoSuave: v })}
        />
        <Cor
          rotulo="Texto fraco"
          valor={tema.textoFraco}
          aoMudar={(v) => aoMudarTema({ textoFraco: v })}
        />
        <Cor rotulo="Borda" valor={tema.borda} aoMudar={(v) => aoMudarTema({ borda: v })} />
        <Cor
          rotulo="Borda forte"
          valor={tema.bordaForte}
          aoMudar={(v) => aoMudarTema({ bordaForte: v })}
        />
        <Cor
          rotulo="Positivo"
          valor={tema.positivo}
          aoMudar={(v) => aoMudarTema({ positivo: v })}
        />
        <Cor
          rotulo="Negativo"
          valor={tema.negativo}
          aoMudar={(v) => aoMudarTema({ negativo: v })}
        />
        <Cor rotulo="Atenção" valor={tema.atencao} aoMudar={(v) => aoMudarTema({ atencao: v })} />
      </Grupo>

      <Grupo titulo="Forma">
        <label className="text-grey-500 flex items-center justify-between gap-3 text-sm">
          Raio da borda
          <span className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={24}
              value={tema.raio}
              onChange={(e) => aoMudarTema({ raio: Number(e.target.value) })}
              className="accent-primary w-28"
            />
            <span className="text-grey-400 w-8 text-right text-xs">{tema.raio}px</span>
          </span>
        </label>

        <Selecao
          rotulo="Sombra"
          value={tema.sombra}
          onChange={(e) => aoMudarTema({ sombra: e.target.value as Tema["sombra"] })}
        >
          <option value="nenhuma">Nenhuma</option>
          <option value="sutil">Sutil</option>
          <option value="media">Média</option>
        </Selecao>

        <Selecao
          rotulo="Densidade"
          value={tema.densidade}
          onChange={(e) => aoMudarTema({ densidade: e.target.value as Tema["densidade"] })}
          dica="Compacta aperta o espaçamento dos cards. Boa para painel com muita informação."
        >
          <option value="confortavel">Confortável</option>
          <option value="compacta">Compacta</option>
        </Selecao>
      </Grupo>

      <Grupo titulo="Tipografia">
        <Selecao
          rotulo="Fonte dos títulos"
          value={tema.fonteTitulo}
          onChange={(e) => aoMudarTema({ fonteTitulo: e.target.value })}
          dica="Baloo 2 e Geist já carregam no documento. Outra fonte só apareceria se estivesse instalada na máquina de quem abre."
        >
          <option value="Baloo 2">Baloo 2</option>
          <option value="Geist">Geist</option>
        </Selecao>
        <Selecao
          rotulo="Fonte do corpo"
          value={tema.fonteCorpo}
          onChange={(e) => aoMudarTema({ fonteCorpo: e.target.value })}
        >
          <option value="Geist">Geist</option>
          <option value="Baloo 2">Baloo 2</option>
        </Selecao>
      </Grupo>

      <Grupo titulo="Rodapé">
        <AreaTexto
          rotulo="Texto de como ler"
          value={tema.rodape}
          onChange={(e) => aoMudarTema({ rodape: e.target.value })}
          dica="A frase que explica de onde vêm os números. Vazio, o rodapé some."
        />
      </Grupo>
    </div>
  );
}
