// Reads the registry the same way scripts/_themes.mjs does, then reports what
// the audit will actually iterate plus whether the migration accepts every id.
import { readFileSync } from "node:fs";

const registry = [...readFileSync(new URL("../src/lib/theme.tsx", import.meta.url), "utf8")
  .matchAll(/\{ id: "([a-z0-9]+)"[^}]*?layout: "([a-z]+)"/g)]
  .map(([, id, layout]) => ({ id, layout }));

console.log("registry rows:", registry.length);
console.log("layouts:", registry.reduce((acc, s) => ((acc[s.layout] = (acc[s.layout] ?? 0) + 1), acc), {}));

const sql = readFileSync(new URL("../supabase/migrations/0006_member_crm.sql", import.meta.url), "utf8");
const start = sql.indexOf("organizations_theme_style_check");
const block = sql.slice(start, sql.indexOf("Tenancy anchors", start));
const allowed = [...block.matchAll(/'([a-z0-9]+)'/g)].map(([, v]) => v);

const missing = registry.filter((s) => !allowed.includes(s.id)).map((s) => s.id);
const extra = allowed.filter((v) => !registry.some((s) => s.id === v));
console.log("check constraint ids:", allowed.length);
console.log("missing from constraint:", missing.length ? missing.join(", ") : "none");
console.log("extra in constraint:", extra.length ? extra.join(", ") : "none");
process.exit(missing.length || extra.length ? 1 : 0);
