// Contrast audit. Reads the tokens the browser actually computed for each
// style, in both modes, and checks the pairs that carry meaning: body text on
// the page, secondary text, labels, the accent used as a button fill, and
// status colours. Anything below WCAG AA for small text is reported.
//   AUDIT_URL=... SHOT_EMAIL=... SHOT_PASS=... node scripts/_contrast.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

const STYLES = [
  ...readFileSync(join(import.meta.dirname, "../src/lib/theme.tsx"), "utf8").matchAll(
    /\{ id: "([a-z0-9]+)"[^}]*?layout: "([a-z]+)"/g
  ),
].map(([, id]) => id);

// WCAG relative luminance, parsing only the forms the tokens use: hex and
// rgb()/rgba() with optional alpha, since translucent cards are composited.
function channels(color) {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  }
  const rgb = color.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return parts.slice(0, 3);
  }
  return null;
}

function alpha(color) {
  const rgb = color.match(/rgba\(([^)]+)\)/i);
  if (!rgb) return 1;
  const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return parts.length > 3 ? parts[3] : 1;
}

// Any colour that parses wins; an unset token falls back to the page.
function resolve(color, fallback) {
  return channels(color) ? color : fallback;
}

// Flattens a translucent colour onto its backdrop, which is what the eye sees.
function over(fg, bg) {
  const a = alpha(fg);
  const f = channels(fg);
  const b = channels(bg);
  if (!f || !b || a >= 1) return f ? `rgb(${f.join(",")})` : fg;
  return `rgb(${f.map((c, i) => Math.round(c * a + b[i] * (1 - a))).join(",")})`;
}

function luminance(color) {
  const c = channels(color);
  if (!c) return null;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

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

const rows = [];
const problems = [];

for (const style of STYLES) {
  for (const mode of ["light", "dark"]) {
    await page.locator(`.theme-option:has(.theme-swatch.style-${style})`).click();
    const modeButton = page.locator(
      `.theme-actions button:has-text("${mode === "dark" ? "Dark mode" : "Light mode"}")`
    );
    if (await modeButton.count()) await modeButton.first().click();
    await page.waitForTimeout(120);

    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const card = document.querySelector(".panel, .stat, .board-card");
      const pick = (name) => root.getPropertyValue(name).trim();
      return {
        page: body.backgroundColor,
        text: pick("--text"),
        text2: pick("--text-2"),
        text3: pick("--text-3"),
        accent: pick("--lime"),
        onAccent: pick("--on-accent"),
        ok: pick("--ok"),
        warn: pick("--warn"),
        err: pick("--err"),
        card: card ? getComputedStyle(card).backgroundColor : body.backgroundColor,
        field: pick("--field"),
      };
    });

    const pageBg = tokens.page;
    const cardBg = over(tokens.card, pageBg);

    const pairs = [
      // Primary text on both surfaces; 4.5 is the AA small-text floor.
      ["text on page", tokens.text, pageBg, 4.5],
      ["text on card", tokens.text, cardBg, 4.5],
      ["secondary on card", tokens.text2, cardBg, 4.5],
      ["labels on card", tokens.text3, cardBg, 3],
      // The accent is a fill for buttons, so its label must read on it.
      ["label on accent", tokens.onAccent, tokens.accent, 4.5],
      // Status colours are text, not decoration.
      ["ok on card", tokens.ok, cardBg, 3],
      ["warn on card", tokens.warn, cardBg, 3],
      ["err on card", tokens.err, cardBg, 3],
    ];

    for (const [label, fg, bg, floor] of pairs) {
      // Both sides may be hex or rgb, and either may need flattening onto the
      // page. Resolving each independently keeps the accent pair honest.
      const back = over(resolve(bg, pageBg), pageBg);
      const value = ratio(over(resolve(fg, back), back), back);
      if (value === null) {
        problems.push(`${style}/${mode}: could not parse ${label} (${fg} on ${bg})`);
        continue;
      }
      const rounded = Math.round(value * 100) / 100;
      rows.push({ tag: `${style}/${mode}`, label, ratio: rounded, floor });
      if (rounded < floor) {
        problems.push(`${style}/${mode}: ${label} ${rounded}:1 below ${floor}:1 (${fg} on ${bg})`);
      }
    }
  }
}

await browser.close();

for (const row of rows.filter((r) => r.ratio < r.floor + 1)) {
  console.log(`${row.tag.padEnd(18)} ${row.label.padEnd(20)} ${row.ratio}:1 (floor ${row.floor})`);
}
console.log(problems.length ? `CONTRAST PROBLEMS (${problems.length}):\n  ${problems.join("\n  ")}` : "ALL CONTRAST OK");
process.exit(problems.length ? 1 : 0);
