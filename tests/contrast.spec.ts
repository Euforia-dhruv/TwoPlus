import { test, expect } from "@playwright/test";
import { loadRegistry, contrastOn, round } from "./lib/style";

// Contrast is measured from the tokens the browser actually resolved, not from
// the source file, so a token that fails to apply is caught as a failure rather
// than passing on paper.
const STYLES = loadRegistry();

// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in."
);

// AA floors. 4.5 for text a member reads; 3.0 for labels and status colours,
// which are larger or carry a shape as well as a hue.
const FLOORS = {
  textPage: 4.5,
  textCard: 4.5,
  secondary: 4.5,
  labels: 3,
  onAccent: 4.5,
  status: 3,
};

for (const { id } of STYLES) {
  test(`${id}: readable in both modes`, async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await expect(page.locator(".theme-grid")).toBeVisible({ timeout: 15_000 });

    const option = page.locator(`.theme-option:has(.theme-swatch.style-${id})`);
    await expect(option).toHaveCount(1);

    for (const mode of ["dark", "light"] as const) {
      await option.click();
      const modeButton = page.locator(
        `.theme-actions button:has-text("${mode === "dark" ? "Dark mode" : "Light mode"}")`
      );
      if (await modeButton.count()) await modeButton.first().click();
      await page.waitForTimeout(120);

      const t = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const pick = (n: string) => root.getPropertyValue(n).trim();
        const card = document.querySelector(".board-card, .stat, .panel");
        return {
          mode: document.documentElement.dataset.mode,
          page: getComputedStyle(document.body).backgroundColor,
          card: card ? getComputedStyle(card).backgroundColor : pick("--card"),
          text: pick("--text"),
          text2: pick("--text-2"),
          text3: pick("--text-3"),
          accent: pick("--lime"),
          onAccent: pick("--on-accent"),
          ok: pick("--ok"),
          warn: pick("--warn"),
          err: pick("--err"),
        };
      });

      expect(t.mode, "mode applied").toBe(mode);

      const page_ = t.page;
      const pairs: Array<[string, string, string, number]> = [
        ["text on page", t.text, page_, FLOORS.textPage],
        ["text on card", t.text, t.card, FLOORS.textCard],
        ["secondary on card", t.text2, t.card, FLOORS.secondary],
        ["labels on card", t.text3, t.card, FLOORS.labels],
        ["label on accent", t.onAccent, t.accent, FLOORS.onAccent],
        ["ok on card", t.ok, t.card, FLOORS.status],
        ["warn on card", t.warn, t.card, FLOORS.status],
        ["err on card", t.err, t.card, FLOORS.status],
      ];

      for (const [label, fg, bg, floor] of pairs) {
        const value = contrastOn(fg, bg, page_);
        expect(value, `${mode}: could not parse ${label} (${fg} on ${bg})`).not.toBeNull();
        expect(
          round(value!),
          `${mode}: ${label} ${round(value!)}:1 (floor ${floor}:1, ${fg} on ${bg})`
        ).toBeGreaterThanOrEqual(floor);
      }
    }
  });
}
