// Pure workout statistics. Kept free of Supabase imports so it can be unit
// tested without a browser session or environment variables.

export type SessionForStats = {
  performed_on: string;
  sets: {
    exercise_name: string;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
  }[];
};

export type PersonalRecord = {
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  performed_on: string;
};

// The heaviest single set ever logged per exercise, compared case- and
// whitespace-insensitively so "Bench Press" and "bench press " are one lift.
// Sets with no weight (bodyweight work) are skipped: a 0 kg record is not a
// personal best.
export function personalRecords(sessions: SessionForStats[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.weight_kg == null || set.weight_kg <= 0) continue;
      const key = set.exercise_name.trim().toLowerCase();
      const current = best.get(key);
      if (!current || set.weight_kg > current.weight_kg) {
        best.set(key, {
          exercise_name: set.exercise_name.trim(),
          weight_kg: set.weight_kg,
          reps: set.reps,
          performed_on: session.performed_on,
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight_kg - a.weight_kg);
}

// Sessions grouped by ISO week start (Monday), newest week first, with the
// count of distinct training days. This is what "consistency" means without
// inventing a score.
export function weeklyStreak(sessions: Pick<SessionForStats, "performed_on">[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => s.performed_on));
  const weekStart = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    const shift = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - shift);
    return d.toISOString().slice(0, 10);
  };
  const weeks = new Set([...days].map(weekStart));
  return weeks.size;
}
