import { createClient } from "@supabase/supabase-js";

/** Cliente com a `service_role`, que IGNORA a RLS por completo.
 *
 *  Existe por um motivo só: a tabela `int_jira` guarda o token do Jira de cada
 *  pessoa e não tem policy nenhuma, de propósito, para o token nunca chegar ao
 *  navegador. Tudo que a sessão da pessoa alcança, o navegador dela também
 *  alcança, então o servidor precisa de uma chave própria para ler ali.
 *
 *  REGRA: este cliente é só do módulo de integração. Qualquer outra leitura ou
 *  escrita do sistema usa `clienteServidor`, que respeita a RLS. Espalhar esta
 *  chave pelo código transformaria cada bug de rota num vazamento de banco
 *  inteiro. */
export function clienteServico() {
  if (typeof window !== "undefined") {
    throw new Error("clienteServico é do servidor. No navegador ele vazaria a chave.");
  }

  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. A integração com o Jira não funciona sem ela.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
