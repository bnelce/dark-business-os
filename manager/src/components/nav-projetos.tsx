"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/ui";

/**
 * Alternador de projeto. Vive na querystring pra que qualquer visão fique
 * compartilhável por link e o botão voltar do navegador funcione.
 */
export function NavProjetos({ projetos }: { projetos: Array<{ slug: string; nome: string; total: number }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const atual = params.get("projeto") ?? "";

  function trocar(slug: string) {
    const novos = new URLSearchParams(params);
    if (slug) novos.set("projeto", slug); else novos.delete("projeto");
    router.push(`${pathname}?${novos}`);
  }

  const opcoes = [
    { slug: "", nome: "Todos", total: projetos.reduce((s, p) => s + p.total, 0) },
    ...projetos,
  ];

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por projeto">
      {opcoes.map((p) => {
        const ativo = atual === p.slug;
        return (
          <button
            key={p.slug || "todos"}
            onClick={() => trocar(p.slug)}
            aria-pressed={ativo}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors duration-150",
              ativo
                ? "bg-marca text-white font-medium"
                : "text-texto-suave hover:bg-superficie-2 hover:text-texto",
            )}
          >
            {p.nome}
            <span className={cn("ms-1.5 tabular text-xs", ativo ? "text-white/70" : "text-texto-fraco")}>
              {p.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
