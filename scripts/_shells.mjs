// Shell audit for all nine themes: rail placement per viewport, horizontal
// overflow, and whether any content ends up underneath the navigation.
//   SHOT_EMAIL=... SHOT_PASS=... node scripts/_shells.mjs
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const STYLES = [
  ["glass", "float"],
  ["classic", "docked"],
  ["signal", "docked"],
  ["neon", "docked"],
  ["ledger", "strip"],
  ["console", "operator"],
  ["dispatch", "index"],
  ["pocket", "tabs"],
  ["clay", "clay"],
];
const VIEWPORTS = [
  ["1440", 1440, 900],
  ["1024", 1024, 800],
  ["390", 390, 844],
];

const browser = await chromium.launch();
const problems = [];

for (const [vp, width, height] of VIEWPORTS) {
  for (const [style, layout] of STYLES) {
    for (const mode of ["dark", "light"]) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => problems.push(`${style}/${vp}: pageerror ${e.message}`));

      await page.goto(URL, { waitUntil: "networkidle" });
      if (await page.locator('input[type="email"]').count()) {
        await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
        await page.fill('input[type="password"]', process.env.SHOT_PASS);
        await page.click('button[type="submit"]');
        await page.waitForSelector(".app", { timeout: 20000 });
      }
      await page
        .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), { timeout: 15000 })
        .catch(() => {});

      // Theme state normally comes from the org row; drive the document the same
      // way applyTheme does so every shell is measurable in one session.
      await page.evaluate(
        ([s, m, l]) => {
          const r = document.documentElement;
          r.dataset.style = s;
          r.dataset.mode = m;
          r.dataset.layout = l;
        },
        [style, mode, layout]
      );
      await page.waitForTimeout(250);

      const r = await page.evaluate(() => {
        const box = (el) => {
          const b = el.getBoundingClientRect();
          return {
            x: Math.round(b.x),
            y: Math.round(b.y),
            w: Math.round(b.width),
            h: Math.round(b.height),
            r: Math.round(b.right),
            b: Math.round(b.bottom),
          };
        };
        const rail = document.querySelector(".floating-rail");
        const shell = document.querySelector(".main-shell");
        const app = document.querySelector(".app");
        const head = document.querySelector(".topbar");
        const labels = [...document.querySelectorAll(".floating-rail .rail-label")].filter(
          (n) => getComputedStyle(n).display !== "none" && n.getBoundingClientRect().width > 0
        ).length;
        return {
          rail: box(rail),
          shell: box(shell),
          head: box(head),
          dir: getComputedStyle(rail).flexDirection,
          appPadLeft: getComputedStyle(app).paddingLeft,
          labels,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
      });

      const mobile = width <= 820;
      const tag = `${style}/${vp}/${mode}`;
      const { rail, shell, head } = r;

      const overlap = (a, b) =>
        a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;

      if (r.scrollW > r.clientW + 1) problems.push(`${tag}: horizontal overflow ${r.scrollW} > ${r.clientW}`);
      if (rail.x < -1 || rail.y < -1) problems.push(`${tag}: rail off-screen ${JSON.stringify(rail)}`);
      if (rail.r > r.vw + 1 || rail.b > r.vh + 1) problems.push(`${tag}: rail clipped ${JSON.stringify(rail)}`);
      if (overlap(shell, rail)) problems.push(`${tag}: shell overlaps the rail`);
      if (overlap(head, rail)) problems.push(`${tag}: topbar overlaps the rail`);
      if (mobile && rail.y < r.vh / 2) problems.push(`${tag}: mobile rail not at the bottom (y ${rail.y})`);
      if (!mobile && ["strip", "index", "clay"].includes(layout) && r.labels === 0) {
        problems.push(`${tag}: labels hidden on a wide screen`);
      }

      console.log(
        `${tag.padEnd(26)} rail=${String(rail.w).padStart(4)}x${String(rail.h).padStart(3)} @${rail.x},${rail.y} ` +
          `dir=${r.dir.padEnd(6)} labels=${r.labels} shell=${shell.x},${shell.y} ${shell.w}x${shell.h}`
      );
      await ctx.close();
    }
  }
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "ALL SHELLS OK");
