import Link from "next/link";
import { listarFila, listarProjetos, type FiltrosDaFila } from "@/lib/queries";
import { Cartao, Selo, Vazio } from "@/components/ui/primitivos";
import { Miniatura } from "@/components/preview";
import { Filtros } from "@/components/filtros";
import { dataHora, relativo, TIPO } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Fila({ searchParams }: { searchParams: Promise<FiltrosDaFila> }) {
  const filtros = await searchParams;
  const [linhas, projetos] = await Promise.all([listarFila(filtros), listarProjetos()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Fila</h1>
        <p className="text-sm text-texto-fraco tabular">{linhas.length} publicação(ões)</p>
      </div>

      <Filtros projetos={projetos.map((p) => ({ slug: p.slug, nome: p.name }))} />

      <Cartao className="overflow-hidden">
        {linhas.length === 0 ? (
          <Vazio titulo="Nenhuma publicação com esses filtros"
            descricao="Ajuste os filtros acima ou importe conteúdo com npm run import." />
        ) : (
          // A tabela é densa de propósito; rolagem horizontal fica contida aqui,
          // sem empurrar a página inteira.
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-borda bg-superficie-2 text-left text-xs uppercase tracking-wide text-texto-fraco">
                  <th scope="col" className="w-16 px-3 py-2 font-medium">Preview</th>
                  <th scope="col" className="px-3 py-2 font-medium">Título</th>
                  <th scope="col" className="px-3 py-2 font-medium">Projeto</th>
                  <th scope="col" className="px-3 py-2 font-medium">Tipo</th>
                  <th scope="col" className="px-3 py-2 font-medium">Canal</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Quando</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Tent.</th>
                  <th scope="col" className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {linhas.map((p) => {
                  const quando = p.publishedAt ?? p.scheduledAt ?? p.nextAttemptAt;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-superficie-2">
                      <td className="px-3 py-2">
                        <Miniatura midia={p.media[0]} total={p._count.media} alt={`Capa de ${p.title}`} />
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/publicacoes/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                        {p.lastError && (
                          <p className="mt-0.5 line-clamp-1 font-mono text-xs text-falhou" title={p.lastError}>
                            {p.lastError}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-texto-suave">{p.project.name}</td>
                      <td className="px-3 py-2 text-texto-suave">{TIPO[p.type]}</td>
                      <td className="px-3 py-2 text-texto-suave">{p.channel[0] + p.channel.slice(1).toLowerCase()}</td>
                      <td className="px-3 py-2"><Selo status={p.status} /></td>
                      <td className="px-3 py-2 whitespace-nowrap tabular text-texto-suave">
                        {dataHora(quando)}
                        {quando && <span className="ms-2 text-xs text-texto-fraco">{relativo(quando)}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular text-texto-suave">
                        {p.attempts > 0 ? `${p.attempts}/${p.maxAttempts}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Link href={`/publicacoes/${p.id}`} className="text-marca hover:underline">detalhe</Link>
                          {p.externalUrl && (
                            <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="text-texto-fraco hover:underline">
                              post ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
