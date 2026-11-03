// Durable outbox for writes made while offline.
//
// Pure on purpose: storage is injected, there is no React, no Supabase and no
// global here, so the replay rules can be tested without a browser or network.
//
// Duplicate protection has two layers. In the outbox, re-enqueuing the same
// intent key replaces the pending copy instead of stacking a second one. On the
// server, every queued write is already idempotent for its natural key
// (workout_sessions is unique per member/day/assignment, saveMyMeasurement
// upserts on member/day, book_class returns the existing booking), so a replay
// after a crash between "sent" and "removed" cannot create a second row.

export type OpKind = "workout" | "measurement" | "class-book" | "class-cancel";

export type QueuedOp = {
  /** Identity of the intent, e.g. `measure:<member>:<date>`. Not the attempt. */
  key: string;
  kind: OpKind;
  /** Human name for the pending-sync list, set when the op is created. */
  label: string;
  payload: unknown;
  /** ISO timestamp of the first enqueue, kept when a later edit replaces it. */
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

export type QueueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Outbox = {
  list: () => QueuedOp[];
  enqueue: (op: {
    key: string;
    kind: OpKind;
    label?: string;
    payload: unknown;
  }) => QueuedOp[];
  remove: (key: string) => QueuedOp[];
  markFailed: (key: string, message: string) => QueuedOp[];
  clear: () => void;
};

export type FlushResult = { sent: number; remaining: number; error: string | null };

// A cap, not a budget: past this the device has been offline for weeks and
// silently dropping the oldest intent would lose recorded training. Enqueue
// throws instead, and the form shows the message.
const MAX_PENDING = 50;

export function createQueue(storage: QueueStorage, storageKey: string): Outbox {
  const list = (): QueuedOp[] => {
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // A half-written or older-build payload must not brick the app.
      return parsed.filter(
        (op): op is QueuedOp => Boolean(op) && typeof (op as QueuedOp).key === "string",
      );
    } catch {
      return [];
    }
  };

  const save = (ops: QueuedOp[]) => {
    try {
      storage.setItem(storageKey, JSON.stringify(ops));
    } catch {
      // Storage full or blocked: caching is an optimisation, never a crash.
    }
  };

  return {
    list,
    enqueue: ({ key, kind, label, payload }) => {
      const existing = list();
      const at = existing.findIndex((op) => op.key === key);
      if (at < 0 && existing.length >= MAX_PENDING) {
        throw new Error(
          "Too many changes are waiting to sync. Connect to the internet and let them send before adding more.",
        );
      }
      const op: QueuedOp = {
        key,
        kind,
        label: label ?? key,
        payload,
        createdAt: at >= 0 ? existing[at].createdAt : new Date().toISOString(),
        attempts: at >= 0 ? existing[at].attempts : 0,
        lastError: null,
      };
      const next = at >= 0 ? existing.map((o, i) => (i === at ? op : o)) : [...existing, op];
      save(next);
      return next;
    },
    remove: (key) => {
      const next = list().filter((op) => op.key !== key);
      save(next);
      return next;
    },
    markFailed: (key, message) => {
      const next = list().map((op) =>
        op.key === key ? { ...op, attempts: op.attempts + 1, lastError: message } : op,
      );
      save(next);
      return next;
    },
    clear: () => {
      try {
        storage.removeItem(storageKey);
      } catch {
        // Nothing to do: the caller is signing out either way.
      }
    },
  };
}

// Sends the outbox oldest-first. The first failure stops the run: replaying a
// later write past a stuck one could reorder a member's training log, and an
// op is only dropped once the server has confirmed it.
export async function flushQueue(
  queue: Outbox,
  handlers: Record<OpKind, (payload: unknown) => Promise<void>>,
): Promise<FlushResult> {
  let sent = 0;
  let error: string | null = null;

  for (const op of queue.list()) {
    try {
      await handlers[op.kind](op.payload);
      queue.remove(op.key);
      sent += 1;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      queue.markFailed(op.key, error);
      break;
    }
  }

  return { sent, remaining: queue.list().length, error };
}
