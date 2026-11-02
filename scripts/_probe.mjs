// throwaway: read-only schema probe against the live project.
// Missing table -> 404/PGRST205; missing column -> 400/42703. RLS returning
// an empty array still proves the object exists.
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const checks = [
  ["organizations", "id,theme_mode,status"],
  ["organizations", "theme_style"],
  ["org_subscriptions", "id,status"],
  ["platform_plans", "id"],
  ["admin_audit_log", "id"],
  ["support_tickets", "id"],
  ["member_workout_assignments", "id"],
  ["member_diet_assignments", "id"],
  ["fitness_measurements", "id"],
  ["member_progress_photos", "id"],
  ["member_internal_notes", "id"],
  ["membership_renewals", "id"],
  ["workout_plans", "id"],
  ["diet_plans", "id"],
  ["classes", "id"],
  ["class_bookings", "id"],
  ["equipment", "id"],
  ["announcements", "id"],
  ["messages", "id"],
];

for (const [table, cols] of checks) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(cols)}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.text();
  let note = "";
  if (!res.ok) {
    try {
      const j = JSON.parse(body);
      note = `${j.code ?? ""} ${j.message ?? ""}`.slice(0, 70);
    } catch {
      note = body.slice(0, 70);
    }
  }
  console.log(`${String(res.status).padEnd(4)} ${table}(${cols})${note ? " :: " + note : ""}`);
}
