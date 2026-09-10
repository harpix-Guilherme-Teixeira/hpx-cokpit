import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
import { Sair } from "@/features/auth/components/sair";

export const metadata: Metadata = {
  title: "Gestão · harpix",
};

export const dynamic = "force-dynamic";

export default async function PaginaGestao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar?de=/gestao");

  const supabase = await clienteServidor();

  // Dois contadores, lidos direto do banco. Se a leitura falhar, o número não
  // vira zero: fica nulo e a tela diz que não conseguiu ler. Zero silencioso
  // em painel foi o defeito que já custou caro aqui.
  const [paineis, conjuntos] = await Promise.all([
    supabase.from("pnl_painel").select("id, slug, nome, publicado").order("ordem"),
    supabase.from("dad_conjunto").select("id, chave, nome").order("nome"),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-grey-600 text-2xl font-bold">
            Gestão do <span className="text-primary">cockpit</span>
          </h1>
          <p className="text-grey-400 mt-1 text-sm">{usuario.email}</p>
        </div>
        <Sair />
      </header>

      <section className="mb-10">
        <h2 className="text-grey-400 mb-3 text-xs font-bold tracking-widest uppercase">Painéis</h2>
        {paineis.error ? (
          <Aviso texto={`Não consegui ler os painéis: ${paineis.error.message}`} />
        ) : paineis.data.length === 0 ? (
          <Vazio texto="Nenhum painel ainda. O construtor entra no próximo passo." />
        ) : (
          <ul className="divide-grey-300/50 divide-y rounded-xl border border-grey-300/60 bg-white shadow-sm">
            {paineis.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-grey-600 font-medium">{p.nome}</p>
                  <p className="text-grey-400 text-xs">/p/{p.slug}</p>
                </div>
                <span
                  className={
                    p.publicado
                      ? "bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium"
                      : "bg-grey-200 text-grey-400 rounded-full px-2.5 py-1 text-xs font-medium"
                  }
                >
                  {p.publicado ? "publicado" : "rascunho"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-grey-400 mb-3 text-xs font-bold tracking-widest uppercase">
          Conjuntos de dados
        </h2>
        {conjuntos.error ? (
          <Aviso texto={`Não consegui ler os conjuntos: ${conjuntos.error.message}`} />
        ) : conjuntos.data.length === 0 ? (
          <Vazio texto="Nenhum conjunto ainda. A grade de digitação entra no próximo passo." />
        ) : (
          <ul className="divide-grey-300/50 divide-y rounded-xl border border-grey-300/60 bg-white shadow-sm">
            {conjuntos.data.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <p className="text-grey-600 font-medium">{c.nome}</p>
                <p className="text-grey-400 text-xs">{c.chave}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border-grey-300/60 text-grey-400 rounded-xl border border-dashed px-5 py-8 text-center text-sm">
      {texto}
    </p>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="border-error/40 bg-error/5 text-error rounded-xl border px-5 py-4 text-sm">
      {texto}
    </p>
  );
}
