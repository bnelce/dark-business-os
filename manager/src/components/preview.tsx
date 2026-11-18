"use client";

import { useState } from "react";
import { cn } from "@/lib/ui";

export type MidiaPreview = { id: string; objectKey: string; mimeType: string; position: number };

// basePath só é aplicado automaticamente por next/link e next/image. Em <img src>
// e <video src> o prefixo é manual, senão o preview quebra quando o app é servido
// sob subcaminho (ex.: dominio.com/publicador).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const url = (chave: string) =>
  `${BASE}/api/media/${chave.split("/").map(encodeURIComponent).join("/")}`;

/** Miniatura da fila: primeiro slide, com a contagem quando é carrossel. */
export function Miniatura({ midia, total, alt }: { midia?: MidiaPreview; total: number; alt: string }) {
  if (!midia) {
    return (
      <div className="flex h-16 w-[51px] shrink-0 items-center justify-center rounded border border-borda bg-superficie-2 text-[10px] text-texto-fraco">
        sem mídia
      </div>
    );
  }
  const vertical = midia.mimeType.startsWith("video/");
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded border border-borda bg-superficie-2", vertical ? "h-16 w-9" : "h-16 w-[51px]")}>
      {vertical ? (
        <video src={url(midia.objectKey)} className="h-full w-full object-cover" muted playsInline preload="metadata" aria-label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url(midia.objectKey)} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      )}
      {total > 1 && (
        <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[10px] font-medium text-white tabular">
          {total}
        </span>
      )}
    </div>
  );
}

/**
 * Visualizador do conteúdo. Carrossel 4:5 com navegação slide a slide,
 * reel 9:16 com player. As proporções são as reais do Instagram — preview
 * que mente sobre o enquadramento não serve pra conferir nada.
 */
export function Preview({ midias, tipo }: { midias: MidiaPreview[]; tipo: string }) {
  const [indice, setIndice] = useState(0);

  if (midias.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-borda-forte text-sm text-texto-fraco">
        Sem mídia associada
      </div>
    );
  }

  const atual = midias[Math.min(indice, midias.length - 1)];
  const ehVideo = atual.mimeType.startsWith("video/");
  const proporcao = ehVideo || tipo === "REEL" || tipo === "STORY" ? "aspect-[9/16]" : "aspect-[4/5]";

  return (
    <div>
      <div className={cn("overflow-hidden rounded-lg border border-borda bg-black", proporcao)}>
        {ehVideo ? (
          <video src={url(atual.objectKey)} controls playsInline className="h-full w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url(atual.objectKey)}
            alt={`Slide ${atual.position} de ${midias.length}`}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      {midias.length > 1 && (
        <>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => setIndice((i) => Math.max(0, i - 1))}
              disabled={indice === 0}
              className="h-9 cursor-pointer rounded-md border border-borda-forte px-3 text-sm transition-colors hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-sm text-texto-suave tabular" aria-live="polite">
              slide {indice + 1} / {midias.length}
            </span>
            <button
              onClick={() => setIndice((i) => Math.min(midias.length - 1, i + 1))}
              disabled={indice === midias.length - 1}
              className="h-9 cursor-pointer rounded-md border border-borda-forte px-3 text-sm transition-colors hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próximo →
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {midias.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setIndice(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === indice}
                className={cn(
                  "h-12 w-[38px] cursor-pointer overflow-hidden rounded border transition-colors",
                  i === indice ? "border-marca ring-2 ring-marca" : "border-borda hover:border-borda-forte",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url(m.objectKey)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
