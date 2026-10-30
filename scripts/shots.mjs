// Screenshot harness. Logs in to the running dev server, then captures the
// dashboard across themes, modes and viewports.
//   SHOT_EMAIL=you@gym.com SHOT_PASS=secret node scripts/shots.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = process.argv[3] ?? "screenshots";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

const PAGES = ["Overview", "Members", "Payments", "Settings"];
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function shoot(style, mode, vp, pages) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${vp.name} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`${vp.name} console: ${m.text().slice(0, 160)}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle" });

  if (await page.locator('input[type="email"]').count()) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector(".app", { timeout: 20000 });
  }

  // Screenshot only once the workspace has finished loading, otherwise the
  // board shows "Loading your workspace..." and placeholder dashes.
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), {
      timeout: 15000,
    })
    .catch(() => problems.push(`${vp.name} ${style}/${mode}: workspace never finished loading`));

  // Theme is applied from the org row; override the root dataset so the
  // screenshot does not write to the database.
  await page.evaluate(
    ([s, m]) => {
      document.documentElement.dataset.style = s;
      document.documentElement.dataset.mode = m;
    },
    [style, mode]
  );
  await page.waitForTimeout(400);

  for (const name of pages) {
    const btn = page.locator(`.floating-rail button[aria-label="${name}"]`);
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(350);
    } else {
      // secondary pages live in the More menu
      const more = page.locator('.floating-rail button[aria-label="More sections"]');
      if (await more.count()) {
        await more.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
        const item = page.locator(`.rail-more-menu button:text-is("${name}")`);
        if (await item.count()) {
          await item.first().click({ force: true }).catch(() => {});
          await page.waitForTimeout(350);
        }
      }
    }

    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    if (overflow.scrollW > overflow.clientW + 1) {
      problems.push(
        `${vp.name} ${style}/${mode} ${name}: horizontal overflow ${overflow.scrollW} > ${overflow.clientW}`
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await page.screenshot({
      path: `${OUT}/${vp.name}-${style}-${mode}-${slug}.png`,
      fullPage: false,
    });
  }

  await ctx.close();
}

for (const vp of VIEWPORTS) {
  for (const style of ["glass", "classic"]) {
    for (const mode of ["dark", "light"]) {
      await shoot(style, mode, vp, PAGES);
    }
  }
}

await browser.close();

console.log(`screenshots -> ${OUT}`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "no page errors, no overflow");
