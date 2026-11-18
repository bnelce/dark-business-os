"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Botao, Cartao, TituloDeSecao } from "@/components/ui/primitivos";
import { criarProjetoAcao, salvarCanalAcao, alternarCanalAcao, type Resposta } from "@/app/acoes";

const CANAIS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK", "LINKEDIN"] as const;
const IMPLEMENTADOS = new Set(["INSTAGRAM"]);

const entrada = "mt-1 h-9 w-full rounded-md border border-borda-forte bg-superficie px-2 text-sm";

function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const rodar = (fn: () => Promise<Resposta>, aoOk?: () => void) => {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) { aoOk?.(); router.refresh(); } else setErro(r.erro);
    });
  };
  return { rodar, pendente, erro };
}

export function NovoProjeto() {
  const { rodar, pendente, erro } = useAcao();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");

  // Sugere o slug enquanto o nome é digitado, sem impedir edição manual.
  function mudarNome(v: string) {
    const sugestao = v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (slug === "" || slug === sugerido(nome)) setSlug(sugestao);
    setNome(v);
  }
  const sugerido = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <Cartao>
      <TituloDeSecao>Novo projeto</TituloDeSecao>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="np-nome" className="text-xs font-medium text-texto-fraco">Nome</label>
          <input id="np-nome" value={nome} onChange={(e) => mudarNome(e.target.value)}
            placeholder="Minha Marca" className={entrada} />
        </div>
        <div>
          <label htmlFor="np-slug" className="text-xs font-medium text-texto-fraco">Slug</label>
          <input id="np-slug" value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="minha-marca" className={`${entrada} font-mono`} />
        </div>
        <div>
          <label htmlFor="np-desc" className="text-xs font-medium text-texto-fraco">Descrição (opcional)</label>
          <input id="np-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} className={entrada} />
        </div>
        <div className="sm:col-span-3">
          <Botao variante="primario" disabled={pendente || !nome || !slug}
            onClick={() => rodar(() => criarProjetoAcao({ nome, slug, descricao }),
              () => { setNome(""); setSlug(""); setDescricao(""); })}>
            Criar projeto
          </Botao>
          {erro && <p role="alert" className="mt-2 rounded bg-falhou-bg px-3 py-2 text-sm text-falhou">{erro}</p>}
        </div>
      </div>
    </Cartao>
  );
}

export function ConfigurarCanal({ projectId }: { projectId: string }) {
  const { rodar, pendente, erro } = useAcao();
  const [aberto, setAberto] = useState(false);
  const [canal, setCanal] = useState<(typeof CANAIS)[number]>("INSTAGRAM");
  const [handle, setHandle] = useState("");
  const [accessToken, setToken] = useState("");
  const [accountId, setConta] = useState("");

  if (!aberto) {
    return (
      <Botao onClick={() => setAberto(true)} className="h-8 text-xs">Configurar canal</Botao>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-borda bg-superficie-2 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`c-canal-${projectId}`} className="text-xs font-medium text-texto-fraco">Canal</label>
          <select id={`c-canal-${projectId}`} value={canal} onChange={(e) => setCanal(e.target.value as typeof canal)}
            className={`${entrada} cursor-pointer`}>
            {CANAIS.map((c) => (
              <option key={c} value={c} disabled={!IMPLEMENTADOS.has(c)}>
                {c[0] + c.slice(1).toLowerCase()}{IMPLEMENTADOS.has(c) ? "" : " (publisher não implementado)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`c-handle-${projectId}`} className="text-xs font-medium text-texto-fraco">Handle (opcional)</label>
          <input id={`c-handle-${projectId}`} value={handle} onChange={(e) => setHandle(e.target.value)}
            placeholder="@minhamarca" className={entrada} />
        </div>
        <div>
          <label htmlFor={`c-conta-${projectId}`} className="text-xs font-medium text-texto-fraco">ID da conta</label>
          <input id={`c-conta-${projectId}`} value={accountId} onChange={(e) => setConta(e.target.value)}
            className={`${entrada} font-mono`} />
        </div>
        <div>
          <label htmlFor={`c-token-${projectId}`} className="text-xs font-medium text-texto-fraco">Access token</label>
          <input id={`c-token-${projectId}`} type="password" value={accessToken} onChange={(e) => setToken(e.target.value)}
            autoComplete="off" className={`${entrada} font-mono`} />
        </div>
      </div>

      <p className="text-xs text-texto-fraco">
        Guardado cifrado no banco e nunca exibido de volta. Trocar significa digitar de novo.
      </p>

      <div className="flex gap-2">
        <Botao variante="primario" disabled={pendente || !accessToken || !accountId}
          onClick={() => rodar(() => salvarCanalAcao({ projectId, canal, handle, accessToken, accountId }),
            () => { setAberto(false); setToken(""); setConta(""); setHandle(""); })}>
          Salvar canal
        </Botao>
        <Botao onClick={() => setAberto(false)} disabled={pendente}>Cancelar</Botao>
      </div>

      {erro && <p role="alert" className="rounded bg-falhou-bg px-3 py-2 text-sm text-falhou">{erro}</p>}
    </div>
  );
}

export function AlternarCanal({ id, ativo }: { id: string; ativo: boolean }) {
  const { rodar, pendente } = useAcao();
  return (
    <button
      onClick={() => rodar(() => alternarCanalAcao(id, !ativo))}
      disabled={pendente}
      className="cursor-pointer text-xs text-texto-fraco underline-offset-2 hover:text-texto hover:underline disabled:opacity-50"
    >
      {ativo ? "desativar" : "ativar"}
    </button>
  );
}
