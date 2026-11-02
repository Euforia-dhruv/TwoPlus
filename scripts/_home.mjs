// throwaway: what does /home resolve to for a dual admin+member account?
import { chromium } from "@playwright/test";

const base = process.env.AUDIT_URL || "http://localhost:5175";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').waitFor({ timeout: 20000 });
await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
await page.fill('input[type="password"]', process.env.SHOT_PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });

for (const path of ["/home", "/app", "/member"]) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({
    path: location.pathname,
    app: Boolean(document.querySelector(".app")),
    memberShell: Boolean(document.querySelector(".mb-card, .mb-hero")),
    h1: document.querySelector("main h1")?.textContent?.trim() ?? null,
  }));
  console.log(path, "->", JSON.stringify(info));
}
await browser.close();
