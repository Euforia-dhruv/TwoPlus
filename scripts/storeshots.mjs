// Store screenshots: captures the member app at the exact pixel sizes the Play
// Store and App Store ask for. The member app is what a member installs, and
// store listings need phone and tablet sets of it.
//   SHOT_EMAIL=you@gym.com SHOT_PASS=secret node scripts/storeshots.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = (process.argv[2] ?? "http://localhost:5173").replace(/\/+$/, "");
const OUT = process.argv[3] ?? "screenshots/store";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
if (!EMAIL || !PASS) throw new Error("Set SHOT_EMAIL and SHOT_PASS");

// CSS size x scale is chosen to land on the store's required pixel size.
const SETS = [
  { name: "play-phone", width: 360, height: 640, scale: 3 }, // 1080x1920
  { name: "play-tablet", width: 800, height: 1280, scale: 2 }, // 1600x2560
  { name: "apple-67", width: 430, height: 932, scale: 3 }, // 1290x2796
  { name: "apple-65", width: 414, height: 896, scale: 3 }, // 1242x2688
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const set of SETS) {
  const ctx = await browser.newContext({
    viewport: { width: set.width, height: set.height },
    deviceScaleFactor: set.scale,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${set.name} pageerror: ${e.message}`));

  await page.goto(`${BASE}/member`, { waitUntil: "networkidle" });

  if (await page.locator('input[type="email"]').count()) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
  }

  // The member app only renders its sections for an account linked to a member
  // record. Capture nothing rather than a screenshot of a claim prompt.
  await page
    .locator(".mb-card")
    .first()
    .waitFor({ timeout: 30_000 })
    .catch(() => {
      problems.push(
        `${set.name}: no member record linked to ${EMAIL}, so the member app has nothing to show`,
      );
    });

  if (!(await page.locator(".mb-card").count())) {
    await ctx.close();
    continue;
  }

  // Two frames per size: the top of the screen and one further down, because a
  // listing needs more than a header shot.
  for (const [suffix, fraction] of [
    ["home", 0],
    ["more", 0.75],
  ]) {
    await page.evaluate((f) => {
      const max = document.body.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * f);
    }, fraction);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${set.name}-${suffix}.png` });
  }

  await ctx.close();
}

await browser.close();
console.log(`screenshots -> ${OUT}`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "no page errors");
