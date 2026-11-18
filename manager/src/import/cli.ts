import { PrismaClient } from "@prisma/client";
import { MinioStorageProvider } from "../storage/minio";
import { varrerConteudo } from "./scan-conteudo";
import { importar, type RelatorioDeImport } from "./importer";
import { config, opcional } from "../lib/env";

/**
 * Import do sistema antigo.
 *
 *   npm run import                          → dry-run: só relata
 *   npm run import -- --commit              → grava de verdade
 *   npm run import -- --projeto=outro-slug  → outro projeto de destino
 */
async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const slug = args.find((a) => a.startsWith("--projeto="))?.split("=")[1] ?? "revisao-rapida";
  const raiz = args.find((a) => a.startsWith("--raiz="))?.split("=")[1] ?? config.legacyContentRoot;

  const prisma = new PrismaClient();
  const storage = new MinioStorageProvider();

  try {
    const projeto = await prisma.project.findUnique({ where: { slug } });
    if (!projeto) throw new Error(`Projeto "${slug}" não existe. Rode "npm run db:seed" antes.`);

    if (commit) await storage.garantirBucket();

    console.log(`\nLendo ${raiz} …`);
    const achados = await varrerConteudo(raiz);
    console.log(`${achados.length} pasta(s) com mídia encontrada(s).\n`);

    const relatorio = await importar(prisma, storage, projeto.id, achados, { dryRun: !commit });
    imprimir(relatorio, projeto.name, opcional("MINIO_BUCKET", "publication-media")!);
  } finally {
    await prisma.$disconnect();
  }
}

function imprimir(r: RelatorioDeImport, projeto: string, bucket: string) {
  const rotulo = r.dryRun ? "DRY-RUN (nada gravado)" : "APLICADO";

  const comAviso = r.itens.filter((i) => i.avisos.length > 0);
  if (comAviso.length > 0) {
    console.log("Avisos:");
    for (const item of comAviso) {
      console.log(`  ${item.sourcePath}`);
      for (const aviso of item.avisos) console.log(`    ! ${aviso}`);
    }
    console.log();
  }

  const erros = r.itens.filter((i) => i.acao === "erro");
  if (erros.length > 0) {
    console.log("Erros:");
    for (const item of erros) console.log(`  ${item.sourcePath}: ${item.detalhe}`);
    console.log();
  }

  console.log(`── ${rotulo} ─ destino: ${projeto} ─ bucket: ${bucket}`);
  console.log(`   ${r.criadas} a criar/criadas · ${r.puladas} já existentes · ${r.erros} com erro`);
  for (const [status, n] of Object.entries(r.porStatus).sort()) {
    console.log(`   ${status.padEnd(10)} ${n}`);
  }
  if (r.dryRun && r.criadas > 0) {
    console.log(`\n   Para aplicar: npm run import -- --commit\n`);
  } else {
    console.log();
  }
}

main().catch((erro) => {
  console.error(`\n✗ ${erro instanceof Error ? erro.message : erro}`);
  process.exit(1);
});
