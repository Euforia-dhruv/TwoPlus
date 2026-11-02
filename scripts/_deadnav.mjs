// throwaway: what does an unimplemented module actually render?
import { chromium } from "@playwright/test";

const base = process.env.AUDIT_URL || "http://localhost:5175";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').waitFor({ timeout: 20000 });
await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
await page.fill('input[type="password"]', process.env.SHOT_PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
await page.locator(".app").waitFor({ timeout: 30000 });

for (const slug of [
  "operations/equipment",
  "operations/inventory",
  "growth/feedback",
  "growth/offers-referrals",
  "communication/customer-support",
]) {
  await page.goto(`${base}/app/${slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const main = document.querySelector("main");
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim();
    return {
      heading: document.querySelector("main h1")?.textContent ?? "-",
      chars: text.length,
      afterHeading: text.slice(0, 150),
      panels: main?.querySelectorAll(".panel, .board-card, section").length ?? 0,
    };
  });
  console.log(`${slug}\n  h1="${info.heading}" panels=${info.panels} chars=${info.chars}\n  body: ${info.afterHeading}`);
}
await page.screenshot({ path: "C:/Users/Vidhan/AppData/Local/Temp/opencode/deadnav.png" });
await browser.close();
