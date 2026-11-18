import { listarProjetos } from "@/lib/queries";
import { Cartao, TituloDeSecao, Campo } from "@/components/ui/primitivos";
import { NovoProjeto, ConfigurarCanal, AlternarCanal } from "@/components/gestao-projetos";

export const dynamic = "force-dynamic";

export default async function Projetos() {
  const projetos = await listarProjetos();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Projetos</h1>
        <p className="mt-1 text-sm text-texto-fraco">
          Cada projeto é uma marca ou operação sua. Publicações pertencem a exatamente um projeto,
          e cada projeto pode ter conta própria em cada canal.
        </p>
      </div>

      <NovoProjeto />

      <div className="grid gap-4 md:grid-cols-2">
        {projetos.map((p) => (
          <Cartao key={p.id}>
            <TituloDeSecao acao={<span className="text-xs text-texto-fraco tabular">{p._count.publications} publicação(ões)</span>}>
              {p.name}
            </TituloDeSecao>
            <div className="space-y-4 p-4">
              {p.description && <p className="text-sm text-texto-suave">{p.description}</p>}
              <Campo rotulo="Slug" valor={p.slug} mono />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-texto-fraco">Canais</div>
                {p.channelConfigs.length === 0 ? (
                  <p className="mt-1 text-sm text-texto-fraco">
                    Nenhum canal configurado — publicações deste projeto falham com erro permanente até haver credencial.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {p.channelConfigs.map((c) => (
                      <li key={c.channel} className="flex items-center gap-2 text-sm">
                        <span aria-hidden className={`h-2 w-2 rounded-full ${c.isActive ? "bg-publicado" : "bg-cancelado"}`} />
                        {c.channel[0] + c.channel.slice(1).toLowerCase()}
                        {c.handle && <span className="text-texto-fraco">{c.handle}</span>}
                        {!c.isActive && <span className="text-texto-fraco">(desativado)</span>}
                        <AlternarCanal id={c.id} ativo={c.isActive} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3"><ConfigurarCanal projectId={p.id} /></div>
              </div>
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
