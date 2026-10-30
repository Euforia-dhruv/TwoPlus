// Auth screens are themed by the remembered language, not the org row. This
// proves it: seed localStorage with a style, load /login in a fresh context,
// and check the painted colours against that style's own tokens.
//   node scripts/_auth-theme.mjs
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";

// A spread of materials: photograph, flat paper, ink rules, neon, serif.
const CASES = [
  ["glass", "dark"],
  ["swiss", "light"],
  ["brutal", "light"],
  ["neon", "dark"],
  ["wabi", "light"],
];

const browser = await chromium.launch();
const problems = [];

for (const [style, mode] of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${style}: pageerror ${e.message}`));

  // Seed before any app code runs.
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

  const r = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const card = document.querySelector(".auth-card");
    const submit = document.querySelector(".auth-submit");
    const brand = document.querySelector(".auth-brand");
    const css = getComputedStyle;
    const val = (n) => root.getPropertyValue(n).trim();
    return {
      style: document.documentElement.dataset.style,
      mode: document.documentElement.dataset.mode,
      layout: document.documentElement.dataset.layout,
      accent: val("--lime"),
      onAccent: val("--on-accent"),
      cardBg: card ? css(card).backgroundColor : "-",
      cardRadius: card ? css(card).borderTopLeftRadius : "-",
      brandBg: brand ? css(brand).backgroundColor : "-",
      pageBg: css(document.body).backgroundColor,
      submitBg: submit ? css(submit).backgroundColor : "-",
      submitColor: submit ? css(submit).color : "-",
      font: css(document.querySelector(".auth-card h1")).fontFamily.slice(0, 40),
    };
  });

  if (r.style !== style) problems.push(`${style}: style not applied (${r.style})`);
  if (r.mode !== mode) problems.push(`${style}: mode not applied (${r.mode})`);

  console.log(
    `${style}/${mode}`.padEnd(14) +
      ` layout=${r.layout.padEnd(9)} accent=${r.accent.padEnd(9)} card=${r.cardBg.padEnd(22)}` +
      ` radius=${r.cardRadius.padEnd(6)} submit=${r.submitBg}/${r.submitColor}`
  );

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "AUTH THEMED BY REMEMBERED STYLE");
process.exit(problems.length ? 1 : 0);
