// Renderiza os logos de um negócio a partir de negocios/<slug>/identidade/logo-fonte.html
// PNG com fundo transparente de verdade (omitBackground), cores exatas do design-guide.
// Cada elemento com data-arquivo no HTML vira um PNG; sem nenhum, usa as 3 peças padrão.
// Uso: node scripts/gerar-logos.js <slug>
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/gerar-logos.js <slug>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const identidade = join(__dirname, "..", "negocios", slug, "identidade");

const PECAS_PADRAO = [
  { seletor: "#perfil", arquivo: "logo-perfil.png" },
  { seletor: "#lockup-claro", arquivo: "logo.png" },
  { seletor: "#lockup-escuro", arquivo: "logo-branco.png" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
await page.goto(`file://${join(identidade, "logo-fonte.html")}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const declaradas = await page.$$eval("[data-arquivo]", (els) =>
  els.map((el) => ({ seletor: `#${el.id}`, arquivo: el.dataset.arquivo }))
);
const PECAS = declaradas.length ? declaradas : PECAS_PADRAO;

for (const { seletor, arquivo } of PECAS) {
  const el = await page.$(seletor);
  await el.screenshot({ path: join(identidade, arquivo), omitBackground: true });
  const box = await el.boundingBox();
  console.log(`${arquivo}  ${box.width}x${box.height}`);
}

await browser.close();
