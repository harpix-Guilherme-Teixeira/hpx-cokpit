import type { Metadata } from "next";
import { Aviso, Pagina, Secao, TituloPagina } from "@/componentes/layout/pagina";
import { CartaoJira } from "@/features/integracoes/cartao-jira";
import { estadoIntegracao } from "@/lib/integracao-jira";

export const metadata: Metadata = { title: "Integrações · harpix" };
export const dynamic = "force-dynamic";

const ERRO: Record<string, string> = {
  recusado: "Você recusou a permissão no Atlassian. Nada foi conectado.",
  estado: "O retorno do Atlassian não bateu com o pedido que saiu daqui. Tente conectar de novo.",
  sessao: "Sua sessão expirou no meio da conexão. Entre de novo e repita.",
  troca: "O Atlassian não aceitou finalizar a conexão. O motivo está no log do servidor.",
};

export default async function PaginaIntegracoes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const estado = await estadoIntegracao();

  // Sem a chave de serviço a gravação da credencial falha lá no retorno do
  // Atlassian, com uma mensagem genérica e longe da causa. Dizer aqui poupa a
  // caçada.
  const faltaChave = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <Pagina>
      <TituloPagina
        titulo="Integrações"
        descricao="Conecte as contas que alimentam os painéis. A credencial é de cada pessoa: ninguém usa a conta da outra, e nada disso fica no código."
      />

      {faltaChave && (
        <Aviso>
          Falta a variável <code>SUPABASE_SERVICE_ROLE_KEY</code> neste ambiente. Conectar vai
          falhar na hora de guardar a credencial.
        </Aviso>
      )}

      {erro && <Aviso>{ERRO[erro] ?? "Não consegui concluir a conexão."}</Aviso>}

      {ok && !erro && (
        <div className="border-success/40 bg-success/5 text-success mb-5 rounded-xl border px-5 py-4 text-sm">
          Conta do Jira conectada.
        </div>
      )}

      <Secao titulo="Disponíveis">
        <CartaoJira
          conectado={estado.conectado}
          conta={estado.conta}
          siteUrl={estado.siteUrl}
        />
      </Secao>
    </Pagina>
  );
}
