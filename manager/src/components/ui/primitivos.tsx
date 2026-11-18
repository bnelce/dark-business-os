import type { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn, STATUS } from "@/lib/ui";

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-borda bg-superficie", className)}>{children}</div>
  );
}

export function TituloDeSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-borda">
      <h2 className="text-sm font-semibold text-texto">{children}</h2>
      {acao}
    </div>
  );
}

export function Metrica({
  rotulo, valor, detalhe, href, tom = "neutro",
}: {
  rotulo: string; valor: number | string; detalhe?: string; href?: string;
  tom?: "neutro" | "atencao" | "erro" | "bom";
}) {
  const tons = {
    neutro: "text-texto",
    atencao: "text-publicando",
    erro: "text-falhou",
    bom: "text-publicado",
  } as const;

  const conteudo = (
    <>
      <div className="text-xs font-medium text-texto-fraco uppercase tracking-wide">{rotulo}</div>
      <div className={cn("mt-1 text-3xl font-semibold tabular", tons[tom])}>{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-texto-fraco">{detalhe}</div>}
    </>
  );

  const classes = "block rounded-lg border border-borda bg-superficie p-4";
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-borda-forte hover:bg-superficie-2 cursor-pointer")}>
      {conteudo}
    </Link>
  ) : (
    <div className={classes}>{conteudo}</div>
  );
}

export function Selo({ status }: { status: keyof typeof STATUS }) {
  const { rotulo, cor } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", cor)}>
      {rotulo}
    </span>
  );
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "perigo";
};

export function Botao({ variante = "secundario", className, ...props }: BotaoProps) {
  const variantes = {
    primario: "bg-marca text-white hover:opacity-90",
    secundario: "border border-borda-forte bg-superficie text-texto hover:bg-superficie-2",
    // Ação destrutiva fica visualmente separada das demais.
    perigo: "border border-falhou/40 bg-superficie text-falhou hover:bg-falhou-bg",
  } as const;

  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium",
        "transition-colors duration-150 cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantes[variante], className,
      )}
    />
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-texto">{titulo}</p>
      {descricao && <p className="mt-1 text-sm text-texto-fraco">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Rotulo({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-wide text-texto-fraco">{children}</div>;
}

export function Campo({ rotulo, valor, mono }: { rotulo: string; valor: ReactNode; mono?: boolean }) {
  return (
    <div>
      <Rotulo>{rotulo}</Rotulo>
      <div className={cn("mt-0.5 text-sm text-texto break-words", mono && "font-mono text-xs")}>{valor}</div>
    </div>
  );
}
