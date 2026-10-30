// Theme check: captures the dashboard in both themes so the neumorphic
// surfaces can be judged visually.
//   SHOT_EMAIL=you@gym.com SHOT_PASS=secret node scripts/_neumorphic.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "screenshots/neumorphic";
mkdirSync(OUT, { recursive: true });

const PAGES = ["Overview", "Members", "Settings"];
const browser = await chromium.launch();
const problems = [];

for (const [style, mode] of [
  ["classic", "light"],
  ["classic", "dark"],
  ["glass", "dark"],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${style}/${mode} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`${style}/${mode} console: ${m.text().slice(0, 160)}`);
  });

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  if (await page.locator('input[type="email"]').count()) {
    await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
    await page.fill('input[type="password"]', process.env.SHOT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector(".app", { timeout: 20000 });
  }
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), {
      timeout: 15000,
    })
    .catch(() => problems.push(`${style}/${mode}: workspace never loaded`));

  await page.evaluate(
    ([s, m]) => {
      document.documentElement.dataset.style = s;
      document.documentElement.dataset.mode = m;
    },
    [style, mode]
  );
  await page.waitForTimeout(400);

  for (const name of PAGES) {
    const btn = page.locator(`.floating-rail button[aria-label="${name}"]`);
    if (await btn.count()) {
      await btn.first().click({ force: true });
    } else {
      await page.locator('.floating-rail button[aria-label="More sections"]').click({ force: true });
      await page.waitForTimeout(200);
      await page.locator(`.rail-more-menu button:text-is("${name}")`).first().click({ force: true });
    }
    await page.waitForTimeout(400);

    const audit = await page.evaluate(() => {
      const card = document.querySelector(".directory, .panel, .stat, .board-card");
      const input = document.querySelector(".input");
      const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
      return {
        cardShadow: cs(card, "boxShadow"),
        cardBg: card ? getComputedStyle(card).backgroundColor : null,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        inputShadow: cs(input, "boxShadow"),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    if (audit.scrollW > audit.clientW + 1) {
      problems.push(`${style}/${mode} ${name}: overflow ${audit.scrollW} > ${audit.clientW}`);
    }
    console.log(style, mode, name, JSON.stringify(audit));

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await page.screenshot({ path: `${OUT}/${style}-${mode}-${slug}.png` });
  }

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "no page errors, no overflow");
