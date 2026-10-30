// Design Studio check: the gallery lists every registered style, a preview frame
// really carries the copied stylesheet, and applying a style changes <html>.
//   SHOT_EMAIL=... SHOT_PASS=... node scripts/_studio.mjs
import { chromium } from "@playwright/test";

const URL = process.env.AUDIT_URL || "http://localhost:5173";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(URL, { waitUntil: "networkidle" });
if (await page.locator('input[type="email"]').count()) {
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForSelector("nav.floating-rail", { timeout: 30000 });
}

const styles = await page.evaluate(async () => {
  const res = await fetch("/", { cache: "no-store" });
  return res.ok;
});
console.log("app reachable:", styles);

// Open the More menu and enter the studio.
await page.click('button[aria-label="More sections"]');
await page.click('.rail-more-menu button:has-text("Design Studio")');
await page.waitForSelector(".studio-grid", { timeout: 15000 });

const report = await page.evaluate(() => {
  const tiles = document.querySelectorAll(".studio-tile");
  const frame = document.querySelector(".studio-iframe");
  let frameSheets = 0;
  let sampleNodes = 0;
  let frameStyle = "";
  try {
    const doc = frame.contentDocument;
    frameSheets = doc.styleSheets.length;
    sampleNodes = doc.querySelectorAll(".studio-sample *").length;
    frameStyle = doc.documentElement.dataset.style || "";
  } catch (e) {
    frameStyle = "error: " + e.message;
  }
  return {
    tiles: tiles.length,
    first: tiles[0]?.querySelector("strong")?.textContent,
    last: tiles[tiles.length - 1]?.querySelector("strong")?.textContent,
    frameSheets,
    sampleNodes,
    frameStyle,
    facts: document.querySelectorAll(".studio-facts > div").length,
  };
});
console.log(report);

// Applying a style must change the document root without a reload.
const before = await page.evaluate(() => document.documentElement.dataset.style);
const target = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll(".studio-tile")];
  const tile = tiles.find((t) => t.querySelector("strong")?.textContent === "Swiss");
  tile.click();
  return tile.querySelector("strong").textContent;
});
await page.waitForTimeout(400);
await page.click('.studio-actions button');
await page.waitForTimeout(600);
const after = await page.evaluate(() => document.documentElement.dataset.style);
const layout = await page.evaluate(() => document.documentElement.dataset.layout);
console.log({ before, target, after, layout, changed: before !== after });

// The applied style must also reach the live shell, not just the attribute.
const shell = await page.evaluate(() => {
  const rail = getComputedStyle(document.querySelector(".floating-rail"));
  const stat = document.querySelector(".stat");
  return {
    railRadius: rail.borderRadius,
    statRadius: stat ? getComputedStyle(stat).borderRadius : "none",
    font: getComputedStyle(document.body).fontFamily,
  };
});
console.log("shell after apply", shell);

// No overflow inside the studio panel at phone width.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => {
  const root = document.querySelector(".studio");
  return {
    scrollW: root.scrollWidth,
    clientW: root.clientWidth,
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  };
});
console.log("overflow", overflow);

console.log("errors:", errors.slice(0, 8));
await browser.close();
