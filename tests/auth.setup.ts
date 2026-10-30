import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Signs in once. Every other spec reuses this storage state, so the gates never
// depend on the login screen behaving, and a login bug only fails one test.
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
const STATE = "tests/.auth/state.json";

setup("sign in and save the session", async ({ page }) => {
  setup.skip(!EMAIL || !PASS, "Set SHOT_EMAIL and SHOT_PASS to run the signed-in suite.");

  await page.goto("/", { waitUntil: "networkidle" });

  // Already signed in (a reused server kept the session).
  if (!(await page.locator('input[type="email"]').count())) {
    await expect(page.locator(".app")).toBeVisible({ timeout: 30_000 });
  } else {
    await page.fill('input[type="email"]', EMAIL!);
    await page.fill('input[type="password"]', PASS!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
    await expect(page.locator(".app")).toBeVisible({ timeout: 30_000 });
  }

  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), {
      timeout: 20_000,
    })
    .catch(() => {});

  mkdirSync("tests/.auth", { recursive: true });
  await page.context().storageState({ path: STATE });
});
