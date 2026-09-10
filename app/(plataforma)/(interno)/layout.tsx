import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Shell } from "@/componentes/layout/shell";
import { clienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function LayoutInterno({ children }: { children: ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  // O nome legível vem da lista de autorizados. Se a pessoa entrou mas não está
  // na lista, ela vê a tela e não consegue gravar nada, porque a RLS barra. Em
  // vez de deixar isso virar um erro confuso na primeira gravação, o shell já
  // mostra o e-mail cru e a tela de painéis avisa.
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("seg_autorizado")
    .select("nome")
    .eq("email", usuario.email ?? "")
    .maybeSingle();

  return (
    <Shell nome={data?.nome ?? usuario.email ?? "sem nome"} email={usuario.email ?? ""}>
      {children}
    </Shell>
  );
}
