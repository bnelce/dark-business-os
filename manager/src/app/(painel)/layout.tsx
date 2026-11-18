import Link from "next/link";
import { redirect } from "next/navigation";
import { listarProjetos } from "@/lib/queries";
import { config } from "@/lib/env";
import { sessaoAtual } from "@/lib/auth";
import { sairAcao } from "../acoes";
import { NavProjetos } from "@/components/nav-projetos";

export const dynamic = "force-dynamic";

export default async function LayoutDoPainel({ children }: { children: React.ReactNode }) {
  // Guarda de verdade do painel. O middleware é conveniência de UX e já falhou
  // uma vez: sob basePath, "/publicador" (sem barra) escapava do matcher e o
  // dashboard abria sem sessão. Aqui a checagem roda no servidor, por página,
  // e não depende de regex de rota.
  if (!(await sessaoAtual())) redirect("/login");

  const projetos = await listarProjetos();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Link href="/" className="text-sm font-semibold whitespace-nowrap">Publication Manager</Link>

          <nav className="flex gap-1 text-sm" aria-label="Navegação principal">
            {[
              { href: "/", rotulo: "Painel" },
              { href: "/fila", rotulo: "Fila" },
              { href: "/projetos", rotulo: "Projetos" },
            ].map((item) => (
              <Link
                key={item.href} href={item.href}
                className="rounded-md px-2.5 py-1.5 text-texto-suave transition-colors hover:bg-superficie-2 hover:text-texto"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            {config.dryRun && (
              <span
                className="rounded bg-publicando-bg px-2 py-1 text-xs font-medium text-publicando"
                title="PUBLISHING_DRY_RUN=true — nada é publicado de verdade"
              >
                Dry-run ativo
              </span>
            )}
            <form action={sairAcao}>
              <button className="text-sm text-texto-fraco transition-colors hover:text-texto cursor-pointer">
                Sair
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 pb-2">
          <NavProjetos projetos={projetos.map((p) => ({ slug: p.slug, nome: p.name, total: p._count.publications }))} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
    </div>
  );
}
