import { useState } from "react"
import { formatDate } from "@/lib/types"
import { personalRecords, type MyWorkoutPlan, type WorkoutSession } from "@/lib/member-api"

// Logging a workout used to be impossible: the member app could only read the
// assigned plan. This form writes a real session and its sets, and the history
// below it is what personal records are computed from.

type DraftSet = { reps: string; weight: string }

// One row per prescribed exercise, plus the ability to add an unplanned lift.
export type DraftRow = { exerciseId: string | null; name: string }

function today(): string {
  // Local date, not UTC: a member logging at 11pm IST must get their own day.
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function draftRowsFor(plan: MyWorkoutPlan | undefined): DraftRow[] {
  if (!plan) return []
  return plan.exercises.map((e) => ({ exerciseId: e.id, name: e.exercise_name }))
}

export function WorkoutLogger({
  plans,
  onSave,
}: {
  plans: MyWorkoutPlan[]
  onSave: (input: {
    planId: string | null
    performedOn: string
    durationMinutes: number | null
    note: string | null
    sets: { exercise_id: string | null; exercise_name: string; reps: number | null; weight_kg: number | null }[]
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [planId, setPlanId] = useState<string>(plans[0]?.id ?? "")
  const [performedOn, setPerformedOn] = useState(today())
  const [duration, setDuration] = useState("")
  const [note, setNote] = useState("")
  const [rows, setRows] = useState<DraftRow[]>(() => draftRowsFor(plans[0]))
  const [sets, setSets] = useState<Record<string, DraftSet>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const plan = plans.find((p) => p.id === planId)

  const choosePlan = (id: string) => {
    setPlanId(id)
    setRows(draftRowsFor(plans.find((p) => p.id === id)))
  }

  const setField = (key: string, field: keyof DraftSet, value: string) =>
    setSets((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  const addRow = () => setRows((prev) => [...prev, { exerciseId: null, name: "" }])

  const submit = async () => {
    setError("")
    const logged = rows
      .map((row, i) => {
        const draft = sets[`${row.exerciseId ?? `new-${i}`}`] ?? { reps: "", weight: "" }
        const reps = draft.reps.trim() === "" ? null : Number(draft.reps)
        const weight = draft.weight.trim() === "" ? null : Number(draft.weight)
        if (reps == null && weight == null) return null
        return {
          exercise_id: row.exerciseId,
          exercise_name: row.name.trim(),
          reps: Number.isFinite(reps as number) ? (reps as number) : null,
          weight_kg: Number.isFinite(weight as number) ? (weight as number) : null,
          key: `${row.exerciseId ?? `new-${i}`}`,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (!logged.length) {
      setError("Enter at least one set (reps or weight).")
      return
    }
    if (logged.some((r) => !r.exercise_name)) {
      setError("Name every exercise you added.")
      return
    }

    setSaving(true)
    try {
      await onSave({
        planId: plan?.id ?? null,
        performedOn,
        durationMinutes: duration.trim() === "" ? null : Number(duration),
        note: note.trim() === "" ? null : note.trim(),
        sets: logged.map(({ key: _key, ...rest }) => rest),
      })
      // Reset the entry fields but keep the plan selected for the next session.
      setSets({})
      setNote("")
      setDuration("")
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this workout.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="mb-primary" onClick={() => setOpen(true)}>
        Log a workout
      </button>
    )
  }

  return (
    <div className="mb-logger">
      <label className="mb-field">
        <span>Plan</span>
        <select value={planId} onChange={(e) => choosePlan(e.target.value)}>
          <option value="">No plan (free session)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <label className="mb-field">
        <span>Date</span>
        <input type="date" value={performedOn} onChange={(e) => setPerformedOn(e.target.value)} />
      </label>

      <label className="mb-field">
        <span>Duration (minutes)</span>
        <input
          type="number"
          min="0"
          max="1440"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="mb-sets">
        <div className="mb-sets-head">
          <span>Exercise</span>
          <span>Reps</span>
          <span>Weight (kg)</span>
        </div>
        {rows.map((row, i) => {
          const key = `${row.exerciseId ?? `new-${i}`}`
          const draft = sets[key] ?? { reps: "", weight: "" }
          return (
            <div className="mb-sets-row" key={key}>
              {row.exerciseId ? (
                <span className="mb-set-name">{row.name}</span>
              ) : (
                <input
                  aria-label={`Exercise ${i + 1} name`}
                  value={row.name}
                  placeholder="Exercise"
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                    )
                  }
                />
              )}
              <input
                aria-label={`${row.name || `Exercise ${i + 1}`} reps`}
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.reps}
                onChange={(e) => setField(key, "reps", e.target.value)}
              />
              <input
                aria-label={`${row.name || `Exercise ${i + 1}`} weight in kg`}
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={draft.weight}
                onChange={(e) => setField(key, "weight", e.target.value)}
              />
            </div>
          )
        })}
        <button type="button" className="mb-link" onClick={addRow}>
          + Add an exercise
        </button>
      </div>

      <label className="mb-field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it feel?"
        />
      </label>

      {error && <p className="mb-error">{error}</p>}

      <div className="mb-logger-actions">
        <button type="button" className="mb-primary" disabled={saving} onClick={() => void submit()}>
          {saving ? "Saving…" : "Save workout"}
        </button>
        <button type="button" className="mb-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export function WorkoutHistory({
  sessions,
  onDelete,
}: {
  sessions: WorkoutSession[]
  onDelete: (id: string) => void
}) {
  const records = personalRecords(sessions)

  return (
    <>
      {records.length > 0 && (
        <div className="mb-prs">
          <h3>Personal records</h3>
          <ul>
            {records.slice(0, 6).map((r) => (
              <li key={r.exercise_name}>
                <strong>{r.exercise_name}</strong>
                <span>
                  {r.weight_kg} kg{r.reps ? ` × ${r.reps}` : ""} · {formatDate(r.performed_on)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="mb-empty">No workouts logged yet.</p>
      ) : (
        sessions.map((s) => (
          <article className="mb-plan" key={s.id}>
            <h3>{formatDate(s.performed_on)}{s.plan_name ? ` · ${s.plan_name}` : ""}</h3>
            <p className="mb-muted">
              {[
                s.duration_minutes ? `${s.duration_minutes} min` : null,
                `${s.sets.length} ${s.sets.length === 1 ? "set" : "sets"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ul>
              {s.sets.map((set) => (
                <li key={`${set.exercise_name}-${set.set_number}`}>
                  <strong>{set.exercise_name}</strong>
                  {set.reps != null && <span> · {set.reps} reps</span>}
                  {set.weight_kg != null && <span> · {set.weight_kg} kg</span>}
                </li>
              ))}
            </ul>
            {s.note && <p className="mb-muted">{s.note}</p>}
            <button type="button" className="mb-link" onClick={() => onDelete(s.id)}>
              Delete
            </button>
          </article>
        ))
      )}
    </>
  )
}
