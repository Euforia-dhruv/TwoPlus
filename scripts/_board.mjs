// Audit the shell + overview board across themes and viewports.
//   node scripts/_board.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = "screenshots";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
];

const problems = [];
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${vp.name} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`${vp.name} console: ${m.text().slice(0, 140)}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  if (await page.locator('input[type="email"]').count()) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector(".app", { timeout: 25000 });
  }
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), { timeout: 15000 })
    .catch(() => problems.push(`${vp.name}: board never loaded`));

  for (const style of ["glass", "classic", "signal", "neon"]) {
    for (const mode of ["dark", "light"]) {
      await page.evaluate(
        ([s, m]) => {
          document.documentElement.dataset.style = s;
          document.documentElement.dataset.mode = m;
        },
        [style, mode]
      );
      await page.waitForTimeout(250);

      const geo = await page.evaluate(() => {
        const pick = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            dir: cs.flexDirection,
            bottom: Math.round(r.bottom),
          };
        };
        const strip = pick(".board-hero-stats");
        const hero = pick(".board-hero");
        const head = document.querySelector(".board-hero h2");
        return {
          style: document.documentElement.dataset.style,
          rail: pick(".floating-rail"),
          primary: pick(".rail-primary"),
          foot: pick(".rail-foot"),
          hero,
          strip,
          headColor: head ? getComputedStyle(head).color : null,
          headSize: head ? getComputedStyle(head).fontSize : null,
          stripOverflow: strip && hero ? strip.bottom > hero.bottom + 1 : false,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          railBottomGap: document.querySelector(".floating-rail")
            ? Math.round(innerHeight - document.querySelector(".floating-rail").getBoundingClientRect().bottom)
            : null,
        };
      });

      const tag = `${vp.name}-${style}-${mode}`;
      if (geo.scrollW > geo.clientW + 1) {
        problems.push(`${tag}: horizontal overflow ${geo.scrollW} > ${geo.clientW}`);
      }
      if (geo.stripOverflow) problems.push(`${tag}: stat strip spills past hero`);
      if (geo.rail && geo.rail.bottom > vp.height + 1) problems.push(`${tag}: rail runs past viewport`);
      console.log(tag, JSON.stringify(geo));

      await page.screenshot({ path: `${OUT}/board-${tag}.png` });
    }
  }

  // account menu lives in the topbar
  await page.click(".account-trigger");
  await page.waitForTimeout(150);
  const menuOpen = await page.evaluate(() => !!document.querySelector(".account-panel"));
  if (!menuOpen) problems.push(`${vp.name}: account panel did not open`);
  await page.screenshot({ path: `${OUT}/board-${vp.name}-account.png` });
  await page.keyboard.press("Escape");

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "clean: no overflow, no errors");
