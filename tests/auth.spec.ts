import { test, expect } from "@playwright/test";
import { loadRegistry, contrastOn, round } from "./lib/style";

// The auth screens sit outside the workspace shell and are themed by the style
// remembered in localStorage, not by the org row. So this spec seeds storage
// before the app boots and then reads the painted result.
test.use({ storageState: { cookies: [], origins: [] } });

const STYLES = loadRegistry();
const KEY = "twoplus.theme";

async function openLogin(page: import("@playwright/test").Page, style: string, mode: string) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: KEY, value: JSON.stringify({ preset: "sage", mode, style, image: null }) }
  );
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator(".auth-card")).toBeVisible({ timeout: 15_000 });
}

test("the remembered style themes the login screen", async ({ page }) => {
  // Spread of materials: photograph, flat paper, ink rules, neon, serif.
  const cases = [
    ["glass", "dark"],
    ["swiss", "light"],
    ["brutal", "light"],
    ["neon", "dark"],
    ["wabi", "light"],
  ];

  for (const [style, mode] of cases) {
    await openLogin(page, style, mode);

    const r = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const css = getComputedStyle;
      const card = document.querySelector(".auth-card");
      return {
        style: document.documentElement.dataset.style,
        mode: document.documentElement.dataset.mode,
        accent: root.getPropertyValue("--lime").trim(),
        cardBg: card ? css(card).backgroundColor : "-",
        cardRadius: card ? css(card).borderTopLeftRadius : "-",
      };
    });

    expect(r.style, `${style} applied to /login`).toBe(style);
    expect(r.mode, `${style} mode applied`).toBe(mode);
    expect(r.accent, `${style} accent token`).not.toBe("");
    expect(r.cardRadius, `${style} card is painted`).not.toBe("-");
  }
});

for (const { id } of STYLES) {
  test(`${id}: auth screen readable in both modes`, async ({ page }) => {
    for (const mode of ["dark", "light"] as const) {
      await openLogin(page, id, mode);

      const t = await page.evaluate(() => {
        const css = getComputedStyle;
        const q = (s: string) => document.querySelector(s);
        return {
          page: css(document.body).backgroundColor,
          card: q(".auth-card") ? css(q(".auth-card")!).backgroundColor : null,
          brand: q(".auth-brand") ? css(q(".auth-brand")!).backgroundColor : null,
          submitBg: q(".auth-submit") ? css(q(".auth-submit")!).backgroundColor : null,
          submitFg: q(".auth-submit") ? css(q(".auth-submit")!).color : null,
          title: q(".auth-card h1") ? css(q(".auth-card h1")!).color : null,
          label: q(".auth-field") ? css(q(".auth-field")!).color : null,
          alt: q(".auth-alt") ? css(q(".auth-alt")!).color : null,
          mode: document.documentElement.dataset.mode,
        };
      });

      expect(t.mode, "mode applied").toBe(mode);
      expect(t.card, "auth card painted").not.toBeNull();

      const page_ = t.page || "rgb(0,0,0)";
      const pairs: Array<[string, string | null, string | null]> = [
        ["title on card", t.title, t.card],
        ["label on card", t.label, t.card],
        ["alt text on card", t.alt, t.card],
        ["brand copy on panel", t.title, t.brand ?? t.card],
        ["button label", t.submitFg, t.submitBg],
      ];

      for (const [label, fg, bg] of pairs) {
        expect(fg, `${mode}: ${label} has a colour`).not.toBeNull();
        expect(bg, `${mode}: ${label} has a backdrop`).not.toBeNull();
        const value = contrastOn(fg!, bg!, page_);
        expect(value, `${mode}: could not parse ${label}`).not.toBeNull();
        expect(
          round(value!),
          `${mode}: ${label} ${round(value!)}:1 (${fg} on ${bg})`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
