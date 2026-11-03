import { test, expect } from "@playwright/test";
import { createQueue, flushQueue, type QueuedOp } from "../src/lib/sync-queue";

// The outbox is pure (storage is injected), so these run with no browser and no
// network. They cover the two things that would lose a member's data: a replay
// that duplicates a write, and a queue that drops one silently.

function memStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const KEY = "outbox:test";

test.describe("outbox", () => {
  test("re-enqueuing the same intent replaces it instead of stacking", () => {
    const q = createQueue(memStorage(), KEY);
    q.enqueue({ key: "workout:2026-03-02", kind: "workout", payload: { sets: 1 } });
    q.enqueue({ key: "workout:2026-03-02", kind: "workout", payload: { sets: 2 } });

    const ops = q.list();
    expect(ops).toHaveLength(1);
    // The newer payload wins: the member edited the same day's entry.
    expect(ops[0].payload).toEqual({ sets: 2 });
  });

  test("keeps the original createdAt when an intent is replaced", () => {
    const q = createQueue(memStorage(), KEY);
    q.enqueue({ key: "measure:2026-03-02", kind: "measurement", payload: {} });
    const first = q.list()[0].createdAt;
    q.enqueue({ key: "measure:2026-03-02", kind: "measurement", payload: {} });

    // Ordering on replay is by first intent, not by last edit.
    expect(q.list()[0].createdAt).toBe(first);
  });

  test("a successful send removes the op and a failure keeps it with the error", async () => {
    const q = createQueue(memStorage(), KEY);
    q.enqueue({ key: "a", kind: "workout", payload: {} });
    q.enqueue({ key: "b", kind: "measurement", payload: {} });

    const result = await flushQueue(q, {
      workout: async () => {},
      measurement: async () => {
        throw new Error("offline");
      },
      "class-book": async () => {},
      "class-cancel": async () => {},
    });

    // Stops at the failure: replaying past a stuck write could reorder history.
    expect(result).toMatchObject({ sent: 1, remaining: 1, error: "offline" });
    expect(q.list()[0].key).toBe("b");
    expect(q.list()[0].attempts).toBe(1);
    expect(q.list()[0].lastError).toBe("offline");
  });

  test("survives a corrupt payload instead of throwing", () => {
    const s = memStorage();
    s.setItem(KEY, "{not json");
    expect(createQueue(s, KEY).list()).toEqual([]);

    s.setItem(KEY, JSON.stringify([{ nope: true }, { key: "ok", kind: "workout" }]));
    const ops = createQueue(s, KEY).list();
    expect(ops).toHaveLength(1);
    expect(ops[0].key).toBe("ok");
  });

  test("refuses to grow past the cap rather than dropping the oldest", () => {
    const q = createQueue(memStorage(), KEY);
    for (let i = 0; i < 50; i += 1) {
      q.enqueue({ key: `op-${i}`, kind: "workout", payload: {} });
    }
    expect(() => q.enqueue({ key: "op-50", kind: "workout", payload: {} })).toThrow(
      /too many changes/i,
    );
    // Replacing an existing key is still allowed at the cap.
    expect(() => q.enqueue({ key: "op-0", kind: "workout", payload: {} })).not.toThrow();
  });

  test("labels fall back to the key so the pending list is never blank", () => {
    const q = createQueue(memStorage(), KEY);
    q.enqueue({ key: "class-book:abc", kind: "class-book", payload: "abc" });
    const [op] = q.list() as QueuedOp[];
    expect(op.label).toBe("class-book:abc");
  });
});
