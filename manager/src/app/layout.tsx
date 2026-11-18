import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Publication Manager",
  description: "Fila e publicação de conteúdo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
