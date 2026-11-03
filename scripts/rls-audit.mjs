// Checks what the runbook asks a human to check, but offline: every table the
// migrations create must also have row level security enabled and at least one
// policy. A table with RLS off is readable by the anon key, which is public.
//
//   node scripts/rls-audit.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

const tables = new Set();
for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)) {
  tables.add(m[1]);
}

const rls = new Set();
for (const m of sql.matchAll(
  /alter\s+table\s+(?:only\s+)?public\.(\w+)\s+enable\s+row\s+level\s+security/gi,
)) {
  rls.add(m[1]);
}

const policies = new Set();
// Policy names are always quoted in these migrations: `create policy "x y" on ...`.
for (const m of sql.matchAll(/create\s+policy\s+(?:"[^"]*"|\S+)\s+on\s+public\.(\w+)/gi)) {
  policies.add(m[1]);
}

// Tables that intentionally have RLS on and no policy, so the only way in is a
// SECURITY DEFINER function. Each one has to state why; a table added here
// without a reason is the hole this script exists to catch.
const closedByDesign = {
  platform_admins: "read only through is_platform_admin()/platform_admin_role()",
  platform_plans: "read only through admin_* RPCs",
  org_subscriptions: "read only through admin_* RPCs",
  subscription_invoices: "read only through admin_* RPCs",
  subscription_payments: "read only through admin_* RPCs",
  admin_audit_log: "read only through admin_* RPCs; written by log_admin_action()",
  support_tickets: "read only through admin_* RPCs",
  org_member_counters: "written by the member-number generator only",
};

const missingRls = [...tables].filter((t) => !rls.has(t));
const missingPolicy = [...tables].filter(
  (t) => rls.has(t) && !policies.has(t) && !(t in closedByDesign),
);

console.log(`${tables.size} tables created in migrations`);
console.log(`  ${rls.size} with RLS enabled`);
console.log(`  ${policies.size} with at least one policy`);
console.log(`  ${Object.keys(closedByDesign).length} closed to the API by design`);

let bad = false;
if (missingRls.length) {
  bad = true;
  console.error(`\nRLS never enabled (readable by anon):\n  ${missingRls.join("\n  ")}`);
}
if (missingPolicy.length) {
  bad = true;
  console.error(`\nRLS on but no policy (readable by nobody):\n  ${missingPolicy.join("\n  ")}`);
}
if (!bad) console.log("\nOK: every table has RLS and a policy.");
process.exit(bad ? 1 : 0);
