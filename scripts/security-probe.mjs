// Security probe: proves the live database refuses anonymous reads on every
// table it should, using only the public anon key (the weakest credential the
// app ships with). A 200 with rows here means RLS is off and the data is public.
//
//   node scripts/security-probe.mjs
//
// Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
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

if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or add a .env.local).");
  process.exit(1);
}

// Tables that must never be readable without a signed-in session. Anything
// holding member, money, staff or tenant data belongs here.
const MUST_BE_PRIVATE = [
  "members",
  "member_memberships",
  "member_progress_photos",
  "member_internal_notes",
  "fitness_measurements",
  "payments",
  "invoices",
  "attendance",
  "staff",
  "expenses",
  "payroll",
  "organizations",
  "organization_members",
  "branches",
  "classes",
  "class_bookings",
  "workout_plans",
  "diet_plans",
  "member_workout_assignments",
  "member_diet_assignments",
  "membership_renewals",
  "workout_sessions",
  "workout_sets",
  // Platform-wide tables: reachable only through SECURITY DEFINER RPCs.
  "platform_admins",
  "platform_plans",
  "org_subscriptions",
  "subscription_invoices",
  "subscription_payments",
  "admin_audit_log",
  "support_tickets",
];

// RPCs that must not be callable by an anonymous visitor.
const PROTECTED_RPCS = [
  "claim_member_account",
  "book_class",
  "cancel_class_booking",
  "class_seats",
];

const failures = [];

async function anonRead(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = res.ok ? await res.json().catch(() => null) : null;
  return { status: res.status, rows: Array.isArray(rows) ? rows.length : 0 };
}

for (const table of MUST_BE_PRIVATE) {
  const { status, rows } = await anonRead(table);
  // A 404 means the table does not exist in this project (some migrations are
  // still unapplied). That is not a leak, so it is reported but not failed.
  if (status === 404) {
    console.log(`skip  ${table}: not present in this project`);
    continue;
  }
  if (status === 200 && rows > 0) {
    failures.push(`${table}: anon read returned ${rows} row(s) — RLS is not protecting it`);
    console.log(`LEAK  ${table}: ${rows} row(s) readable anonymously`);
  } else if (status >= 500) {
    failures.push(`${table}: probe failed with HTTP ${status}`);
    console.log(`ERROR ${table}: HTTP ${status}`);
  } else {
    console.log(`ok    ${table}: anonymous read denied (HTTP ${status})`);
  }
}

for (const fn of PROTECTED_RPCS) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_class_id: "00000000-0000-0000-0000-000000000000" }),
  });
  // 404 here means the function is not deployed yet (its migration is
  // unapplied), which is not the same as it refusing the caller. Reporting both
  // as "refused" would give false assurance about a function that does not
  // exist.
  if (res.status === 404) {
    console.log(`skip  rpc ${fn}: not deployed in this project`);
  } else if (res.ok) {
    failures.push(`rpc ${fn}: callable anonymously`);
    console.log(`LEAK  rpc ${fn}: callable without a session`);
  } else {
    console.log(`ok    rpc ${fn}: refused (HTTP ${res.status})`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} security problem(s):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("\nAll probed tables and RPCs refuse anonymous access.");
