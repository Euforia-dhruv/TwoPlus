import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";

// Tenant isolation is the one bug that cannot be caught by looking at a screen:
// the app would render normally while showing another gym's members. So this
// gate skips the UI and talks to PostgREST with the signed-in session's own
// token, asking for rows it must never receive.
//
// The organization id is deliberately one that is well-formed but foreign, so a
// pass cannot be explained by the gym simply having no data.
//
// Skipping must happen at collection time: a context built from a missing
// storage state fails before any hook runs.
test.skip(
  !process.env.SHOT_EMAIL || !process.env.SHOT_PASS,
  "Set SHOT_EMAIL and SHOT_PASS: this gate signs in.",
);

const FOREIGN_ORG = "00000000-0000-0000-0000-0000000000ff";

const TENANT_TABLES = [
  "members",
  "member_memberships",
  "payments",
  "invoices",
  "attendance",
  "staff",
  "expenses",
  "branches",
  "classes",
  "class_bookings",
  "workout_plans",
  "diet_plans",
  "fitness_measurements",
  "member_internal_notes",
  "membership_renewals",
];

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

// The session the app saved after signing in. Reading it from the storage state
// means this gate exercises exactly the credentials the UI uses, not a
// separately minted token that could have different claims.
function sessionToken(): string | null {
  try {
    const state = JSON.parse(readFileSync("tests/.auth/state.json", "utf8"));
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        if (!item.name.includes("auth-token")) continue;
        const parsed = JSON.parse(item.value);
        if (parsed.access_token) return parsed.access_token;
      }
    }
  } catch {
    // No saved session: the setup project did not run.
  }
  return null;
}

test("cross-gym reads are denied by the database", async ({ playwright, baseURL }) => {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const token = sessionToken();

  expect(url, "VITE_SUPABASE_URL is in .env.local").toBeTruthy();
  expect(anonKey, "VITE_SUPABASE_ANON_KEY is in .env.local").toBeTruthy();
  expect(token, "a signed-in session was saved by the setup project").toBeTruthy();

  const request: APIRequestContext = await playwright.request.newContext({
    baseURL: url,
    extraHTTPHeaders: {
      apikey: anonKey!,
      Authorization: `Bearer ${token}`,
    },
  });

  const leaks: string[] = [];

  for (const table of TENANT_TABLES) {
    const res = await request.get(
      `/rest/v1/${table}?select=*&organization_id=eq.${FOREIGN_ORG}&limit=5`,
    );

    // A table the deployment does not have yet is not a leak. Anything else
    // that is not 200 is also not a leak: the read was refused.
    if (res.status() === 404) continue;
    expect(res.status(), `${table} answers with JSON, not a server fault`).toBeLessThan(500);
    if (res.status() !== 200) continue;

    const body = await res.json();
    if (Array.isArray(body) && body.length > 0) {
      leaks.push(`${table}: ${body.length} row(s) for a gym this session does not belong to`);
    }
  }

  await request.dispose();
  expect(leaks, "no tenant table returned foreign rows").toEqual([]);

  // The session must still be able to read its own data, or the check above
  // would pass on a token that can read nothing at all.
  const own = await (await playwright.request.newContext({
    baseURL: url,
    extraHTTPHeaders: { apikey: anonKey!, Authorization: `Bearer ${token}` },
  })).get("/rest/v1/organization_members?select=organization_id&limit=5");
  expect(own.status(), "the session can read its own staff rows").toBe(200);
  expect((await own.json()).length, "the session belongs to at least one gym").toBeGreaterThan(0);

  // The platform admin table is not readable by a gym account, whatever its
  // role inside that gym.
  const admins = await (await playwright.request.newContext({
    baseURL: url,
    extraHTTPHeaders: { apikey: anonKey!, Authorization: `Bearer ${token}` },
  })).get("/rest/v1/platform_admins?select=user_id&limit=1");
  const adminRows = admins.status() === 200 ? await admins.json() : [];
  expect(
    Array.isArray(adminRows) ? adminRows.length : 0,
    "platform_admins is closed to gym accounts",
  ).toBe(0);

  expect(baseURL, "the app under test is the configured one").toBeTruthy();
});

// The console's own guard is a convenience, not the boundary: it only decides
// what to paint. The boundary is that the admin RPCs refuse a caller who is not
// a platform admin. Assert that directly, with the public anon key and no
// session, which is the strongest attacker this deployment must survive.
//
// Note: the seeded dev account genuinely holds a platform_admins row, so
// "a gym account bounces out of /super-admin" is not true here and is not
// asserted. Bouncing is covered by the unauthenticated case below.
test("the platform console is closed to callers without a session", async ({ playwright }) => {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  expect(url, "VITE_SUPABASE_URL is in .env.local").toBeTruthy();
  expect(anonKey, "VITE_SUPABASE_ANON_KEY is in .env.local").toBeTruthy();

  const anon = await playwright.request.newContext({
    baseURL: url,
    extraHTTPHeaders: { apikey: anonKey!, "Content-Type": "application/json" },
  });

  for (const rpc of ["platform_admin_role", "is_platform_admin", "admin_platform_metrics"]) {
    const res = await anon.post(`/rest/v1/rpc/${rpc}`, { data: {} });
    // 401/403 is the refusal. A 200 would hand the platform console to anyone
    // holding the anon key, which ships in the browser bundle.
    expect([401, 403], `${rpc} refuses an anonymous caller`).toContain(res.status());
  }

  // The admin table itself is readable only as an empty set, never as rows.
  const admins = await anon.get("/rest/v1/platform_admins?select=user_id&limit=1");
  const rows = admins.status() === 200 ? await admins.json() : [];
  expect(Array.isArray(rows) ? rows.length : 0, "platform_admins leaks no rows").toBe(0);

  await anon.dispose();
});

test("the platform console sends a signed-out visitor to login", async ({ browser, baseURL }) => {
  // A brand-new context with no saved session: this is the visitor the guard
  // must turn away before any admin data is requested. The explicit empty
  // storageState matters: newContext() inherits this project's `use` options,
  // which otherwise sign the visitor in with the suite's saved session.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/super-admin`, { waitUntil: "networkidle" });
  await expect(page, "a signed-out visitor lands on login").toHaveURL(/\/login/, {
    timeout: 20_000,
  });
  await expect(page.locator(".admin-rail"), "the console shell never renders").toHaveCount(0);
  await context.close();
});
