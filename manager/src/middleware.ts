import { NextResponse, type NextRequest } from "next/server";
import { lerSessao, NOME_DO_COOKIE } from "./lib/sessao";

/**
 * Fecha o dashboard inteiro. O padrão é exigir sessão: rota nova nasce
 * protegida, e só o que está na lista abaixo fica aberto.
 */
const PUBLICAS = ["/login", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const sessao = await lerSessao(req.cookies.get(NOME_DO_COOKIE)?.value);
  if (sessao) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  // clone() preserva o basePath; new URL("/login", req.url) o perderia e
  // mandaria pra /login em vez de /publicador/login atrás do proxy.
  const destino = req.nextUrl.clone();
  destino.pathname = "/login";
  destino.search = "";
  destino.searchParams.set("de", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  // O primeiro padrão cobre a raiz: sob basePath, "/publicador" (sem barra
  // final) não casa com o segundo, e o painel ficaria aberto. A guarda de
  // verdade está no layout do painel — este matcher é só o atalho de UX.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
