import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/componentes/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Entrar · harpix",
};

export default function PaginaLogin() {
  return (
    <AuthLayout titulo="Cockpit" subtitulo="Entre para editar os painéis">
      {/* O formulário lê `?de=` para voltar à página que pediu login, e
          `useSearchParams` exige Suspense no App Router. */}
      <Suspense fallback={<div className="h-56" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
