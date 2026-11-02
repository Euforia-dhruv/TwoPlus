import { test, expect } from "@playwright/test";
import { MODES, contrastOn, round } from "./lib/style";

// The auth screens sit outside the workspace shell and are painted from the
// mode remembered in localStorage, not from the org row. This spec seeds that
// storage before the app boots and then reads the painted result.
test.use({ storageState: { cookies: [], origins: [] } });

const KEY = "twoplus.theme";

async function openLogin(page: import("@playwright/test").Page, mode: string) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: KEY, value: JSON.stringify({ mode }) },
  );
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator(".auth-card")).toBeVisible({ timeout: 15_000 });
}

test("the remembered mode paints the login screen", async ({ page }) => {
  for (const mode of ["dark", "light"] as const) {
    await openLogin(page, mode);

    const r = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const css = getComputedStyle;
      const card = document.querySelector(".auth-card");
      return {
        mode: document.documentElement.dataset.mode,
        accent: root.getPropertyValue("--lime").trim(),
        cardRadius: card ? css(card).borderTopLeftRadius : "-",
      };
    });

    expect(r.mode, `${mode} applied to /login`).toBe(mode);
    expect(r.accent, `${mode} accent token`).not.toBe("");
    expect(r.cardRadius, `${mode} card is painted`).not.toBe("-");
  }
});

for (const { id } of MODES) {
  test(`${id}: auth screen readable`, async ({ page }) => {
    await openLogin(page, id);

    const t = await page.evaluate(() => {
      const css = getComputedStyle;
      const q = (s: string) => document.querySelector(s);
      return {
        page: css(document.body).backgroundColor,
        card: q(".auth-card") ? css(q(".auth-card")!).backgroundColor : null,
        submitBg: q(".auth-submit") ? css(q(".auth-submit")!).backgroundColor : null,
        submitFg: q(".auth-submit") ? css(q(".auth-submit")!).color : null,
        title: q(".auth-card h1") ? css(q(".auth-card h1")!).color : null,
        label: q(".auth-field") ? css(q(".auth-field")!).color : null,
        alt: q(".auth-alt") ? css(q(".auth-alt")!).color : null,
        mode: document.documentElement.dataset.mode,
      };
    });

    expect(t.mode, "mode applied").toBe(id);
    expect(t.card, "auth card painted").not.toBeNull();

    const page_ = t.page || "rgb(0,0,0)";
    const pairs: Array<[string, string | null, string | null]> = [
      ["title on card", t.title, t.card],
      ["label on card", t.label, t.card],
      ["alt text on card", t.alt, t.card],
      ["button label", t.submitFg, t.submitBg],
    ];

    for (const [label, fg, bg] of pairs) {
      expect(fg, `${id}: ${label} has a colour`).not.toBeNull();
      expect(bg, `${id}: ${label} has a backdrop`).not.toBeNull();
      const value = contrastOn(fg!, bg!, page_);
      expect(value, `${id}: could not parse ${label}`).not.toBeNull();
      expect(
        round(value!),
        `${id}: ${label} ${round(value!)}:1 (${fg} on ${bg})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
}
