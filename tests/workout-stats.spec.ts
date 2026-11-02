import { test, expect } from "@playwright/test";
import { personalRecords, weeklyStreak } from "../src/lib/workout-stats";

// Pure functions, no browser: these run before any sign-in and need no
// environment variables, so they are the cheapest possible regression net for
// the numbers the member app shows.

test.describe("personalRecords", () => {
  test("keeps the heaviest set per exercise", () => {
    const records = personalRecords([
      {
        performed_on: "2026-03-02",
        sets: [
          { exercise_name: "Bench Press", set_number: 1, reps: 8, weight_kg: 60 },
          { exercise_name: "Bench Press", set_number: 2, reps: 5, weight_kg: 70 },
        ],
      },
      {
        performed_on: "2026-03-09",
        sets: [
          { exercise_name: "Bench Press", set_number: 1, reps: 3, weight_kg: 75 },
        ],
      },
    ]);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      exercise_name: "Bench Press",
      weight_kg: 75,
      reps: 3,
      performed_on: "2026-03-09",
    });
  });

  test("treats case and padding as the same exercise", () => {
    const records = personalRecords([
      {
        performed_on: "2026-04-01",
        sets: [{ exercise_name: "  squat ", set_number: 1, reps: 5, weight_kg: 100 }],
      },
      {
        performed_on: "2026-04-02",
        sets: [{ exercise_name: "Squat", set_number: 1, reps: 5, weight_kg: 110 }],
      },
    ]);

    expect(records).toHaveLength(1);
    expect(records[0].weight_kg).toBe(110);
    // The label stored is whichever row won, trimmed.
    expect(records[0].exercise_name).toBe("Squat");
  });

  test("ignores unweighted sets so bodyweight work is not a 0 kg record", () => {
    const records = personalRecords([
      {
        performed_on: "2026-05-01",
        sets: [
          { exercise_name: "Pull-up", set_number: 1, reps: 10, weight_kg: null },
          { exercise_name: "Pull-up", set_number: 2, reps: 10, weight_kg: 0 },
        ],
      },
    ]);

    expect(records).toEqual([]);
  });

  test("sorts heaviest first and survives an empty history", () => {
    const records = personalRecords([
      {
        performed_on: "2026-06-01",
        sets: [
          { exercise_name: "Deadlift", set_number: 1, reps: 5, weight_kg: 120 },
          { exercise_name: "Curl", set_number: 1, reps: 12, weight_kg: 15 },
        ],
      },
    ]);

    expect(records.map((r) => r.exercise_name)).toEqual(["Deadlift", "Curl"]);
    expect(personalRecords([])).toEqual([]);
  });
});

test.describe("weeklyStreak", () => {
  test("counts distinct training weeks, not sessions", () => {
    // Mon 2026-03-02 and Wed 2026-03-04 are the same week; 2026-03-09 is next.
    expect(
      weeklyStreak([
        { performed_on: "2026-03-02" },
        { performed_on: "2026-03-04" },
        { performed_on: "2026-03-09" },
      ]),
    ).toBe(2);
  });

  test("treats Sunday as the end of its week, not the start", () => {
    // 2026-03-08 is a Sunday; it belongs with Mon 2026-03-02.
    expect(weeklyStreak([{ performed_on: "2026-03-02" }, { performed_on: "2026-03-08" }])).toBe(1);
  });

  test("is zero with no sessions", () => {
    expect(weeklyStreak([])).toBe(0);
  });
});
