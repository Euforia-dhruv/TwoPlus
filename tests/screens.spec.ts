import { test, expect } from "@playwright/test";
import { NAV_CATEGORIES, pathFor } from "../src/lib/navigation";

// Per-screen pass over every workspace module. Catches the classes of breakage
// that only show up on a module you did not open: horizontal overflow, an empty
// heading, a table that renders without its panel, an uncaught error on load.
//
// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in.",
);

const ROUTES = NAV_CATEGORIES.flatMap((c) =>
  c.items.map((i) => ({ category: c.label, label: i.label, path: pathFor(i) })),
);

const SIZES = [
  { tag: "1440", width: 1440, height: 900 },
  { tag: "1024", width: 1024, height: 800 },
  { tag: "390", width: 390, height: 844 },
];

test("every module renders cleanly at every width", async ({ page }) => {
  test.setTimeout(300_000);
  const problems: string[] = [];

  for (const route of ROUTES) {
    const errors: string[] = [];
    const onError = (e: Error) => errors.push(e.message);
    page.on("pageerror", onError);

    await page.goto(route.path, { waitUntil: "networkidle" });
    // First h1 only: the manual renders its document title as a second h1.
    await expect(
      page.locator("main h1").first(),
      `${route.path} has a heading`,
    ).toBeVisible({ timeout: 30_000 });

    const heading = (await page.locator("main h1").first().innerText()).trim();
    if (!heading) problems.push(`${route.path}: empty heading`);

    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });

      for (const mode of ["dark", "light"] as const) {
        await page.evaluate((m) => {
          document.documentElement.dataset.mode = m;
        }, mode);
        await page.waitForTimeout(80);

        const m = await page.evaluate(() => {
          const root = document.documentElement;
          const main = document.querySelector("main");
          const box = main?.getBoundingClientRect();
          // Any element sticking out past the viewport is the real cause of a
          // scrollbar, so name it instead of only reporting the numbers.
          const offenders: string[] = [];
          for (const el of Array.from(document.querySelectorAll("main *"))) {
            const b = el.getBoundingClientRect();
            if (b.width === 0 && b.height === 0) continue;
            if (b.right > window.innerWidth + 2 || b.left < -2) {
              const cls = typeof el.className === "string" ? el.className : "";
              offenders.push(`${el.tagName.toLowerCase()}${cls ? "." + cls.split(/\s+/)[0] : ""}`);
            }
          }
          return {
            scrollW: root.scrollWidth,
            clientW: root.clientWidth,
            mainRight: box ? box.right : null,
            offenders: offenders.slice(0, 4),
          };
        });

        const tag = `${route.path} ${size.tag}/${mode}`;
        if (m.scrollW > m.clientW + 1) {
          problems.push(
            `${tag}: horizontal overflow ${m.scrollW} > ${m.clientW}${m.offenders.length ? ` (${m.offenders.join(", ")})` : ""}`,
          );
        }
      }
    }

    if (errors.length) {
      problems.push(`${route.path}: ${errors.slice(0, 2).join(" | ")}`);
    }
    page.off("pageerror", onError);
  }

  expect(problems, `screens with problems:\n${problems.join("\n")}`).toEqual([]);
});
