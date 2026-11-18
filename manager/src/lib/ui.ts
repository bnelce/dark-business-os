import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { config } from "./env";

export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

export const STATUS = {
  DRAFT:      { rotulo: "Rascunho",   cor: "text-rascunho bg-rascunho-bg" },
  APPROVED:   { rotulo: "Aprovado",   cor: "text-aprovado bg-aprovado-bg" },
  SCHEDULED:  { rotulo: "Agendado",   cor: "text-agendado bg-agendado-bg" },
  PUBLISHING: { rotulo: "Publicando", cor: "text-publicando bg-publicando-bg" },
  PUBLISHED:  { rotulo: "Publicado",  cor: "text-publicado bg-publicado-bg" },
  FAILED:     { rotulo: "Falhou",     cor: "text-falhou bg-falhou-bg" },
  RETRYING:   { rotulo: "Retentando", cor: "text-retentando bg-retentando-bg" },
  CANCELLED:  { rotulo: "Cancelado",  cor: "text-cancelado bg-cancelado-bg" },
} as const;

export const TIPO = {
  IMAGE: "Imagem", CAROUSEL: "Carrossel", REEL: "Reel", STORY: "Story", VIDEO: "Vídeo",
} as const;

const FUSO = config.timezone;

export function dataHora(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: FUSO,
  }).format(d);
}

export function soData(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: FUSO }).format(d);
}

export function soHora(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(d);
}

/** "em 3h", "há 12 min" — sempre com o absoluto por perto na interface. */
export function relativo(d: Date | null | undefined, agora = new Date()): string {
  if (!d) return "—";
  const diff = d.getTime() - agora.getTime();
  const fmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const min = Math.round(diff / 60_000);
  if (Math.abs(min) < 60) return fmt.format(min, "minute");
  const horas = Math.round(diff / 3_600_000);
  if (Math.abs(horas) < 48) return fmt.format(horas, "hour");
  return fmt.format(Math.round(diff / 86_400_000), "day");
}

/** Valor para <input type="datetime-local">, no fuso de exibição. */
export function paraInputLocal(d: Date | null | undefined): string {
  const data = d ?? new Date();
  const partes = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: FUSO, hour12: false,
  }).formatToParts(data);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
