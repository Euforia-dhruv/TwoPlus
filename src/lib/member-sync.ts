// Glue between the member app and the offline layer: one outbox instance, the
// replay handlers, and the cache keys. Kept out of the component so the queue
// keeps draining while a form is unmounted.
import { useCallback, useEffect, useState } from "react";
import {
  bookClass,
  cancelClassBooking,
  logWorkout,
  saveMyMeasurement,
} from "./member-api";
import { isOfflineError, readCache, writeCache } from "./offline-cache";
import { createQueue, flushQueue, type OpKind, type QueuedOp } from "./sync-queue";

export const OUTBOX_KEY = "twoplus-outbox:v1";

export const memberOutbox = createQueue(window.localStorage, OUTBOX_KEY);

// What the member app caches. One signed-in account per device, and the cache
// is cleared on sign-out, so a single key per surface is enough.
export const CACHE = {
  member: "member:me",
  workouts: "workouts:me",
  diets: "diets:me",
  classes: "classes:me",
  sessions: "sessions:me",
  measurements: "measurements:me",
  attendance: "attendance:me",
  memberships: "memberships:me",
  payments: "payments:me",
} as const;

// A read that degrades to the last good copy instead of an empty screen. The
// `stale` flag lets the UI say so rather than pretending the data is current.
export async function cachedRead<T>(
  key: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; stale: boolean }> {
  try {
    const data = await read();
    writeCache(key, data);
    return { data, stale: false };
  } catch {
    const hit = readCache<T>(key);
    return hit ? { data: hit.data, stale: true } : { data: fallback, stale: false };
  }
}

const handlers: Record<OpKind, (payload: unknown) => Promise<void>> = {
  workout: async (p) => {
    await logWorkout(p as Parameters<typeof logWorkout>[0]);
  },
  measurement: async (p) => {
    await saveMyMeasurement(p as Parameters<typeof saveMyMeasurement>[0]);
  },
  "class-book": async (p) => {
    await bookClass(p as string);
  },
  "class-cancel": async (p) => {
    await cancelClassBooking(p as string);
  },
};

// Runs the write now if the network is there, otherwise parks it in the outbox.
// Only network failures are queued: a rejected write retried forever would hide
// the real error from the member.
export async function submitOrQueue(input: {
  key: string;
  kind: OpKind;
  label: string;
  payload: unknown;
  run: () => Promise<void>;
}): Promise<"sent" | "queued"> {
  try {
    await input.run();
    return "sent";
  } catch (e) {
    if (!isOfflineError(e)) throw e;
    memberOutbox.enqueue({
      key: input.key,
      kind: input.kind,
      label: input.label,
      payload: input.payload,
    });
    return "queued";
  }
}

// Outbox state for the UI: what is waiting, whether the browser thinks it is
// online, and a drain that runs on reconnect and on demand.
export function useOutbox() {
  const [ops, setOps] = useState<QueuedOp[]>(() => memberOutbox.list());
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [flushing, setFlushing] = useState(false);

  const drain = useCallback(async () => {
    if (!memberOutbox.list().length) return { sent: 0, remaining: 0, error: null };
    setFlushing(true);
    try {
      return await flushQueue(memberOutbox, handlers);
    } finally {
      setOps(memberOutbox.list());
      setFlushing(false);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void drain();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // A queued write from a previous visit should go out on the next load.
    if (navigator.onLine && memberOutbox.list().length) void drain();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [drain]);

  return { ops, online, flushing, drain, refresh: () => setOps(memberOutbox.list()) };
}
