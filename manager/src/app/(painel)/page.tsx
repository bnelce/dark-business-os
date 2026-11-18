import Link from "next/link";
import { resumoDoPainel, type LinhaDaFila } from "@/lib/queries";
import { Cartao, Metrica, Selo, TituloDeSecao, Vazio } from "@/components/ui/primitivos";
import { Miniatura } from "@/components/preview";
import { dataHora, relativo, TIPO } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Painel({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const { projeto } = await searchParams;
  const r = await resumoDoPainel(projeto);
  const q = projeto ? `?projeto=${projeto}` : "";

  return (
    <div className="space-y-6">
      <SaudeDoWorker worker={r.worker} elegiveis={r.elegiveisAgora} dryRun={r.dryRun} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metrica rotulo="Na fila" valor={r.naFila} detalhe={`${r.elegiveisAgora} pronta(s) agora`}
          href={`/fila${q ? `${q}&` : "?"}status=SCHEDULED`} />
        <Metrica rotulo="Agendadas hoje" valor={r.agendadasHoje} href={`/fila${q}`} />
        <Metrica rotulo="Publicadas hoje" valor={r.publicadasHoje} tom={r.publicadasHoje > 0 ? "bom" : "neutro"}
          href={`/fila${q ? `${q}&` : "?"}status=PUBLISHED`} />
        <Metrica rotulo="Falhas" valor={r.falhas} tom={r.falhas > 0 ? "erro" : "neutro"}
          href={`/fila${q ? `${q}&` : "?"}status=FAILED`} />
        <Metrica rotulo="Aprovadas sem data" valor={r.aprovadasSemData} detalhe="aguardando agendamento"
          href={`/fila${q ? `${q}&` : "?"}status=APPROVED`} />
      </div>

      {r.proxima && (
        <Cartao>
          <TituloDeSecao acao={<span className="text-xs text-texto-fraco">{relativo(r.proxima.scheduledAt)}</span>}>
            Próxima publicação
          </TituloDeSecao>
          <div className="p-4">
            <LinhaCompacta p={r.proxima} mostrarQuando="agendado" />
          </div>
        </Cartao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <TituloDeSecao acao={<Link href={`/fila${q ? `${q}&` : "?"}status=PUBLISHED`} className="text-xs text-marca hover:underline">ver todas</Link>}>
            Últimas publicações
          </TituloDeSecao>
          {r.ultimas.length === 0
            ? <Vazio titulo="Nada publicado ainda" descricao="Publicações concluídas aparecem aqui." />
            : <ul className="divide-y divide-borda">
                {r.ultimas.map((p) => <li key={p.id} className="p-3"><LinhaCompacta p={p} mostrarQuando="publicado" /></li>)}
              </ul>}
        </Cartao>

        <Cartao>
          <TituloDeSecao>Precisam de atenção</TituloDeSecao>
          {r.ultimasFalhas.length === 0
            ? <Vazio titulo="Nenhuma falha" descricao="Publicações que falharam ou estão retentando aparecem aqui." />
            : <ul className="divide-y divide-borda">
                {r.ultimasFalhas.map((p) => (
                  <li key={p.id} className="p-3">
                    <LinhaCompacta p={p} mostrarQuando="agendado" />
                    {p.lastError && (
                      <p className="mt-2 rounded bg-falhou-bg px-2 py-1.5 font-mono text-xs text-falhou break-words">
                        {p.lastError}
                      </p>
                    )}
                  </li>
                ))}
              </ul>}
        </Cartao>
      </div>
    </div>
  );
}

function SaudeDoWorker({ worker, elegiveis, dryRun }: {
  worker: { online: boolean; workerId: string | null; lastHeartbeatAt: Date | null; segundosDesdeUltimo: number | null };
  elegiveis: number; dryRun: boolean;
}) {
  const alerta = !worker.online && elegiveis > 0;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 text-sm ${
      alerta ? "border-falhou/40 bg-falhou-bg" : "border-borda bg-superficie"}`}>
      <span className="flex items-center gap-2 font-medium">
        <span aria-hidden className={`h-2 w-2 rounded-full ${worker.online ? "bg-publicado" : "bg-falhou"}`} />
        Worker {worker.online ? "online" : "offline"}
      </span>
      {worker.lastHeartbeatAt && (
        <span className="text-texto-fraco">último sinal {relativo(worker.lastHeartbeatAt)}</span>
      )}
      {worker.workerId && <span className="font-mono text-xs text-texto-fraco">{worker.workerId}</span>}
      {alerta && (
        <span className="text-falhou">
          {elegiveis} publicação(ões) vencida(s) e ninguém pra executar — suba o worker (<code className="font-mono">npm run worker</code>).
        </span>
      )}
      {dryRun && <span className="ms-auto text-texto-fraco">Dry-run: nada será publicado de verdade.</span>}
    </div>
  );
}

function LinhaCompacta({ p, mostrarQuando }: { p: LinhaDaFila; mostrarQuando: "agendado" | "publicado" }) {
  const quando = mostrarQuando === "publicado" ? p.publishedAt : p.scheduledAt;
  return (
    <div className="flex items-start gap-3">
      <Miniatura midia={p.media[0]} total={p._count.media} alt={`Capa de ${p.title}`} />
      <div className="min-w-0 flex-1">
        <Link href={`/publicacoes/${p.id}`} className="text-sm font-medium hover:underline">{p.title}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-fraco">
          <Selo status={p.status} />
          <span>{p.project.name}</span>
          <span aria-hidden>·</span>
          <span>{TIPO[p.type]}</span>
          <span aria-hidden>·</span>
          <span className="tabular">{dataHora(quando)}</span>
        </div>
      </div>
      {p.externalUrl && (
        <a href={p.externalUrl} target="_blank" rel="noopener noreferrer"
          className="shrink-0 text-xs text-marca hover:underline">abrir ↗</a>
      )}
    </div>
  );
}
