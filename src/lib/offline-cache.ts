// Last-known-good copies of the member app's reads, so a gym with no signal
// still shows the plan the member walked in with.
//
// Everything here is opt-in per member id and versioned: a shape change ships
// a new key instead of crashing on an old payload.

export type CacheEntry<T> = { savedAt: string; data: T };

const PREFIX = "twoplus-cache:v1:";

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Private mode or a blocked origin: caching is optional, never fatal.
    return null;
  }
}

export function readCache<T>(key: string): CacheEntry<T> | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed && typeof parsed.savedAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // Quota exceeded: drop the oldest-looking key and move on rather than throw.
    try {
      s.removeItem(PREFIX + key);
    } catch {
      // Nothing else to try.
    }
  }
}

export function clearCache(): void {
  const s = store();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i += 1) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    // Nothing to clear.
  }
}

// True when a failure looks like "the network is gone" rather than "the server
// said no". Queueing a rejected write would retry a validation error forever,
// so this gate decides whether to store it for later or show the real message.
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|networkerror|network request failed|fetch failed|load failed|err_internet_disconnected|err_network/i.test(
    message,
  );
}
