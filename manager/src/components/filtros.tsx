"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS, TIPO } from "@/lib/ui";

const CANAIS = ["INSTAGRAM", "YOUTUBE", "TIKTOK", "FACEBOOK", "LINKEDIN"] as const;

/**
 * Filtros na URL. Serve pra compartilhar link, voltar no navegador e
 * favoritar uma visão — coisas que um estado só em memória não dá.
 */
export function Filtros({ projetos }: { projetos: Array<{ slug: string; nome: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function definir(chave: string, valor: string) {
    const novos = new URLSearchParams(params);
    if (valor) novos.set(chave, valor); else novos.delete(chave);
    router.push(`${pathname}?${novos}`);
  }

  const temFiltro = ["projeto", "status", "tipo", "canal", "de", "ate"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-borda bg-superficie p-3">
      <Seletor rotulo="Projeto" chave="projeto" valor={params.get("projeto") ?? ""} aoMudar={definir}
        opcoes={projetos.map((p) => [p.slug, p.nome])} />
      <Seletor rotulo="Status" chave="status" valor={params.get("status") ?? ""} aoMudar={definir}
        opcoes={Object.entries(STATUS).map(([k, v]) => [k, v.rotulo])} />
      <Seletor rotulo="Tipo" chave="tipo" valor={params.get("tipo") ?? ""} aoMudar={definir}
        opcoes={Object.entries(TIPO)} />
      <Seletor rotulo="Canal" chave="canal" valor={params.get("canal") ?? ""} aoMudar={definir}
        opcoes={CANAIS.map((c) => [c, c[0] + c.slice(1).toLowerCase()])} />

      <Data rotulo="De" chave="de" valor={params.get("de") ?? ""} aoMudar={definir} />
      <Data rotulo="Até" chave="ate" valor={params.get("ate") ?? ""} aoMudar={definir} />

      {temFiltro && (
        <button onClick={() => router.push(pathname)}
          className="h-9 cursor-pointer rounded-md px-2 text-sm text-texto-fraco transition-colors hover:text-texto hover:underline">
          limpar
        </button>
      )}
    </div>
  );
}

function Seletor({ rotulo, chave, valor, opcoes, aoMudar }: {
  rotulo: string; chave: string; valor: string;
  opcoes: Array<[string, string]>; aoMudar: (c: string, v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`f-${chave}`} className="block text-xs font-medium text-texto-fraco">{rotulo}</label>
      <select
        id={`f-${chave}`} value={valor} onChange={(e) => aoMudar(chave, e.target.value)}
        className="mt-1 h-9 cursor-pointer rounded-md border border-borda-forte bg-superficie px-2 text-sm"
      >
        <option value="">Todos</option>
        {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
    </div>
  );
}

function Data({ rotulo, chave, valor, aoMudar }: {
  rotulo: string; chave: string; valor: string; aoMudar: (c: string, v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`f-${chave}`} className="block text-xs font-medium text-texto-fraco">{rotulo}</label>
      <input
        id={`f-${chave}`} type="date" value={valor} onChange={(e) => aoMudar(chave, e.target.value)}
        className="mt-1 h-9 rounded-md border border-borda-forte bg-superficie px-2 text-sm"
      />
    </div>
  );
}
