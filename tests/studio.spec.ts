import { test, expect } from "@playwright/test";
import { loadRegistry } from "./lib/style";

// The Design Studio is the artefact the brief asked for, so it gets its own
// gate: every registered language is listed, the preview frame carries real
// components from the app's own stylesheets, and applying one changes the live
// document rather than only the tile.
const STYLES = loadRegistry();

async function openStudio(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.click('button[aria-label="More sections"]');
  await page.click('.rail-more-menu button:has-text("Design Studio")');
  await expect(page.locator(".studio-grid")).toBeVisible({ timeout: 15_000 });
}

test("studio lists every language and previews with real components", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.g|unsplash|favicon/i.test(m.text())) {
      errors.push(m.text());
    }
  });

  await openStudio(page);

  await expect(page.locator(".studio-tile")).toHaveCount(STYLES.length);

  const frame = page.frameLocator(".studio-iframe");
  // The preview is a copy of the app's stylesheets, so the components in it are
  // the production ones, not mockups.
  await expect(frame.locator(".studio-sample *").first()).toBeVisible({ timeout: 10_000 });

  const facts = page.locator(".studio-facts > div");
  await expect(facts).toHaveCount(4);

  expect(errors, "no console or page errors").toEqual([]);
});

test("search narrows the gallery and survives an empty result", async ({ page }) => {
  await openStudio(page);

  const search = page.getByLabel("Search design styles");
  await search.fill("swiss");
  await expect(page.locator(".studio-tile")).toHaveCount(1);

  await search.fill("zzzz-no-such-style");
  await expect(page.locator(".studio-tile")).toHaveCount(0);
  await expect(page.locator(".studio .empty")).toBeVisible();

  await search.fill("");
  await expect(page.locator(".studio-tile")).toHaveCount(STYLES.length);
});

test("applying a style changes the live shell without a reload", async ({ page }) => {
  await openStudio(page);

  const before = await page.evaluate(() => document.documentElement.dataset.style);

  // Pick a style whose shell differs from the default so the change is visible
  // in geometry, not just in colour.
  const target = page.locator(".studio-tile", { has: page.locator("strong", { hasText: "Swiss" }) });
  await target.click();
  await expect(page.locator(".studio-actions button")).toBeEnabled();

  await page.click(".studio-actions button");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.style))
    .not.toBe(before);

  const shell = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      style: root.dataset.style,
      layout: root.dataset.layout,
      railRadius: getComputedStyle(document.querySelector(".floating-rail")!).borderRadius,
      font: getComputedStyle(document.body).fontFamily,
    };
  });

  expect(shell.style).toBe("swiss");
  expect(shell.layout).toBe("strip");
  expect(shell.railRadius, "a zero-radius language is felt in the shell").toBe("0px");
});

test("studio does not overflow at phone width", async ({ page }) => {
  await openStudio(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const overflow = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  }));

  expect(overflow.docW).toBeLessThanOrEqual(overflow.winW + 1);
});
