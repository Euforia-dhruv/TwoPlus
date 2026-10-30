// Theme audit through the real Settings picker: click the tile, click the mode
// button, then measure. Each shell has its own contract, so the checks are per
// layout rather than one generic overlap test.
//   SHOT_EMAIL=... SHOT_PASS=... node scripts/_themes.mjs
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

// style -> layout is read from the registry itself, so this audit cannot drift
// from what ships: adding a row to THEME_STYLES is enough. Preset rows in the
// same file have an id but no layout, and the regex cannot cross a closing brace.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STYLES = [
  ...readFileSync(join(import.meta.dirname, "../src/lib/theme.tsx"), "utf8").matchAll(
    /\{ id: "([a-z0-9]+)"[^}]*?layout: "([a-z]+)"/g
  ),
].map(([, id, layout]) => [id, layout]);

if (STYLES.length < 20) {
  console.error(`Could not read the style registry (${STYLES.length} rows).`);
  process.exit(1);
}
const VIEWPORTS = [
  ["1440", 1440, 900],
  ["1024", 1024, 800],
  ["390", 390, 844],
];
// Only these shells show text labels; the rest are icon-only by design.
const LABELLED = new Set(["docked", "index", "strip", "clay"]);
// Shells whose navigation sits on a left/right edge and must not cover content.
const SIDE = new Set(["float", "docked", "operator", "index"]);

const browser = await chromium.launch();
const problems = [];
const rows = [];

for (const [vp, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${vp}: pageerror ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    // Font and image CDN noise is not an app fault.
    if (m.type() === "error" && !/fonts\.g|unsplash|favicon/i.test(t)) problems.push(`${vp}: console ${t}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  if (await page.locator('input[type="email"]').count()) {
    if (!EMAIL || !PASS) {
      console.error("Need SHOT_EMAIL and SHOT_PASS to sign in.");
      process.exit(1);
    }
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 25000 });
    await page.waitForSelector(".app", { state: "attached", timeout: 25000 });
  }
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), { timeout: 15000 })
    .catch(() => {});

  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await page.waitForSelector(".theme-grid", { timeout: 15000 });

  for (const [style, layout] of STYLES) {
    for (const mode of ["dark", "light"]) {
      const tag = `${style}/${vp}/${mode}`;
      const option = page.locator(`.theme-option:has(.theme-swatch.style-${style})`);
      if (!(await option.count())) {
        problems.push(`${tag}: no picker tile`);
        continue;
      }
      await option.click();

      // Drive the real mode control and require it to take effect.
      const modeButton = page.locator(`.theme-actions button:has-text("${mode === "dark" ? "Dark mode" : "Light mode"}")`);
      if (await modeButton.count()) await modeButton.first().click();
      // Clicking a tile can scroll the panel; measure from the top of the page.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(140);

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
        const head = document.querySelector(".topbar");
        const app = document.querySelector(".app");
        const card = document.querySelector(".board-card, .stat, .panel");
        const body = getComputedStyle(document.body);
        const root = getComputedStyle(document.documentElement);
        const css = getComputedStyle;
        return {
          style: document.documentElement.dataset.style,
          layout: document.documentElement.dataset.layout,
          mode: document.documentElement.dataset.mode,
          rail: box(rail),
          shell: box(shell),
          head: box(head),
          labels: [...document.querySelectorAll(".floating-rail .rail-label")].filter(
            (n) => css(n).display !== "none" && n.getBoundingClientRect().width > 0
          ).length,
          padTop: parseFloat(css(app).paddingTop),
          padLeft: parseFloat(css(app).paddingLeft),
          padBottom: parseFloat(css(app).paddingBottom),
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          vw: window.innerWidth,
          vh: window.innerHeight,
          font: root.getPropertyValue("--font-sans").trim().replace(/\s+/g, " ").slice(0, 30),
          accent: root.getPropertyValue("--lime").trim(),
          bg: body.backgroundColor,
          cardBg: card ? css(card).backgroundColor : "-",
          radius: card ? css(card).borderTopLeftRadius : "-",
        };
      });

      if (r.style !== style) problems.push(`${tag}: picker did not apply (${r.style})`);
      if (r.layout !== layout) problems.push(`${tag}: layout ${r.layout} != ${layout}`);
      if (r.mode !== mode) problems.push(`${tag}: mode button did not apply (${r.mode})`);

      const overlap = (a, b) => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
      if (r.scrollW > r.clientW + 1) problems.push(`${tag}: horizontal overflow ${r.scrollW}>${r.clientW}`);
      if (r.rail.x < -1 || r.rail.y < -1) problems.push(`${tag}: rail off-screen ${JSON.stringify(r.rail)}`);
      if (r.rail.r > r.vw + 1 || r.rail.b > r.vh + 1) problems.push(`${tag}: rail clipped ${JSON.stringify(r.rail)}`);

      const phone = width <= 820;
      if (phone) {
        // Every shell becomes one bottom bar on a phone.
        if (r.rail.y < r.vh / 2) problems.push(`${tag}: phone rail not at the bottom (y ${r.rail.y})`);
        if (r.padBottom < r.rail.h + 6) {
          problems.push(`${tag}: content not cleared for the bar (pad ${r.padBottom} vs ${r.rail.h})`);
        }
      } else if (SIDE.has(layout)) {
        if (overlap(r.shell, r.rail)) problems.push(`${tag}: shell under the rail`);
        if (overlap(r.head, r.rail)) problems.push(`${tag}: topbar under the rail`);
      } else if (layout === "tabs") {
        // Pocket is a phone-width column at every size; its bar floats over the
        // column by design, so only the bottom padding has to clear it.
        if (r.padBottom < r.rail.h + 6) {
          problems.push(`${tag}: column not cleared for the tabs bar (pad ${r.padBottom} vs ${r.rail.h})`);
        }
      } else {
        // Top bar or capsule: the page must start below the rail's bottom edge.
        if (r.shell.y + 1 < r.rail.b) {
          problems.push(`${tag}: content under the ${layout} bar (shell y ${r.shell.y}, rail b ${r.rail.b})`);
        }
      }

      // Docked rails drop their labels below 1100px; operator has none at all.
      const labelsExpected = LABELLED.has(layout) && !(layout === "docked" && width <= 1100);
      if (!phone && r.labels === 0 && labelsExpected) {
        problems.push(`${tag}: no labels on a wide ${layout} shell`);
      }

      rows.push({
        tag,
        layout,
        rail: `${r.rail.w}x${r.rail.h}`,
        at: `${r.rail.x},${r.rail.y}`,
        lab: r.labels,
        font: r.font,
        accent: r.accent,
        card: r.cardBg,
      });
    }
  }

  await ctx.close();
}

await browser.close();

for (const row of rows) {
  console.log(
    `${row.tag.padEnd(24)} ${row.layout.padEnd(9)} rail=${row.rail.padStart(9)} @${row.at.padEnd(9)} ` +
      `lab=${String(row.lab).padStart(2)} font=${row.font.padEnd(30)} accent=${row.accent.padEnd(9)} card=${row.card}`
  );
}
console.log(problems.length ? `PROBLEMS (${problems.length}):\n  ${problems.join("\n  ")}` : "ALL THEMES OK");
process.exit(problems.length ? 1 : 0);
