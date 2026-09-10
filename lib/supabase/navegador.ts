"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador. Usa a chave anon, que é pública por natureza: ela vai
 *  no bundle e qualquer pessoa consegue lê-la. Quem protege o dado é a RLS, não
 *  o segredo da chave. A `service_role` NUNCA entra aqui, nem no servidor deste
 *  projeto: ela ignora RLS por completo e a aplicação não precisa dela. */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
