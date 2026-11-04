// Audit probe: accessible names on the icon-only side dock, and whether
// keyboard focus is actually visible. Read-only.
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:5173";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"], button.auth-submit');
await page.waitForSelector(".app-side-nav", { timeout: 30000 });
await page.goto(`${BASE}/app/people/members`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const links = await page.evaluate(() => {
  const out = [];
  for (const a of document.querySelectorAll(".app-side-nav a")) {
    const r = a.getBoundingClientRect();
    out.push({
      label: a.getAttribute("aria-label"),
      title: a.getAttribute("title"),
      text: a.innerText.trim(),
      href: a.getAttribute("href"),
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
  }
  return out;
});

console.log(`dock links: ${links.length}`);
for (const l of links) {
  console.log(`  name=${JSON.stringify(l.label)} title=${JSON.stringify(l.title)} text=${JSON.stringify(l.text)} ${l.w}x${l.h} ${l.href}`);
}

// Focus the first link and measure whether a visible ring appears.
await page.locator(".app-side-nav a").first().focus();
await page.waitForTimeout(200);
const focus = await page.evaluate(() => {
  const a = document.activeElement;
  const s = getComputedStyle(a);
  return {
    tag: a?.tagName,
    outlineStyle: s.outlineStyle,
    outlineWidth: s.outlineWidth,
    outlineColor: s.outlineColor,
    boxShadow: s.boxShadow,
  };
});
console.log(`focus ring: ${JSON.stringify(focus)}`);

await browser.close();
