// Responsive audit harness. Signs in, walks every route at every target width,
// and reports the things that actually break a layout: document overflow,
// elements wider than the viewport, and text clipped by its own box.
//
//   node scripts/responsive-audit.mjs [baseUrl]
//
// Writes a JSON report to screenshots/responsive-audit.json and prints a
// per-route summary. Exit code is 1 when any route overflows.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5173";
const EMAIL = process.env.SHOT_EMAIL;
const PASS = process.env.SHOT_PASS;
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

// The widths the brief names, minus duplicates.
const WIDTHS = [320, 360, 375, 390, 414, 430, 600, 768, 834, 1024, 1280, 1366, 1440, 1536, 1920, 2560];

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/app/overview/overview",
  "/app/people/members",
  "/app/people/trainers-staff",
  "/app/operations/attendance",
  "/app/operations/branches",
  "/app/schedule/classes-pt",
  "/app/schedule/workouts",
  "/app/schedule/diet-nutrition",
  "/app/communication/community",
  "/app/communication/reminders",
  "/app/finance/payments",
  "/app/finance/memberships",
  "/app/finance/invoices",
  "/app/finance/expenses",
  "/app/finance/payroll",
  "/app/growth/enquiries",
  "/app/growth/follow-ups",
  "/app/growth/reports",
  "/app/growth/marketplace",
  "/app/settings/settings",
  "/app/settings/access-roles",
  "/app/settings/member-app",
  "/app/settings/manual",
  "/member",
];

if (!EMAIL || !PASS) {
  console.error("Set SHOT_EMAIL and SHOT_PASS.");
  process.exit(2);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Sign in once; the session persists for every later navigation.
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
console.log("signed in:", new URL(page.url()).pathname);

// Measured inside the page: everything that means "this layout is broken".
const probe = () => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const offenders = [];
  const clipped = [];

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (cs.position === "fixed") continue;

    // An element sticking past the right edge, or pushed off the left.
    if (r.right > vw + 1 || r.left < -1) {
      // Ignore children of a deliberate horizontal scroller.
      let p = el.parentElement;
      let inScroller = false;
      while (p) {
        const pcs = getComputedStyle(p);
        if (pcs.overflowX === "auto" || pcs.overflowX === "scroll") { inScroller = true; break; }
        p = p.parentElement;
      }
      if (!inScroller) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 80),
          left: Math.round(r.left),
          right: Math.round(r.right),
          w: Math.round(r.width),
        });
      }
    }

    // Text that cannot fit its own box: scrollWidth beyond clientWidth with
    // no wrapping allowed.
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "auto" && cs.overflowX !== "scroll") {
      if (el.children.length === 0 && (el.textContent || "").trim()) {
        clipped.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
          over: el.scrollWidth - el.clientWidth,
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }
  }

  // De-duplicate identical offenders (a parent and its child report the same).
  const seen = new Set();
  const uniq = offenders.filter((o) => {
    const k = `${o.tag}.${o.cls}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    vw,
    docOverflow: doc.scrollWidth - vw,
    bodyOverflow: document.body.scrollWidth - vw,
    offenders: uniq.slice(0, 12),
    clipped: clipped.slice(0, 8),
  };
};

const report = [];
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  // Let layout settle (charts, fonts, lazy content).
  await page.waitForTimeout(350);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    await page.waitForTimeout(180);
    const m = await page.evaluate(probe);
    if (m.docOverflow > 1 || m.bodyOverflow > 1 || m.offenders.length || m.clipped.length) {
      report.push({ route, width, ...m });
    }
  }
  process.stdout.write(".");
}

writeFileSync(`${OUT}/responsive-audit.json`, JSON.stringify(report, null, 2));

// Summarise by route: worst overflow + offender count.
const byRoute = new Map();
for (const r of report) {
  const cur = byRoute.get(r.route) ?? { worst: 0, n: 0, widths: [] };
  cur.worst = Math.max(cur.worst, r.docOverflow, r.bodyOverflow);
  cur.n += r.offenders.length + r.clipped.length;
  cur.widths.push(r.width);
  byRoute.set(r.route, cur);
}

console.log("\n\nroute                              worst-overflow  issues  widths");
for (const [route, v] of byRoute) {
  console.log(`${route.padEnd(34)} ${String(v.worst + "px").padEnd(15)} ${String(v.n).padEnd(7)} ${v.widths.join(",")}`);
}

const bad = report.filter((r) => r.docOverflow > 1 || r.bodyOverflow > 1);
console.log(`\nroutes with problems: ${byRoute.size} / ${ROUTES.length}`);
console.log(`horizontal-overflow cases: ${bad.length}`);
await browser.close();
process.exit(bad.length ? 1 : 0);
