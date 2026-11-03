import { test, expect, type Page } from "@playwright/test";

// The owner journey as one continuous flow, because that is how a gym actually
// onboards someone: add them, put them on a plan, renew the plan, check them in.
// Each step is verified after a reload, so a write that only updated React
// state (or was silently rejected by RLS) cannot pass as success.
//
// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in.",
);

const stamp = Date.now();
const NAME = `Journey ${stamp}`;
const EMAIL = `journey-${stamp}@example.com`;
const PHONE = `+9199${String(stamp).slice(-8)}`;

const iso = (daysAhead: number) =>
  new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);

async function openMember(page: Page, name: string) {
  await page.goto("/app/people/members", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toHaveText("Members");
  await page.getByLabel("Search members").fill(name);
  const card = page.locator(".member-card", { hasText: name });
  await expect(card).toHaveCount(1, { timeout: 20_000 });
  return card;
}

// The drawer prints "Valid until" in whatever format the workspace uses, so the
// gate compares the value before and after rather than hard-coding a format.
async function validUntil(page: Page): Promise<string> {
  const line = page
    .locator(".profile-drawer .detail-line")
    .filter({ hasText: "Valid until" });
  return (await line.locator("strong").innerText()).trim();
}

test("owner journey: add, assign, renew, check in", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));

  // 0. This journey writes real rows. If the signed-in role is read-only, skip
  //    loudly rather than letting the first assertion fail for the wrong reason.
  await page.goto("/app/people/members", { waitUntil: "networkidle" });
  const addButton = page.getByRole("button", { name: "Add member", exact: true }).first();
  test.skip(!(await addButton.isEnabled()), "This signed-in role cannot add members.");

  // 1. Add the member from the directory, with a plan attached in the same
  //    form, which is what the modal does: create the member, then assign.
  await addButton.click();
  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();
  await modal.locator('input[name="name"]').fill(NAME);
  await modal.locator('input[name="email"]').fill(EMAIL);
  await modal.locator('input[name="phone"]').fill(PHONE);

  // Use whichever plan this workspace actually has rather than a fixed name,
  // so the gate survives a renamed or added plan. With no plan at all the
  // member is created unassigned and the renewal step is skipped below.
  const planSelect = modal.locator('select[name="plan"]');
  const planAssigned = (await planSelect.locator("option").count()) > 1;
  if (planAssigned) await planSelect.selectOption({ index: 1 });

  await modal.locator('input[name="expires"]').fill(iso(30));
  await modal.locator('button[type="submit"]').click();

  await expect(page.locator(".toast")).toContainText("Member saved", {
    timeout: 20_000,
  });
  await expect(modal).toHaveCount(0);

  // 2. The record is in the database: a fresh load, a fresh query, the card.
  const card = await openMember(page, NAME);
  await expect(card).toContainText(PHONE);

  // 3. Renew the plan, then prove the new expiry survived a reload.
  await card.getByRole("button", { name: "View profile" }).click();
  const drawer = page.locator(".profile-drawer");
  // The drawer has one h2 per section, so the name is the one in the hero.
  await expect(drawer.locator(".profile-hero h2")).toHaveText(NAME);

  if (planAssigned) {
    const before = await validUntil(page);

    await drawer.getByRole("button", { name: "Renew membership" }).click();
    const renew = page.locator(".modal");
    await expect(renew).toBeVisible();
    await renew.locator('input[name="expires"]').fill(iso(120));
    await renew.locator('button[type="submit"]').click();
    await expect(page.locator(".toast")).toContainText("Membership renewed", {
      timeout: 20_000,
    });
    await expect(page.locator(".modal")).toHaveCount(0);

    await drawer.locator('button[aria-label="Close member profile"]').click();
    const renewed = await openMember(page, NAME);
    await renewed.getByRole("button", { name: "View profile" }).click();
    await expect(page.locator(".profile-drawer .profile-hero h2")).toHaveText(NAME);
    expect(await validUntil(page), "expiry moved to the renewed date").not.toBe(before);
    await page.locator('.profile-drawer button[aria-label="Close member profile"]').click();
  } else {
    await drawer.locator('button[aria-label="Close member profile"]').click();
  }

  // 4. Check them in. This writes an attendance row and lands on Attendance.
  await page.goto("/app/operations/attendance", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toHaveText("Attendance");
  await page.getByRole("button", { name: "Check in member" }).first().click();

  const checkIn = page.locator(".modal");
  await expect(checkIn).toBeVisible();
  await checkIn.locator('select[name="member"]').selectOption({ label: NAME });
  await checkIn.locator('button[type="submit"]').click();
  await expect(page.locator(".toast")).toContainText("Check-in recorded", {
    timeout: 20_000,
  });

  // 5. The visit is on record after a reload.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(NAME).first()).toBeVisible({ timeout: 20_000 });

  // 6. Clean up without deleting: archive the member this run created. HoldButton
  //    submits on keyboard activation, which is also the accessible path.
  const again = await openMember(page, NAME);
  await again.getByRole("button", { name: `More actions for ${NAME}` }).click();
  await page.getByRole("menuitem", { name: "Archive member" }).click();
  const archive = page.locator(".modal");
  await expect(archive).toBeVisible();
  await archive.locator("button.hold").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".toast")).toContainText("Member archived", {
    timeout: 20_000,
  });

  expect(problems, "no uncaught errors").toEqual([]);
});
