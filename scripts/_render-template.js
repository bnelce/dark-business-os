import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(`file://${join(__dirname, "carrossel.html")}`);
await page.waitForTimeout(300);

const slides = await page.$$(".slide");
for (let i = 0; i < slides.length; i++) {
  const numero = String(i + 1).padStart(2, "0");
  await slides[i].screenshot({ path: join(__dirname, "instagram", `slide-${numero}.png`) });
  console.log(`slide-${numero}.png`);
}

await browser.close();
