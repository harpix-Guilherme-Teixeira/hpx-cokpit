import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente do servidor, com a sessão vindo do cookie. No Next 15 `cookies()` é
 *  assíncrono, por isso esta função é `async`.
 *
 *  O `setAll` é envolvido em try porque Server Component não pode escrever
 *  cookie. Quando a chamada vem de um Server Component o refresh do token é
 *  ignorado aqui e acontece no middleware, que pode escrever. Sem esse try, a
 *  página inteira quebraria só por tentar renovar a sessão. */
export async function clienteServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) {
              jar.set(name, value, options);
            }
          } catch {
            // Server Component. O middleware renova.
          }
        },
      },
    },
  );
}

/** Quem está logado, ou null.
 *
 *  `getClaims()` confere a assinatura do JWT localmente com a chave pública (o
 *  projeto assina em ES256) e só vai à rede para buscar a chave, que fica em
 *  cache. `getUser()` fazia uma ida ao servidor de auth em toda página, uns 450
 *  ms daqui. `getSession()` continua proibido no servidor: lê o cookie sem
 *  conferir assinatura nenhuma. */
export async function usuarioAtual() {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}
