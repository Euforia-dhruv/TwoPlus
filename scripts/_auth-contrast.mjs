// Contrast on the auth screens, which sit outside the workspace shell. Reuses
// the math from _contrast.mjs but reads the auth selectors, where the surfaces
// are a photo, a card and a filled button rather than dashboard panels.
//   SHOT_EMAIL/... not needed; node scripts/_auth-contrast.mjs
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const STYLES = (process.env.STYLES || "").split(",").filter(Boolean);
const ALL = [
  "glass", "classic", "clay", "ethereal", "cybercore", "neon", "cyberpunk",
  "pixel", "y2k", "brutal", "maximal", "surreal", "scrapbook", "dispatch",
  "luxury", "swiss", "minimal", "bento", "ledger", "sketch", "bohemian",
  "victorian", "wabi", "signal", "console", "pocket",
];
const LIST = STYLES.length ? STYLES : ALL;

function channels(color) {
  const rgb = color.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return parts.slice(0, 3);
  }
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const short = color.trim().match(/^#([0-9a-f]{3})$/i);
  if (short) return [0, 1, 2].map((i) => parseInt(short[1][i] + short[1][i], 16));
  return null;
}

function alpha(color) {
  const rgb = color.match(/rgba\(([^)]+)\)/i);
  if (!rgb) return 1;
  const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return parts.length > 3 ? parts[3] : 1;
}

function resolve(color, fallback) {
  return channels(color) ? color : fallback;
}

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
const problems = [];
const rows = [];

for (const style of LIST) {
  for (const mode of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(
      ({ style, mode }) => {
        localStorage.setItem(
          "twoplus.theme",
          JSON.stringify({ preset: "sage", mode, style, image: null })
        );
      },
      { style, mode }
    );
    await page.goto(`${URL}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector(".auth-card", { timeout: 15000 });

    const t = await page.evaluate(() => {
      const css = getComputedStyle;
      const card = document.querySelector(".auth-card");
      const brand = document.querySelector(".auth-brand");
      const submit = document.querySelector(".auth-submit");
      const h1 = document.querySelector(".auth-card h1");
      const label = document.querySelector(".auth-field");
      const alt = document.querySelector(".auth-alt");
      return {
        page: css(document.body).backgroundColor,
        card: card ? css(card).backgroundColor : null,
        brand: brand ? css(brand).backgroundColor : null,
        submitBg: submit ? css(submit).backgroundColor : null,
        submitFg: submit ? css(submit).color : null,
        h1: h1 ? css(h1).color : null,
        label: label ? css(label).color : null,
        alt: alt ? css(alt).color : null,
      };
    });

    // The page colour can be the photo backdrop; body background is the base.
    const page_ = over(resolve(t.page, "rgb(0,0,0)"), "rgb(0,0,0)");
    const card = over(resolve(t.card, page_), page_);
    const brand = over(resolve(t.brand, page_), page_);
    const pairs = [
      ["title on card", t.h1, card, 4.5],
      ["label on card", t.label, card, 4.5],
      ["alt text on card", t.alt, card, 4.5],
      ["brand copy on panel", t.h1, brand, 4.5],
      ["button label", t.submitFg, t.submitBg, 4.5],
    ];

    for (const [label, fg, bg, floor] of pairs) {
      if (!fg || !bg) {
        problems.push(`${style}/${mode}: missing ${label}`);
        continue;
      }
      const back = over(resolve(bg, page_), page_);
      const value = ratio(over(resolve(fg, back), back), back);
      if (value === null) {
        problems.push(`${style}/${mode}: unparsed ${label} (${fg} on ${bg})`);
        continue;
      }
      const r = Math.round(value * 100) / 100;
      rows.push({ tag: `${style}/${mode}`, label, r, floor });
      if (r < floor) problems.push(`${style}/${mode}: ${label} ${r}:1 below ${floor}:1`);
    }

    await ctx.close();
  }
}

await browser.close();
for (const row of rows.filter((r) => r.r < r.floor + 1)) {
  console.log(`${row.tag.padEnd(18)} ${row.label.padEnd(22)} ${row.r}:1 (floor ${row.floor})`);
}
console.log(problems.length ? `AUTH CONTRAST PROBLEMS (${problems.length}):\n  ${problems.join("\n  ")}` : "AUTH CONTRAST OK");
process.exit(problems.length ? 1 : 0);
