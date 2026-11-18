"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/primitivos";
import { paraInputLocal } from "@/lib/ui";
import {
  aprovarAcao, agendarAcao, desagendarAcao, cancelarAcao, reabrirAcao,
  publicarAgoraAcao, retentarAcao, sincronizarMetadadosAcao, type Resposta,
} from "@/app/acoes";

/**
 * Ações disponíveis conforme o estado. A interface não oferece transição
 * inválida — e o servidor recusa de qualquer forma, então o que se ganha aqui
 * é o operador não descobrir o erro depois de clicar.
 */
export function AcoesDaPublicacao({ id, status, scheduledAt, temExternalId }: {
  id: string; status: string; scheduledAt: string | null; temExternalId: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [quando, setQuando] = useState(() => paraInputLocal(scheduledAt ? new Date(scheduledAt) : null));

  function rodar(fn: () => Promise<Resposta>, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) router.refresh(); else setErro(r.erro);
    });
  }

  const podeAgendar = status === "APPROVED" || status === "SCHEDULED" || status === "FAILED";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Botao variante="primario" disabled={pendente} onClick={() => rodar(() => aprovarAcao(id))}>
            Aprovar
          </Botao>
        )}

        {(status === "APPROVED" || status === "SCHEDULED" || status === "FAILED") && (
          <Botao variante="primario" disabled={pendente}
            onClick={() => rodar(() => publicarAgoraAcao(id),
              "Publicar agora coloca esta publicação na fila para execução imediata. Confirma?")}>
            Publicar agora
          </Botao>
        )}

        {status === "FAILED" && (
          <Botao disabled={pendente} onClick={() => rodar(() => retentarAcao(id))}>Tentar de novo</Botao>
        )}

        {status === "SCHEDULED" && (
          <Botao disabled={pendente} onClick={() => rodar(() => desagendarAcao(id))}>Desagendar</Botao>
        )}

        {status === "PUBLISHED" && (
          <Botao disabled={pendente || !temExternalId} onClick={() => rodar(() => sincronizarMetadadosAcao(id))}
            title={temExternalId ? undefined : "Sem external id — nada a sincronizar"}>
            Sincronizar metadados
          </Botao>
        )}

        {status === "CANCELLED" && (
          <Botao disabled={pendente} onClick={() => rodar(() => reabrirAcao(id))}>Reabrir como rascunho</Botao>
        )}

        {["DRAFT", "APPROVED", "SCHEDULED", "FAILED", "RETRYING"].includes(status) && (
          <Botao variante="perigo" disabled={pendente}
            onClick={() => rodar(() => cancelarAcao(id), "Cancelar esta publicação?")}>
            Cancelar
          </Botao>
        )}
      </div>

      {podeAgendar && (
        <div className="flex flex-wrap items-end gap-2 border-t border-borda pt-3">
          <div>
            <label htmlFor="quando" className="block text-xs font-medium text-texto-fraco">
              {status === "SCHEDULED" ? "Reagendar para" : "Agendar para"}
            </label>
            <input
              id="quando" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)}
              className="mt-1 h-9 rounded-md border border-borda-forte bg-superficie px-2 text-sm"
            />
          </div>
          <Botao disabled={pendente || !quando} onClick={() => rodar(() => agendarAcao(id, quando))}>
            {status === "SCHEDULED" ? "Reagendar" : "Agendar"}
          </Botao>
          <p className="w-full text-xs text-texto-fraco">
            Horário no fuso de exibição. Nada é publicado antes dessa hora, e o worker precisa estar no ar.
          </p>
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded bg-falhou-bg px-3 py-2 text-sm text-falhou">{erro}</p>
      )}
    </div>
  );
}
