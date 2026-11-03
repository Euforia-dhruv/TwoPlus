import { test, expect } from "@playwright/test";
import { lockRemainingMs, pruneAttempts } from "../src/lib/attempt-limit";

// The storage layer needs a browser, but the window maths is pure: these cases
// pin the two things a caller can get wrong, an expired attempt counting
// towards a lock and the lock never releasing.

const T0 = 1_700_000_000_000;

test.describe("pruneAttempts", () => {
  test("keeps only attempts inside the last minute", () => {
    expect(pruneAttempts([T0 - 61_000, T0 - 30_000, T0], T0)).toEqual([T0 - 30_000, T0]);
  });

  test("drops timestamps from the future", () => {
    // A clock that jumped backwards must not extend a lock.
    expect(pruneAttempts([T0 + 5_000], T0)).toEqual([]);
  });
});

test.describe("lockRemainingMs", () => {
  test("is zero below the attempt ceiling", () => {
    expect(lockRemainingMs([], T0)).toBe(0);
    expect(lockRemainingMs([T0, T0, T0, T0], T0)).toBe(0);
  });

  test("locks for the remainder of the window once at the ceiling", () => {
    const times = [T0 - 45_000, T0 - 30_000, T0 - 20_000, T0 - 10_000, T0];
    expect(lockRemainingMs(times, T0)).toBe(15_000);
  });

  test("releases after the oldest attempt ages out", () => {
    const times = [T0 - 45_000, T0 - 30_000, T0 - 20_000, T0 - 10_000, T0];
    expect(lockRemainingMs(times, T0 + 15_000)).toBe(0);
  });

  test("ignores attempts older than the window when counting", () => {
    const times = [T0 - 120_000, T0 - 90_000, T0 - 70_000, T0 - 65_000, T0 - 61_000];
    expect(lockRemainingMs(times, T0)).toBe(0);
  });
});
