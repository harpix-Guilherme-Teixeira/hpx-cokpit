"use client";

import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { useLoginForm } from "./use-login-form";

export function LoginForm() {
  const { form, aoEnviar, enviando, travado, restante } = useLoginForm();
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(aoEnviar)} className="flex w-full flex-col gap-4" noValidate>
      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@harpix.com.br"
        required
        erro={errors.email?.message}
        {...form.register("email")}
      />

      <Campo
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        required
        erro={errors.senha?.message}
        {...form.register("senha")}
      />

      <Botao type="submit" disabled={enviando || travado} className="w-full">
        {enviando ? "Entrando..." : "Entrar"}
      </Botao>

      {travado && (
        <p className="text-error text-center text-sm" role="alert">
          Muitas tentativas. Tente de novo em {restante}s.
        </p>
      )}
    </form>
  );
}
