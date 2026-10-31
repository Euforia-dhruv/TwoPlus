// Screenshots the public auth pages at three widths. No login, no writes.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

// A trailing slash would turn "/login" into "//login", which misses every route
// and lands on the catch-all marketing page.
const BASE = (process.argv[2] ?? "http://localhost:4173").replace(/\/+$/, "");
const OUT = process.argv[3] ?? ".taste-skill/auth";
const PAGES = ["/login", "/signup", "/forgot-password"];
const WIDTHS = [1440, 768, 390];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  page.on("pageerror", (e) => errors.push(`${w} ${e.message}`));
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const name = `${w}${path.replace(/\//g, "-")}.png`;
    await page.screenshot({ path: `${OUT}/${name}` });
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    const h1 = await page.locator("h1").count();
    console.log(`${w} ${path} h1=${h1} overflow=${over}`);
  }
  await page.close();
}

console.log(errors.length ? `ERRORS: ${errors.join(" | ")}` : "no page errors");
await browser.close();
