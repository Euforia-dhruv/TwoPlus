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
  // The category is carried by the section nav and the side dock, not a title.
  await expect(page.locator('.uh-nav[aria-label="Finance sections"]')).toBeVisible();
  await expect(page.locator(".app-side-nav")).toBeVisible();
  // Refresh keeps the same module (state derives from the URL).
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toHaveText("Payroll");
});

test("shell holds at every width in both modes", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

  await page.goto("/app", { waitUntil: "networkidle" });
  await expect(page.locator(".app")).toBeVisible({ timeout: 30_000 });

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
          nav: box(document.querySelector(".app-side-nav, .app-side-mobile")),
          shell: box(document.querySelector(".main-shell")),
          scrollW: root.scrollWidth,
          clientW: root.clientWidth,
          vw: window.innerWidth,
        };
      });

      const tag = `${size.tag}/${mode}`;
      expect(r.mode, `${tag} mode applied`).toBe(mode);
      expect(r.scrollW, `${tag} no horizontal overflow`).toBeLessThanOrEqual(r.clientW + 1);

      const nav = r.nav!;
      expect(nav, `${tag} navigation is present`).not.toBeNull();
      expect(nav.x, `${tag} nav inside left edge`).toBeGreaterThanOrEqual(-1);
      expect(nav.y, `${tag} nav inside top edge`).toBeGreaterThanOrEqual(-1);
      expect(nav.r, `${tag} nav inside right edge`).toBeLessThanOrEqual(r.vw + 1);

      const shell = r.shell!;
      expect(shell, `${tag} shell present`).not.toBeNull();
      expect(shell.x, `${tag} shell inside left edge`).toBeGreaterThanOrEqual(-1);
      expect(shell.r, `${tag} shell inside right edge`).toBeLessThanOrEqual(r.vw + 1);
    }
  }

  expect(problems, "no uncaught errors").toEqual([]);
});
