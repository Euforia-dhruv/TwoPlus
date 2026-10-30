// Neumorphic theme audit: contrast (alpha-composited), tap targets, overflow.
//   SHOT_EMAIL=... SHOT_PASS=... node scripts/_audit.mjs
import { chromium } from "@playwright/test";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1100", width: 1100, height: 800 },
  { name: "820", width: 820, height: 800 },
  { name: "390", width: 390, height: 844 },
];
const PAGES = ["Overview", "Members", "Settings"];

const browser = await chromium.launch();
const problems = [];

function audit() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((n) => parseFloat(n));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bot) => ({
    r: top.r * top.a + bot.r * (1 - top.a),
    g: top.g * top.a + bot.g * (1 - top.a),
    b: top.b * top.a + bot.b * (1 - top.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  // Composite every ancestor background, bottom-up.
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none") return null; // gradient/photo: can't sample
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) stack.push(c);
      if (c && c.a === 1) break;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };

  const fails = [];
  for (const el of document.querySelectorAll("body *")) {
    const txt = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ");
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;

    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!fg || !bg) continue;
    const comp = over(fg, bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseFloat(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(comp, bg);
    if (got < need) {
      fails.push({
        text: txt.slice(0, 32),
        cls: el.className && typeof el.className === "string" ? el.className.slice(0, 40) : "",
        ratio: Math.round(got * 100) / 100,
        need,
      });
    }
  }

  const small = [];
  for (const el of document.querySelectorAll("button, a[href], input, select, [role=button]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (getComputedStyle(el).visibility === "hidden") continue;
    if (r.height < 36 || r.width < 36) {
      small.push({
        el: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
  }

  return {
    fails,
    small,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
}

for (const vp of VIEWPORTS) {
  for (const mode of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.push(`${vp.name}/${mode} pageerror: ${e.message}`));

    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    if (await page.locator('input[type="email"]').count()) {
      await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
      await page.fill('input[type="password"]', process.env.SHOT_PASS);
      await page.click('button[type="submit"]');
      await page.waitForSelector(".app", { timeout: 20000 });
    }
    await page
      .waitForFunction(() => !document.body.innerText.includes("Loading your workspace"), {
        timeout: 15000,
      })
      .catch(() => problems.push(`${vp.name}/${mode}: workspace never loaded`));

    await page.evaluate(
      ([m, s]) => {
        document.documentElement.dataset.style = s;
        document.documentElement.dataset.mode = m;
      },
      [mode, process.env.AUDIT_STYLE || "classic"]
    );
    await page.waitForTimeout(350);

    for (const name of PAGES) {
      const btn = page.locator(`.floating-rail button[aria-label="${name}"]`);
      if (await btn.count()) {
        await btn.first().click({ force: true });
      } else {
        await page.locator('.floating-rail button[aria-label="More sections"]').click({ force: true });
        await page.waitForTimeout(200);
        await page.locator(`.rail-more-menu button:text-is("${name}")`).first().click({ force: true });
      }
      await page.waitForTimeout(350);

      const r = await page.evaluate(audit);
      if (r.fails.length) console.log(`${vp.name}/${mode} ${name} CONTRAST`, JSON.stringify(r.fails));
      if (r.small.length) console.log(`${vp.name}/${mode} ${name} TARGETS`, JSON.stringify(r.small));
      if (r.scrollW > r.clientW + 1) {
        problems.push(`${vp.name}/${mode} ${name}: overflow ${r.scrollW} > ${r.clientW}`);
      }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "no page errors, no overflow");
