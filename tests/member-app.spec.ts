import { test, expect } from "@playwright/test";

// The member app is a separate shell from the staff workspace and is the part
// most likely to break silently: it only renders for an account that has been
// linked to a member record, and that link is data, not code. So these gates
// assert the structure that must always hold, and exercise the interactive
// panels only when the account is actually linked.
//
// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in.",
);

test("member app renders with no uncaught errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

  await page.goto("/member", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toBeVisible({ timeout: 20_000 });

  // Either the account is linked (sections render) or it is not (the claim
  // prompt renders). Both are valid states; a blank page is not.
  const linked = page.locator(".mb-card");
  const claimPrompt = page.getByText("No member account linked");

  await expect
    .poll(async () => (await linked.count()) || (await claimPrompt.count()), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  if (await linked.count()) {
    // Every self-service section the member app promises is present.
    for (const heading of [
      "Membership",
      "Workout plans",
      "Training log",
      "Classes",
      "Progress photos",
      "Diet plans",
      "Measurements",
      "Attendance",
      "Payments",
      "Your data",
    ]) {
      await expect(
        page.locator(".mb-card h2", { hasText: new RegExp(`^${heading}$`) }),
        `${heading} section is rendered`,
      ).toHaveCount(1);
    }
  }

  expect(problems, "no uncaught errors").toEqual([]);
});

test("member app fits a phone without overflowing", async ({ page }) => {
  await page.goto("/member", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toBeVisible({ timeout: 20_000 });

  for (const size of [
    { tag: "390", width: 390, height: 844 },
    { tag: "768", width: 768, height: 900 },
  ]) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.waitForTimeout(150);

    const r = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));

    // A member app is used on a phone more than anything else; a horizontal
    // scrollbar here means a fixed width leaked in.
    expect(r.scrollW, `${size.tag} no horizontal overflow`).toBeLessThanOrEqual(
      r.clientW + 1,
    );
  }
});
