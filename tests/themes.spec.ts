import { test, expect } from "@playwright/test";
import { loadRegistry, SIDE, LABELLED } from "./lib/style";

// Every registered language, at three widths, in both modes: the picker really
// applies it, the shell matches its declared layout, and nothing overflows or
// hides under the navigation. One test per style keeps a failure readable.
const STYLES = loadRegistry();

// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in."
);

const VIEWPORTS = [
  { tag: "1440", width: 1440, height: 900 },
  { tag: "1024", width: 1024, height: 800 },
  { tag: "390", width: 390, height: 844 },
];

for (const { id, layout } of STYLES) {
  test(`${id}: ${layout} shell holds at every width`, async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await expect(page.locator(".theme-grid")).toBeVisible({ timeout: 15_000 });

    const option = page.locator(`.theme-option:has(.theme-swatch.style-${id})`);
    await expect(option, `${id} has a picker tile`).toHaveCount(1);

    for (const size of VIEWPORTS) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await option.click();

      for (const mode of ["dark", "light"] as const) {
        const modeButton = page.locator(
          `.theme-actions button:has-text("${mode === "dark" ? "Dark mode" : "Light mode"}")`
        );
        if (await modeButton.count()) await modeButton.first().click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(120);

        const r = await page.evaluate(() => {
          const box = (el: Element | null) => {
            if (!el) return null;
            const b = el.getBoundingClientRect();
            return {
              x: Math.round(b.x),
              y: Math.round(b.y),
              w: Math.round(b.width),
              h: Math.round(b.height),
              r: Math.round(b.right),
              b: Math.round(b.bottom),
            };
          };
          const css = getComputedStyle;
          const root = document.documentElement;
          return {
            style: root.dataset.style,
            layout: root.dataset.layout,
            mode: root.dataset.mode,
            rail: box(document.querySelector(".floating-rail")),
            shell: box(document.querySelector(".main-shell")),
            head: box(document.querySelector(".topbar")),
            labels: [...document.querySelectorAll(".floating-rail .rail-label")].filter(
              (n) => css(n).display !== "none" && n.getBoundingClientRect().width > 0
            ).length,
            padBottom: parseFloat(css(document.querySelector(".app")!).paddingBottom),
            scrollW: root.scrollWidth,
            clientW: root.clientWidth,
            vw: window.innerWidth,
            vh: window.innerHeight,
          };
        });

        const tag = `${size.tag}/${mode}`;
        expect(r.style, `${tag} style applied`).toBe(id);
        expect(r.layout, `${tag} layout`).toBe(layout);
        expect(r.mode, `${tag} mode applied`).toBe(mode);
        expect(r.scrollW, `${tag} no horizontal overflow`).toBeLessThanOrEqual(r.clientW + 1);

        const rail = r.rail!;
        expect(rail, `${tag} rail exists`).not.toBeNull();
        expect(rail.x, `${tag} rail inside left edge`).toBeGreaterThanOrEqual(-1);
        expect(rail.y, `${tag} rail inside top edge`).toBeGreaterThanOrEqual(-1);
        expect(rail.r, `${tag} rail inside right edge`).toBeLessThanOrEqual(r.vw + 1);
        expect(rail.b, `${tag} rail inside bottom edge`).toBeLessThanOrEqual(r.vh + 1);

        const overlaps = (a: typeof rail, b: typeof rail) =>
          a != null &&
          b != null &&
          a.x < b.r &&
          a.r > b.x &&
          a.y < b.b &&
          a.b > b.y;

        if (size.width <= 820) {
          // Every shell becomes one bottom bar on a phone.
          expect(rail.y, `${tag} phone rail at the bottom`).toBeGreaterThanOrEqual(r.vh / 2);
          expect(r.padBottom, `${tag} content cleared for the bar`).toBeGreaterThanOrEqual(rail.h + 6);
        } else if (SIDE.has(layout)) {
          expect(overlaps(r.shell, rail), `${tag} shell clear of the rail`).toBe(false);
          expect(overlaps(r.head, rail), `${tag} topbar clear of the rail`).toBe(false);
        } else if (layout === "tabs") {
          // Pocket is a phone-width column at every size; its bar floats over
          // the column by design, so only the bottom padding has to clear it.
          expect(r.padBottom, `${tag} column cleared for tabs`).toBeGreaterThanOrEqual(rail.h + 6);
        } else {
          // Top strip or capsule: content starts below the bar.
          expect(r.shell!.y + 1, `${tag} content below the ${layout} bar`).toBeGreaterThanOrEqual(rail.b);
        }

        // Docked rails drop their labels below 1100px; operator has none at all.
        const labelsExpected = LABELLED.has(layout) && !(layout === "docked" && size.width <= 1100);
        if (size.width > 820 && labelsExpected) {
          expect(r.labels, `${tag} labels visible on a wide ${layout} shell`).toBeGreaterThan(0);
        }
      }
    }

    expect(problems, "no uncaught errors").toEqual([]);
  });
}
