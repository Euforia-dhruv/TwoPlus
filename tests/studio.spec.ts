import { test, expect } from "@playwright/test";

// Navigation geometry gate. It is the part of the old Design Studio spec that
// did not depend on the theme catalogue, which no longer exists.
//
// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in.",
);

test("two-level navigation follows the URL", async ({ page }) => {
  await page.goto("/app/finance/payroll", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toHaveText("Payroll");
  await expect(page.locator(".secondary-nav-title")).toHaveText("Finance");
  await expect(page.locator(".floating-rail .glass-dock")).toBeVisible();
  // Refresh keeps the same module (state derives from the URL).
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toHaveText("Payroll");
});

test("shell holds at every width in both modes", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

  await page.goto("/app", { waitUntil: "networkidle" });

  for (const size of [
    { tag: "1440", width: 1440, height: 900 },
    { tag: "1024", width: 1024, height: 800 },
    { tag: "390", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: size.width, height: size.height });

    for (const mode of ["dark", "light"] as const) {
      await page.evaluate((mode) => {
        document.documentElement.dataset.mode = mode;
      }, mode);
      await page.waitForTimeout(120);

      const r = await page.evaluate(() => {
        const root = document.documentElement;
        const box = (el: Element | null) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, r: b.right, b: b.bottom, h: b.height };
        };
        return {
          mode: root.dataset.mode,
          rail: box(document.querySelector(".floating-rail")),
          scrollW: root.scrollWidth,
          clientW: root.clientWidth,
          vw: window.innerWidth,
        };
      });

      const tag = `${size.tag}/${mode}`;
      expect(r.mode, `${tag} mode applied`).toBe(mode);
      expect(r.scrollW, `${tag} no horizontal overflow`).toBeLessThanOrEqual(r.clientW + 1);

      const rail = r.rail!;
      expect(rail, `${tag} rail exists`).not.toBeNull();
      expect(rail.x, `${tag} rail inside left edge`).toBeGreaterThanOrEqual(-1);
      expect(rail.y, `${tag} rail inside top edge`).toBeGreaterThanOrEqual(-1);
      expect(rail.r, `${tag} rail inside right edge`).toBeLessThanOrEqual(r.vw + 1);
    }
  }

  expect(problems, "no uncaught errors").toEqual([]);
});
