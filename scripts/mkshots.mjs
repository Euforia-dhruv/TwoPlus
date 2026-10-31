// Captures the public marketing page at the three gate widths.
// No login: this is the signed-out front door. Overrides nothing.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = process.argv[3] ?? ".taste-skill/mk";
const PAGES = [
  { path: "/", name: "home" },
];
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`${vp.name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`${vp.name} console: ${m.text().slice(0, 160)}`);
  });

  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 30000 });
    // Let the reveal observers and the image plates settle.
    await page.waitForTimeout(900);
    // Scroll the whole page once so lazy images and reveals have fired, then
    // come back to the top for a clean full-page capture.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    });
    await page.waitForTimeout(400);

    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      height: document.body.scrollHeight,
      h1: document.querySelectorAll("h1").length,
      h2: document.querySelectorAll("h2").length,
      sections: document.querySelectorAll("section").length,
      images: document.querySelectorAll("img").length,
    }));

    if (metrics.scrollW > metrics.innerW + 1) {
      problems.push(`${vp.name} ${p.name}: horizontal overflow ${metrics.scrollW} > ${metrics.innerW}`);
    }
    console.log(
      `${vp.name} ${p.name}: h1=${metrics.h1} h2=${metrics.h2} sections=${metrics.sections} images=${metrics.images} height=${metrics.height}`,
    );

    await page.screenshot({ path: `${OUT}/${vp.name}-${p.name}.png`, fullPage: true });
  }
  await context.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n${problems.join("\n")}` : "\nno page errors, no overflow");
