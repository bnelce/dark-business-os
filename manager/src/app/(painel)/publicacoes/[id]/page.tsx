import Link from "next/link";
import { notFound } from "next/navigation";
import { publicacaoCompleta } from "@/lib/queries";
import { Cartao, Campo, Selo, TituloDeSecao, Rotulo } from "@/components/ui/primitivos";
import { Preview } from "@/components/preview";
import { AcoesDaPublicacao } from "@/components/acoes-publicacao";
import { dataHora, relativo, TIPO } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Detalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await publicacaoCompleta(id);
  if (!p) notFound();

  const foiEnsaio = p.externalId?.startsWith("dryrun-") ?? false;
  const publicadoSemLink = p.status === "PUBLISHED" && !p.externalUrl && !foiEnsaio;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/fila" className="text-sm text-marca hover:underline">← Fila</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{p.title}</h1>
          <Selo status={p.status} />
        </div>
        <p className="mt-1 text-sm text-texto-fraco">
          {p.project.name} · {TIPO[p.type]} · {p.channel[0] + p.channel.slice(1).toLowerCase()}
          {p.channelConfig?.handle && ` · ${p.channelConfig.handle}`}
        </p>
      </div>

      {foiEnsaio && (
        <p className="rounded-lg border border-agendado/40 bg-agendado-bg px-4 py-2.5 text-sm text-agendado">
          Publicação de ensaio: rodou com <code className="font-mono">PUBLISHING_DRY_RUN=true</code>, então
          o pipeline inteiro foi validado mas nada foi enviado ao Instagram. Não existe post correspondente.
        </p>
      )}

      {publicadoSemLink && (
        <p className="rounded-lg border border-publicando/40 bg-publicando-bg px-4 py-2.5 text-sm text-publicando">
          Publicada, mas sem permalink: a busca do link falhou depois que o post já estava no ar.
          Isso não é falha de publicação e não gera nova tentativa. Use “Sincronizar metadados” pra completar.
        </p>
      )}

      {p.lastError && p.status !== "PUBLISHED" && (
        <div className="rounded-lg border border-falhou/40 bg-falhou-bg px-4 py-3">
          <Rotulo>Último erro ({p.lastErrorKind === "PERMANENT" ? "permanente" : "transitório"})</Rotulo>
          <p className="mt-1 font-mono text-sm text-falhou break-words">{p.lastError}</p>
          {p.lastErrorKind === "PERMANENT" && (
            <p className="mt-2 text-sm text-falhou">
              Erro permanente não é retentado sozinho — corrija a causa antes de reagendar.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4">
          <Preview midias={p.media} tipo={p.type} />
          <Cartao>
            <TituloDeSecao>Legenda</TituloDeSecao>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 font-sans text-sm text-texto-suave">
              {p.caption || "(vazia)"}
            </pre>
          </Cartao>
        </div>

        <div className="space-y-4">
          <Cartao>
            <TituloDeSecao>Ações</TituloDeSecao>
            <div className="p-4">
              <AcoesDaPublicacao
                id={p.id} status={p.status} temExternalId={Boolean(p.externalId)}
                scheduledAt={p.scheduledAt ? p.scheduledAt.toISOString() : null}
              />
            </div>
          </Cartao>

          <Cartao>
            <TituloDeSecao>Dados</TituloDeSecao>
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Campo rotulo="Criada em" valor={dataHora(p.createdAt)} />
              <Campo rotulo="Agendada para" valor={
                p.scheduledAt ? <>{dataHora(p.scheduledAt)} <span className="text-texto-fraco">({relativo(p.scheduledAt)})</span></> : "—"
              } />
              <Campo rotulo="Publicada em" valor={dataHora(p.publishedAt)} />
              <Campo rotulo="Tentativas" valor={`${p.attempts} de ${p.maxAttempts}`} />
              <Campo rotulo="Próxima tentativa" valor={dataHora(p.nextAttemptAt)} />
              <Campo rotulo="Mídias" valor={String(p.media.length)} />
              <Campo rotulo="External ID" valor={p.externalId ?? "—"} mono />
              <Campo rotulo="External URL" valor={
                p.externalUrl
                  ? <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="text-marca hover:underline break-all">{p.externalUrl}</a>
                  : "—"
              } />
              <Campo rotulo="Origem" valor={p.sourcePath ?? "criada aqui"} mono />
            </dl>
          </Cartao>

          <Cartao>
            <TituloDeSecao acao={<span className="text-xs text-texto-fraco tabular">{p.events.length} evento(s)</span>}>
              Timeline
            </TituloDeSecao>
            <ol className="divide-y divide-borda">
              {p.events.map((e) => (
                <li key={e.id} className="flex gap-3 px-4 py-2.5">
                  <time className="w-32 shrink-0 tabular text-xs text-texto-fraco" dateTime={e.createdAt.toISOString()}>
                    {dataHora(e.createdAt)}
                  </time>
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-medium text-texto">{e.type}</span>
                    {e.message && <p className="mt-0.5 text-sm text-texto-suave break-words">{e.message}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
