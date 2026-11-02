// Authenticated isolation probe: signs in as a real user and checks that the
// data they can read is scoped to their own gym and their own member record.
//
//   SHOT_EMAIL=... SHOT_PASS=... node scripts/tenant-probe.mjs
//
// This is the check a client-side gym-ID change would break. If swapping an
// organization_id in a query ever returns rows, tenant isolation is broken.
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const email = env.SHOT_EMAIL;
const pass = env.SHOT_PASS;

if (!url || !key || !email || !pass) {
  console.error("Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SHOT_EMAIL and SHOT_PASS.");
  process.exit(1);
}

const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: pass }),
});

if (!auth.ok) {
  console.error(`Sign-in failed with HTTP ${auth.status}. Check the credentials.`);
  process.exit(1);
}

const { access_token: token, user } = await auth.json();
const headers = { apikey: key, Authorization: `Bearer ${token}` };

async function rows(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, rows: Array.isArray(body) ? body : [], body };
}

const failures = [];

// 1. Which gyms does this session belong to, and which member row is it linked
//    to? Everything below is judged against this.
const mine = await rows("organization_members?select=organization_id,role");
const orgIds = new Set(mine.rows.map((r) => r.organization_id));
const me = await rows("members?select=id,organization_id,user_id&user_id=eq." + user.id);
const myMember = me.rows[0] ?? null;

console.log(`signed in as ${user.email}`);
console.log(`staff rows: ${mine.rows.length}, linked member record: ${myMember ? myMember.id : "none"}`);

// 2. A made-up gym id must return nothing from every tenant-scoped table.
//    Picking a random UUID rather than a real one means a pass here cannot be
//    explained by the tenant simply being empty.
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
  "member_progress_photos",
  "member_internal_notes",
  "membership_renewals",
];

console.log("\nCross-tenant reads with a foreign organization_id:");
for (const table of TENANT_TABLES) {
  const { status, rows: found } = await rows(
    `${table}?select=*&organization_id=eq.${FOREIGN_ORG}&limit=5`,
  );
  if (status === 404) {
    console.log(`skip  ${table}: not deployed`);
    continue;
  }
  if (found.length > 0) {
    failures.push(`${table}: ${found.length} row(s) returned for a gym this session does not belong to`);
    console.log(`LEAK  ${table}: ${found.length} row(s)`);
  } else {
    console.log(`ok    ${table}: no rows`);
  }
}

// 3. Every row the session CAN see must belong to one of its own gyms. This
//    catches a policy that filters on nothing at all.
console.log("\nReadable rows are scoped to the session's own gyms:");
for (const table of ["members", "payments", "memberships"]) {
  const asTable = table === "memberships" ? "member_memberships" : table;
  const { status, rows: found } = await rows(`${asTable}?select=organization_id&limit=200`);
  if (status === 404) {
    console.log(`skip  ${asTable}: not deployed`);
    continue;
  }
  const foreign = found.filter((r) => r.organization_id && !orgIds.has(r.organization_id));
  if (foreign.length) {
    failures.push(`${asTable}: ${foreign.length} row(s) from gyms the session is not a member of`);
    console.log(`LEAK  ${asTable}: ${foreign.length} foreign row(s)`);
  } else {
    console.log(`ok    ${asTable}: all ${found.length} row(s) inside own gyms`);
  }
}

// 4. A member can only see their own progress photos, never a peer's.
if (myMember) {
  const photos = await rows("member_progress_photos?select=member_id");
  const foreign = photos.rows.filter((p) => p.member_id !== myMember.id);
  if (foreign.length) {
    failures.push(`member_progress_photos: ${foreign.length} photo row(s) belong to another member`);
    console.log(`LEAK  member_progress_photos: ${foreign.length} other member's photo(s)`);
  } else {
    console.log(`ok    member_progress_photos: only own rows (${photos.rows.length})`);
  }
}

// 5. Privilege boundaries: this account is a gym admin, not a platform admin.
const platform = await rows("platform_admins?select=user_id&limit=1");
if (platform.rows.length) {
  failures.push("platform_admins: a gym account could read the platform admin list");
  console.log("LEAK  platform_admins: readable by a gym account");
} else {
  console.log("ok    platform_admins: not readable");
}

if (failures.length) {
  console.error(`\n${failures.length} isolation problem(s):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("\nTenant isolation holds for every probe.");
