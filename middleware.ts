import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Renova a sessão e barra /gestao para quem não está logado.
 *
 *  O middleware existe por dois motivos, e o segundo é o que costuma ser
 *  esquecido: além de proteger a rota, ele é o único lugar que consegue
 *  ESCREVER o cookie de sessão renovado. Server Component não escreve cookie,
 *  então sem isto a sessão expiraria mesmo com a pessoa usando a tela.
 *
 *  A trava aqui é de conveniência, não de segurança. Quem protege o dado é a
 *  RLS no Supabase: escrita só para autenticado. Se este middleware sumisse, a
 *  tela abriria e nenhuma gravação passaria. */
const PROTEGIDAS = ["/dashboard", "/datasets", "/panels"];

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          for (const { name, value } of lista) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of lista) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  if (!user && PROTEGIDAS.some((r) => caminho === r || caminho.startsWith(`${r}/`))) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("de", caminho);
    return NextResponse.redirect(destino);
  }

  if (user && caminho === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/dashboard";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  // Só as rotas da área da gestora. O cockpit do Jira em / e a API dele ficam
  // de fora de propósito: são públicos e não têm sessão para renovar.
  matcher: ["/dashboard/:path*", "/datasets/:path*", "/panels/:path*", "/login"],
};
