/**
 * Date and text helpers shared by screens.
 *
 * Kept separate from data.ts because these are pure and cheap to test, and
 * because dates arrive from Postgres as `YYYY-MM-DD` or a full timestamp and
 * need different treatment in each case.
 */

/** "2026-11-04" -> "4 Nov" (no year: a member app is almost always this year). */
export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function longDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
}

export function clockTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Whole days from `from` to `to`, floored. Negative when `to` is in the past. */
export function daysBetween(from: string | Date, to: string | Date) {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function daysLeft(endDate: string | null) {
  if (!endDate) return null;
  return daysBetween(new Date(), endDate);
}

/**
 * Consecutive days the member has trained, counting back from today.
 *
 * A rest day breaks the streak, which is the honest definition for a gym app:
 * counting calendar weeks would tell a member they are "on a streak" after one
 * visit. Returns 0 when there is no attendance today or yesterday.
 */
export function streakFrom(checkIns: string[]) {
  const days = new Set(checkIns.map((iso) => iso.slice(0, 10)));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

  if (!days.has(today) && !days.has(yesterday)) return 0;

  let cursor = days.has(today) ? now : new Date(now.getTime() - 86_400_000);
  let count = 0;
  for (let i = 0; i < 400; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    count++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}

export function initials(first: string | null, last: string | null) {
  return `${(first ?? "").trim().charAt(0)}${(last ?? "").trim().charAt(0)}`.toUpperCase() || "?";
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Title-cases the enum values the database stores in lower case. */
export function humanise(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
