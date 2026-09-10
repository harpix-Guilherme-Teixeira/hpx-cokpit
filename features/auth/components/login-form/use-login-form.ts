"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { esquemaLogin, type EsquemaLogin } from "./login-schema";

/** Trava depois de 5 tentativas erradas, igual aos outros sistemas da harpix.
 *
 *  Ela mora no navegador, então NÃO é defesa contra ataque: quem quer forçar
 *  senha bate direto na API do Supabase e nem vê esta tela. Serve para o caso
 *  real de todo dia, que é a pessoa insistindo na senha errada e queimando o
 *  limite da conta sem entender por quê. O limite de verdade é o do Supabase. */
const TENTATIVAS_ATE_TRAVAR = 5;
const SEGUNDOS_DE_TRAVA = 30;

export function useLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [enviando, setEnviando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [restante, setRestante] = useState(0);

  const travado = restante > 0;

  useEffect(() => {
    if (restante <= 0) return;
    const id = setInterval(() => setRestante((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [restante]);

  const form = useForm<EsquemaLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", senha: "" },
    mode: "onSubmit",
  });

  async function aoEnviar({ email, senha }: EsquemaLogin) {
    if (travado) return;
    setEnviando(true);

    try {
      const supabase = clienteNavegador();
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

      if (error) {
        const proxima = tentativas + 1;
        setTentativas(proxima);
        if (proxima >= TENTATIVAS_ATE_TRAVAR) {
          setRestante(SEGUNDOS_DE_TRAVA);
          setTentativas(0);
        }
        // A mensagem é a mesma para e-mail que não existe e senha errada, de
        // propósito: dizer qual dos dois falhou entrega quem tem conta aqui.
        toast.error("E-mail ou senha incorretos.");
        return;
      }

      setTentativas(0);
      // `refresh` antes de navegar para o middleware enxergar o cookie novo.
      router.refresh();
      router.replace(params.get("de") ?? "/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return { form, aoEnviar, enviando, travado, restante };
}
