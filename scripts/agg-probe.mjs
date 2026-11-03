// Does this project's PostgREST support server-side aggregation? If it does,
// the report sums can be computed by the database instead of by paging 10k rows
// into the browser and hoping the limit was never hit.
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

const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: pass }),
});
const { access_token } = await auth.json();
if (!access_token) {
  console.error("sign-in failed");
  process.exit(1);
}

async function probe(label, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${access_token}` },
  });
  const body = await res.text();
  console.log(`${label}: ${res.status} ${body.slice(0, 220)}`);
}

await probe("sum", "payments?select=amount_minor.sum()&limit=1");
await probe("count", "attendance?select=count");
await probe("group-month", "payments?select=month:paid_on&limit=3");
await probe("group-sum", "payments?select=paid_on,amount_minor.sum()&paid_on=gte.2026-01-01");
