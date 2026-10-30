// One-off probe: neon at 1024, the only layout that reported a real overlap.
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
await page.fill('input[type="password"]', process.env.SHOT_PASS);
await page.click('button[type="submit"]');
await page.waitForSelector(".app", { state: "attached", timeout: 25000 });
await page.waitForTimeout(1500);

for (const style of ["neon", "classic", "brutal"]) {
  await page.evaluate((s) => {
    const r = document.documentElement;
    r.dataset.style = s;
    r.dataset.layout = "docked";
    r.dataset.mode = "dark";
  }, style);
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => {
    const rail = document.querySelector(".floating-rail");
    const shell = document.querySelector(".main-shell");
    const app = document.querySelector(".app");
    const root = getComputedStyle(document.documentElement);
    const rb = rail.getBoundingClientRect();
    const sb = shell.getBoundingClientRect();
    return {
      railW: Math.round(rb.width),
      railRight: Math.round(rb.right),
      shellX: Math.round(sb.x),
      railVar: root.getPropertyValue("--rail-w").trim(),
      padLeftVar: root.getPropertyValue("--shell-pad-left").trim(),
      appPadLeft: getComputedStyle(app).paddingLeft,
      railPad: getComputedStyle(rail).padding,
      btnW: Math.round(document.querySelector(".rail-primary button").getBoundingClientRect().width),
      labels: getComputedStyle(document.querySelector(".rail-label")).display,
    };
  });
  console.log(style.padEnd(9), JSON.stringify(out));
}

await browser.close();
