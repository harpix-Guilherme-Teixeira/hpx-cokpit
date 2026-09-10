import type { Metadata } from "next";

/* O CSS de cada área é importado no layout do grupo dela, não aqui: o do
   cockpit do Jira em (cockpit), o do Tailwind em (plataforma). O raiz cuida só
   do documento e das fontes. */

export const metadata: Metadata = {
  title: "Cockpit Upstream · harpix",
  description:
    "Produção do agente de história e esforço do escopo da sala de guerra, ao vivo do Jira.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;700&family=Geist:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
