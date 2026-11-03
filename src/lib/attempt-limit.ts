// Client-side attempt limiting for the credential screens.
//
// This is not a security boundary: whoever runs the client can clear storage.
// The real limits are Supabase Auth's server-side quotas. What this does is
// stop run-away repeats from one browser (a stuck submit button, a shared gym
// tablet, a password-typing loop) and turn the provider's bare error into a
// visible wait. Growth beyond this belongs at the edge.

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const KEY_PREFIX = "twoplus.attempts.";

// Pure core: everything below the storage layer is testable without a browser.
export function pruneAttempts(times: number[], now: number): number[] {
  return times.filter((t) => t <= now && now - t < WINDOW_MS);
}

export function lockRemainingMs(times: number[], now: number): number {
  const recent = pruneAttempts(times, now);
  if (recent.length < MAX_ATTEMPTS) return 0;
  return Math.max(0, WINDOW_MS - (now - Math.min(...recent)));
}

function read(key: string): number[] {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number")
      : [];
  } catch {
    return [];
  }
}

function write(key: string, times: number[]): void {
  try {
    if (times.length) window.localStorage.setItem(KEY_PREFIX + key, JSON.stringify(times));
    else window.localStorage.removeItem(KEY_PREFIX + key);
  } catch {
    // Private mode or a full quota: the in-memory code path already returned.
  }
}

/** Milliseconds the caller must wait before trying this key again. 0 means go. */
export function attemptLockMs(key: string, now = Date.now()): number {
  return lockRemainingMs(read(key), now);
}

/** Record one failed attempt. Call after the request fails, not before. */
export function noteAttempt(key: string, now = Date.now()): void {
  write(key, [...pruneAttempts(read(key), now), now]);
}

/** Forget the history for a key, so a success does not penalise the next visit. */
export function clearAttempts(key: string): void {
  write(key, []);
}

/** The message shown while locked out, in the app's voice. */
export function lockMessage(waitMs: number): string {
  return `Too many attempts. Try again in ${Math.ceil(waitMs / 1000)} seconds.`;
}
