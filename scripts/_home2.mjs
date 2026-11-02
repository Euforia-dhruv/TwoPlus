// throwaway: call the same queries myHomePath uses, in the page
import { chromium } from "@playwright/test";

const base = process.env.AUDIT_URL || "http://localhost:5175";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').waitFor({ timeout: 20000 });
await page.fill('input[type="email"]', process.env.SHOT_EMAIL);
await page.fill('input[type="password"]', process.env.SHOT_PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
await page.waitForTimeout(2000);

const out = await page.evaluate(`(async () => {
  const mod = await import("/src/lib/supabase.ts");
  const sb = mod.getSupabase();
  const { data: user } = await sb.auth.getUser();
  const staff = await sb.from("organization_members").select("id, role").eq("user_id", user.user.id);
  const member = await sb.from("members").select("id, user_id").eq("user_id", user.user.id);
  return {
    uid: user.user?.id,
    staffRows: staff.data,
    staffError: staff.error?.message ?? null,
    memberRows: member.data,
    memberError: member.error?.message ?? null,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
