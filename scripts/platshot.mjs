// Signed-in screenshots: saves storage state once, then shoots each path at
// several widths. Read-only, clicks nothing that writes.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:5173";
const OUT = process.argv[3] || ".taste-skill/plat";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
if (!EMAIL || !PASS) throw new Error("Set SHOT_EMAIL and SHOT_PASS");

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL(/\/app/, { timeout: 30_000 });
await page.waitForLoadState("networkidle");

await page.goto(`${BASE}/super-admin`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const url = page.url();
const h1 = await page.locator("h1").first().innerText().catch(() => "(none)");
const h2s = await page.locator("h2").allInnerTexts().catch(() => []);
const rows = await page.locator("tbody tr").count();
console.log(JSON.stringify({ url, h1, sections: h2s.slice(0, 12), tableRows: rows, problems }, null, 1));

await page.screenshot({ path: `${OUT}/super-admin-1440.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`phone overflow: ${overflow}px`);
await page.screenshot({ path: `${OUT}/super-admin-390.png` });

await browser.close();
