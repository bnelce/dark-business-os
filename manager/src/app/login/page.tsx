"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrarAcao } from "../acoes";
import { Botao } from "@/components/ui/primitivos";

function Formulario() {
  const [estado, acao, enviando] = useActionState(entrarAcao, {});
  const de = useSearchParams().get("de") ?? "/";

  return (
    <form action={acao} className="w-full max-w-sm rounded-lg border border-borda bg-superficie p-6">
        <h1 className="text-lg font-semibold">Publication Manager</h1>
        <p className="mt-1 text-sm text-texto-fraco">Acesso restrito ao operador.</p>

        <input type="hidden" name="de" value={de} />

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="usuario" className="block text-sm font-medium">Usuário</label>
            <input
              id="usuario" name="usuario" autoComplete="username" required autoFocus
              className="mt-1 h-11 w-full rounded-md border border-borda-forte bg-superficie px-3 text-base"
            />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-medium">Senha</label>
            <input
              id="senha" name="senha" type="password" autoComplete="current-password" required
              className="mt-1 h-11 w-full rounded-md border border-borda-forte bg-superficie px-3 text-base"
            />
          </div>
        </div>

        {estado?.erro && (
          <p role="alert" className="mt-4 rounded-md bg-falhou-bg px-3 py-2 text-sm text-falhou">
            {estado.erro}
          </p>
        )}

        <Botao type="submit" variante="primario" disabled={enviando} className="mt-6 w-full">
          {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}

export default function Login() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      {/* useSearchParams precisa de fronteira de suspense pra página não virar
          totalmente dinâmica no build. */}
      <Suspense fallback={<div className="text-sm text-texto-fraco">Carregando…</div>}>
        <Formulario />
      </Suspense>
    </main>
  );
}
