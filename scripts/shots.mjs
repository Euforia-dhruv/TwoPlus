// Screenshot harness. Signs in to the running dev server, then captures named
// workspace screens at each viewport in both modes.
//   SHOT_EMAIL=you@gym.com SHOT_PASS=secret node scripts/shots.mjs [baseUrl] [outDir]
//
// Screens are addressed by route, not by clicking: the side dock is icon-only
// and the secondary items live in a spotlight nav that only shows the current
// category, so route navigation is the only stable way to reach all of them.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = process.argv[3] ?? "screenshots";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;

// Mirrors src/lib/navigation.ts. Keep in step: the app's pathFor() builds
// /app/<category>/<item>, and these are the ids it uses.
const ROUTES = {
  overview: "/app/overview/overview",
  members: "/app/people/members",
  "trainers-staff": "/app/people/trainers-staff",
  attendance: "/app/operations/attendance",
  branches: "/app/operations/branches",
  "classes-pt": "/app/schedule/classes-pt",
  workouts: "/app/schedule/workouts",
  "diet-nutrition": "/app/schedule/diet-nutrition",
  community: "/app/communication/community",
  reminders: "/app/communication/reminders",
  payments: "/app/finance/payments",
  memberships: "/app/finance/memberships",
  invoices: "/app/finance/invoices",
  expenses: "/app/finance/expenses",
  payroll: "/app/finance/payroll",
  enquiries: "/app/growth/enquiries",
  "follow-ups": "/app/growth/follow-ups",
  reports: "/app/growth/reports",
  marketplace: "/app/growth/marketplace",
  settings: "/app/settings/settings",
  "access-roles": "/app/settings/access-roles",
  "member-app": "/app/settings/member-app",
  manual: "/app/settings/manual",
};

// SHOT_PAGES="members,payments" narrows the run; default covers four core
// screens. Modes is a comma list for the same reason. There is no style list:
// the app has one visual system, switched only by mode.
const PAGES = (process.env.SHOT_PAGES ?? "overview,members,payments,settings")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const MODES = (process.env.SHOT_MODES ?? "dark,light")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const unknown = PAGES.filter((p) => !ROUTES[p]);
if (unknown.length) {
  console.error(`unknown screen(s): ${unknown.join(", ")}\nknown: ${Object.keys(ROUTES).join(", ")}`);
  process.exit(1);
}

const browser = await chromium.launch();
const problems = [];

// One sign-in for the whole run: a fresh login per viewport would triple the
// slowest part and hammer the auth endpoint.
const ctx = await browser.newContext({ viewport: VIEWPORTS[0] ? { width: 1440, height: 900 } : undefined });
const page = await ctx.newPage();
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 160)}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
if (!(await page.locator('input[type="email"]').count())) {
  console.error("no login form at /login: is this the right base URL?");
  await browser.close();
  process.exit(1);
}
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"], button.auth-submit');
await page.waitForSelector(".app-side-nav", { timeout: 30_000 });
const storage = await ctx.storageState();
await ctx.close();

for (const vp of VIEWPORTS) {
  for (const mode of MODES) {
    const shot = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      storageState: storage,
    });
    const tab = await shot.newPage();
    tab.on("pageerror", (e) => problems.push(`${vp.name} ${mode} pageerror: ${e.message}`));
    tab.on("console", (m) => {
      if (m.type() === "error") problems.push(`${vp.name} ${mode} console: ${m.text().slice(0, 160)}`);
    });

    for (const name of PAGES) {
      await tab.goto(BASE + ROUTES[name], { waitUntil: "networkidle" });

      // Screenshot only once the workspace has finished loading, otherwise the
      // board shows "Loading your workspace..." and placeholder bars.
      await tab
        .waitForFunction(
          () =>
            !document.body.innerText.includes("Loading your workspace") &&
            !document.querySelector(".board-skeleton"),
          { timeout: 20_000 },
        )
        .catch(() => problems.push(`${vp.name} ${mode} ${name}: workspace never finished loading`));

      // Mode is a root dataset read by the stylesheet; setting it here keeps the
      // screenshot from writing the preference to the database.
      await tab.evaluate((m) => {
        document.documentElement.dataset.mode = m;
      }, mode);
      await tab.waitForTimeout(300);

      const overflow = await tab.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      if (overflow.scrollW > overflow.clientW + 1) {
        problems.push(
          `${vp.name} ${mode} ${name}: horizontal overflow ${overflow.scrollW} > ${overflow.clientW}`,
        );
      }

      await tab.screenshot({ path: `${OUT}/${vp.name}-${mode}-${name}.png`, fullPage: false });
    }

    await shot.close();
  }
}

await browser.close();

console.log(`screenshots -> ${OUT}`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "no page errors, no overflow");
process.exit(problems.length ? 1 : 0);
