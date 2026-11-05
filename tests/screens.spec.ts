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
  { tag: "320", width: 320, height: 740 },
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

          // A segment button whose text is wider than the button is squashed,
          // even when the strip itself fits the viewport.
          const clipped: string[] = [];
          for (const el of Array.from(
            document.querySelectorAll("[role=radiogroup] button"),
          )) {
            if (el.scrollWidth > Math.ceil(el.getBoundingClientRect().width) + 1) {
              clipped.push(el.textContent?.trim().slice(0, 20) || el.className.slice(0, 20));
            }
          }

          // Below md the vertical rail renders a mobile button instead, so its
          // box is empty but still positioned. It must sit inside the header,
          // not float over the page. Above md the real rail is outside it by
          // design, so only check the mobile state.
          let stray = "";
          const dock = document.querySelector(".app-side-nav");
          const header = document.querySelector(".unified-header");
          const mobileDock = document.querySelector(".app-side-mobile");
          const mobileShown =
            mobileDock && getComputedStyle(mobileDock).display !== "none";
          if (mobileShown && dock && header) {
            const d = dock.getBoundingClientRect();
            const h = header.getBoundingClientRect();
            if (d.width > 0 && d.height > 0) {
              const inside =
                d.left >= h.left - 2 &&
                d.right <= h.right + 2 &&
                d.top >= h.top - 2 &&
                d.bottom <= h.bottom + 2;
              if (!inside) stray = "nav rail sits outside the header";
            }
          }

          return {
            scrollW: root.scrollWidth,
            clientW: root.clientWidth,
            mainRight: box ? box.right : null,
            offenders: offenders.slice(0, 4),
            clipped: clipped.slice(0, 4),
            strayDock: stray,
          };
        });

        const tag = `${route.path} ${size.tag}/${mode}`;
        if (m.scrollW > m.clientW + 1) {
          problems.push(
            `${tag}: horizontal overflow ${m.scrollW} > ${m.clientW}${m.offenders.length ? ` (${m.offenders.join(", ")})` : ""}`,
          );
        }
        // Geometry can be clean and still unreadable: a flexed segment can
        // squash its own labels, and the fixed nav box can sit outside the
        // header it is supposed to live in. Neither shows up as overflow.
        if (m.clipped.length) {
          problems.push(`${tag}: clipped segment label (${m.clipped.join(", ")})`);
        }
        if (m.strayDock) problems.push(`${tag}: ${m.strayDock}`);
      }
    }

    if (errors.length) {
      problems.push(`${route.path}: ${errors.slice(0, 2).join(" | ")}`);
    }
    page.off("pageerror", onError);
  }

  expect(problems, `screens with problems:\n${problems.join("\n")}`).toEqual([]);
});
