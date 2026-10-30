// One-off probe: prints rail / shell / topbar rects per style so a flagged
// layout can be judged as a real bug or a checker assumption.
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const CASES = [
  ["swiss", "strip", 1440, 900],
  ["ledger", "strip", 1440, 900],
  ["clay", "clay", 1024, 800],
  ["wabi", "clay", 1024, 800],
  ["pocket", "tabs", 1440, 900],
  ["pocket", "tabs", 1024, 800],
  ["glass", "float", 1440, 900],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
if (await page.locator('input[type="email"]').count()) {
  await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
  await page.fill('input[type="password"]', process.env.SHOT_PASS);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".app", { timeout: 20000 });
}
await page.waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), { timeout: 15000 }).catch(() => {});

for (const [style, layout, w, h] of CASES) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(
    ([s, l]) => {
      const r = document.documentElement;
      r.dataset.style = s;
      r.dataset.layout = l;
      r.dataset.mode = "dark";
    },
    [style, layout]
  );
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => {
    const b = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), Math.round(r.bottom)];
    };
    const app = document.querySelector(".app");
    const cs = getComputedStyle(app);
    return {
      rail: b(".floating-rail"),
      shell: b(".main-shell"),
      top: b(".topbar"),
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
      railCS: (() => {
        const el = document.querySelector(".floating-rail");
        const c = getComputedStyle(el);
        return { pos: c.position, top: c.top, bottom: c.bottom, h: c.height };
      })(),
    };
  });
  console.log(
    `${style}/${layout}/${w}`.padEnd(22),
    `rail=${JSON.stringify(out.rail)} shell=${JSON.stringify(out.shell)} top=${JSON.stringify(out.top)}`
  );
  console.log("".padEnd(22), `appPad=${out.pad.join(" ")} railCS=${JSON.stringify(out.railCS)}`);
}

await browser.close();
