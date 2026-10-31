// Screenshot the member drawer so the payment/membership history can be
// inspected against real rows. Read-only: opens the drawer, clicks nothing that
// writes.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:5173";
const OUT = process.argv[3] || ".taste-skill/drawer";
mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
if (!EMAIL || !PASS) throw new Error("Set SHOT_EMAIL and SHOT_PASS");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console ${m.text()}`));

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL(/\/app/, { timeout: 30_000 });
await page.waitForLoadState("networkidle");

await page.getByRole("button", { name: "Members", exact: true }).first().click();
await page.waitForSelector(".member-card", { timeout: 20_000 });

const cards = await page.locator(".member-card").count();
await page.locator(".member-card .member-card-action").first().click();
await page.waitForSelector(".profile-drawer", { timeout: 10_000 });
await page.waitForTimeout(1200);

const heads = await page.locator(".profile-drawer h2").allInnerTexts();
const lines = await page.locator(".profile-drawer .detail-line").count();
console.log(JSON.stringify({ env: Boolean(env.VITE_SUPABASE_URL), cards, heads, detailLines: lines, problems }, null, 1));

await page.screenshot({ path: `${OUT}/drawer-1440.png`, fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/drawer-390.png`, fullPage: false });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`phone overflow: ${overflow}px`);

await browser.close();
