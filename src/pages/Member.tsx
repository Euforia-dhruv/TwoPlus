import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import {
  getMyAttendance,
  getMyDietPlans,
  getMyMeasurements,
  getMyMember,
  getMyMemberships,
  getMyPayments,
  getMyWorkoutPlans,
  getMyWorkoutSessions,
  claimMyMemberAccount,
  deleteWorkoutSession,
  logWorkout,
  getBookableClasses,
  bookClass,
  cancelClassBooking,
  getMyProgressPhotos,
  uploadProgressPhoto,
  deleteProgressPhoto,
  saveMyMeasurement,
  type BookableClass,
  type MyDietPlan,
  type MyMeasurement,
  type MyWorkoutPlan,
  type ProgressPhoto,
  type WorkoutSession,
} from "@/lib/member-api"
import { formatDate, formatMoney } from "@/lib/types"
import { Badge } from "@/components/kit"
import { CACHE, cachedRead, submitOrQueue, useOutbox } from "@/lib/member-sync"
import { clearCache } from "@/lib/offline-cache"
import { WorkoutLogger, WorkoutHistory } from "./member-workout"
import { ClassSchedule, MeasurementForm, ProgressGallery } from "./member-extras"
import { PendingSync } from "./member-sync-panel"
import "./member.css"

type MemberRow = NonNullable<Awaited<ReturnType<typeof getMyMember>>>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-card">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="mb-empty">{children}</p>
}

export default function Member() {
  const { signOut } = useAuth()
  const [member, setMember] = useState<MemberRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState("")
  // True when at least one section is showing a copy saved while offline.
  const [stale, setStale] = useState(false)
  const outbox = useOutbox()

  // Linked data, loaded after the member row resolves.
  const [memberships, setMemberships] = useState<Awaited<ReturnType<typeof getMyMemberships>>>([])
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getMyPayments>>>([])
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof getMyAttendance>>>([])
  const [workouts, setWorkouts] = useState<MyWorkoutPlan[]>([])
  const [diets, setDiets] = useState<MyDietPlan[]>([])
  const [measurements, setMeasurements] = useState<MyMeasurement[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [classes, setClasses] = useState<BookableClass[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [busyClass, setBusyClass] = useState<string | null>(null)

  // Every list falls back to its last good copy, and any fallback raises the
  // banner once instead of each section guessing separately.
  const loadList = useCallback(
    async <T,>(cacheKey: string, fn: () => Promise<T[]>): Promise<T[]> => {
      const r = await cachedRead<T[]>(cacheKey, fn, [])
      if (r.stale) setStale(true)
      return r.data
    },
    [],
  )

  const loadMember = useCallback(async () => {
    setLoading(true)
    setStale(false)
    const m = await cachedRead<MemberRow | null>(CACHE.member, getMyMember, null)
    if (m.stale) setStale(true)
    setMember(m.data)
    setLoading(false)
    if (!m.data) return
    const orgId = m.data.organization_id
    const id = m.data.id
    const [ms, ps, att, wo, di, me, ws, cl, ph] = await Promise.all([
      loadList(CACHE.memberships, () => getMyMemberships(orgId, id)),
      loadList(CACHE.payments, () => getMyPayments(orgId, id)),
      loadList(CACHE.attendance, () => getMyAttendance(orgId, id)),
      loadList(CACHE.workouts, () => getMyWorkoutPlans(orgId, id)),
      loadList(CACHE.diets, () => getMyDietPlans(orgId, id)),
      loadList(CACHE.measurements, () => getMyMeasurements(orgId, id)),
      loadList(CACHE.sessions, () => getMyWorkoutSessions(id)),
      loadList(CACHE.classes, () => getBookableClasses(orgId, id)),
      // Photos need a signed URL per row, so they are never shown from cache:
      // an expired link is worse than an honest empty state.
      getMyProgressPhotos(orgId, id).catch(() => []),
    ])
    setMemberships(ms)
    setPayments(ps)
    setAttendance(att)
    setWorkouts(wo)
    setDiets(di)
    setMeasurements(me)
    setSessions(ws)
    setClasses(cl)
    setPhotos(ph)
  }, [loadList])

  useEffect(() => {
    void loadMember()
  }, [loadMember])

  // A drained outbox changes server state, so re-read rather than trusting the
  // optimistic screen. Queued writes already left the outbox by this point.
  const drain = useCallback(async () => {
    const result = await outbox.drain()
    if (result.sent > 0) await loadMember()
  }, [outbox, loadMember])

  const handleSignOut = () => {
    // The cache holds a member's training and payment history; sign-out clears it.
    clearCache()
    void signOut()
  }

  const handleClaim = async () => {
    setClaiming(true)
    setClaimError("")
    try {
      const id = await claimMyMemberAccount()
      if (!id) setClaimError("No matching member record was found for your email. Ask your gym to invite you.")
      await loadMember()
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Could not link your account")
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-shell">
        <header className="mb-header"><span className="mb-brand">TwoPlus</span></header>
        <main className="mb-main"><div className="mb-splash">Loading your gym…</div></main>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="mb-shell">
        <header className="mb-header">
          <span className="mb-brand">TwoPlus</span>
          <button className="mb-signout" onClick={handleSignOut}>Sign out</button>
        </header>
        <main className="mb-main">
          <Section title="No member account linked">
            <p>The sign-in you used is not linked to a member record in any gym yet.</p>
            <p>Ask your gym to invite you by email, then come back here and link it.</p>
            {claimError && <p className="mb-error">{claimError}</p>}
            <button className="mb-primary" disabled={claiming} onClick={() => void handleClaim()}>
              {claiming ? "Linking…" : "Link my gym account"}
            </button>
          </Section>
        </main>
      </div>
    )
  }

  const activeMembership = memberships.find((m) => m.status === "active") ?? memberships[0]

  return (
    <div className="mb-shell">
      <header className="mb-header">
        <span className="mb-brand">TwoPlus</span>
        <button className="mb-signout" onClick={handleSignOut}>Sign out</button>
      </header>
      <main className="mb-main">
        <section className="mb-hero">
          <h1>{member.first_name} {member.last_name}</h1>
          <Badge>{member.status}</Badge>
          {member.phone && <p className="mb-muted">{member.phone}</p>}
          {member.joined_on && <p className="mb-muted">Member since {formatDate(member.joined_on)}</p>}
        </section>

        <PendingSync
          ops={outbox.ops}
          online={outbox.online}
          flushing={outbox.flushing}
          stale={stale}
          onSync={() => void drain()}
        />

        <Section title="Membership">
          {activeMembership ? (
            <>
              <div className="mb-row"><span>Plan</span><strong>{activeMembership.plan_name}</strong></div>
              <div className="mb-row"><span>Status</span><Badge>{activeMembership.status}</Badge></div>
              <div className="mb-row"><span>Started</span><strong>{formatDate(activeMembership.start_date)}</strong></div>
              <div className="mb-row"><span>Valid until</span><strong>{formatDate(activeMembership.end_date)}</strong></div>
            </>
          ) : (
            <EmptyNote>No active membership. Contact your gym to renew or start one.</EmptyNote>
          )}
        </Section>

        <Section title="Workout plans">
          {workouts.length === 0 ? (
            <EmptyNote>No workout plan assigned yet.</EmptyNote>
          ) : (
            workouts.map((p) => (
              <article className="mb-plan" key={p.id}>
                <h3>{p.name}</h3>
                {p.goal && <p className="mb-muted">{p.goal}</p>}
                <ul>
                  {p.exercises.map((e) => (
                    <li key={e.id}>
                      <strong>{e.exercise_name}</strong>
                      {e.day_label && <span className="mb-muted"> · {e.day_label}</span>}
                      {e.sets && <span> · {e.sets} sets</span>}
                      {e.reps && <span> · {e.reps}</span>}
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </Section>

        <Section title="Training log">
          {member && (
            <WorkoutLogger
              plans={workouts}
              onSave={async (input) => {
                const payload = {
                  organizationId: member.organization_id,
                  memberId: member.id,
                  planId: input.planId,
                  assignmentId: workouts.find((w) => w.id === input.planId)?.assignment_id ?? null,
                  performedOn: input.performedOn,
                  durationMinutes: input.durationMinutes,
                  note: input.note,
                  sets: input.sets,
                }
                // One key per training day: re-logging the same day replaces the
                // pending write instead of queuing a second one.
                await submitOrQueue({
                  key: `workout:${member.id}:${input.performedOn}`,
                  kind: "workout",
                  label: `Workout on ${formatDate(input.performedOn)}`,
                  payload,
                  run: async () => {
                    await logWorkout(payload)
                  },
                })
                outbox.refresh()
                setSessions(await getMyWorkoutSessions(member.id).catch(() => []))
              }}
            />
          )}
          <WorkoutHistory
            sessions={sessions}
            onDelete={(id) => {
              if (!member) return
              if (!window.confirm("Delete this workout from your history?")) return
              void deleteWorkoutSession(id)
                .then(() => setSessions((prev) => prev.filter((s) => s.id !== id)))
                .catch(() => undefined)
            }}
          />
        </Section>

        <Section title="Classes">
          <ClassSchedule
            classes={classes}
            busyId={busyClass}
            onBook={(id) => {
              if (!member) return
              setBusyClass(id)
              void submitOrQueue({
                key: `class-book:${member.id}:${id}`,
                kind: "class-book",
                label: `Booking for ${classes.find((c) => c.id === id)?.name ?? "a class"}`,
                payload: id,
                run: () => bookClass(id),
              })
                .then(() => getBookableClasses(member.organization_id, member.id))
                .then((next) => {
                  setClasses(next)
                  outbox.refresh()
                })
                .catch((err) =>
                  window.alert(err instanceof Error ? err.message : "Could not book that class"),
                )
                .finally(() => setBusyClass(null))
            }}
            onCancel={(id) => {
              if (!member) return
              if (!window.confirm("Cancel your booking for this class?")) return
              setBusyClass(id)
              void submitOrQueue({
                key: `class-cancel:${member.id}:${id}`,
                kind: "class-cancel",
                label: `Cancellation for ${classes.find((c) => c.id === id)?.name ?? "a class"}`,
                payload: id,
                run: () => cancelClassBooking(id),
              })
                .then(() => getBookableClasses(member.organization_id, member.id))
                .then((next) => {
                  setClasses(next)
                  outbox.refresh()
                })
                .catch((err) =>
                  window.alert(err instanceof Error ? err.message : "Could not cancel that booking"),
                )
                .finally(() => setBusyClass(null))
            }}
          />
        </Section>

        <Section title="Progress photos">
          {member && (
            <ProgressGallery
              photos={photos}
              onUpload={async (file, takenOn, note) => {
                await uploadProgressPhoto({
                  orgId: member.organization_id,
                  memberId: member.id,
                  file,
                  takenOn,
                  note,
                })
                setPhotos(await getMyProgressPhotos(member.organization_id, member.id))
              }}
              onDelete={(photo) => {
                if (!member) return
                if (!window.confirm("Delete this progress photo permanently?")) return
                void deleteProgressPhoto(photo)
                  .then(() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id)))
                  .catch(() => undefined)
              }}
            />
          )}
        </Section>

        <Section title="Diet plans">
          {diets.length === 0 ? (
            <EmptyNote>No diet plan assigned yet.</EmptyNote>
          ) : (
            diets.map((p) => (
              <article className="mb-plan" key={p.id}>
                <h3>{p.name}</h3>
                {p.description && <p className="mb-muted">{p.description}</p>}
                {(p.target_calories || p.target_protein_g) && (
                  <p className="mb-muted">
                    {[
                      p.target_calories ? `${p.target_calories} kcal` : null,
                      p.target_protein_g ? `${p.target_protein_g}g protein` : null,
                      p.target_carbs_g ? `${p.target_carbs_g}g carbs` : null,
                      p.target_fat_g ? `${p.target_fat_g}g fat` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {p.meals.map((meal) => (
                  <div className="mb-meal" key={meal.id}>
                    <h4>{meal.name}{meal.timing ? ` — ${meal.timing}` : ""}</h4>
                    <ul>
                      {meal.items.map((it) => (
                        <li key={it.id}>
                          <strong>{it.food_item}</strong>
                          {it.portion && <span className="mb-muted"> · {it.portion}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            ))
          )}
        </Section>

        <Section title="Measurements">
          <MeasurementForm
            onSave={async (v) => {
              const payload = {
                orgId: member.organization_id,
                memberId: member.id,
                measuredOn: v.measuredOn,
                weightKg: v.weightKg,
                bodyFatPct: v.bodyFatPct,
                waistCm: v.waistCm,
                chestCm: v.chestCm,
                notes: v.notes,
              }
              // The server upserts on (member, day), so the key matches exactly:
              // a second entry for the same day corrects the pending one.
              await submitOrQueue({
                key: `measure:${member.id}:${v.measuredOn}`,
                kind: "measurement",
                label: `Measurements for ${formatDate(v.measuredOn)}`,
                payload,
                run: () => saveMyMeasurement(payload),
              })
              outbox.refresh()
              setMeasurements(await getMyMeasurements(member.organization_id, member.id))
            }}
          />
          {measurements.length === 0 ? (
            <EmptyNote>No measurements recorded yet.</EmptyNote>
          ) : (
            measurements.map((m) => (
              <div className="mb-measure" key={m.id}>
                <div className="mb-row"><span>Date</span><strong>{formatDate(m.measured_on)}</strong></div>
                {m.weight_kg != null && <div className="mb-row"><span>Weight</span><strong>{m.weight_kg} kg</strong></div>}
                {m.body_fat_pct != null && <div className="mb-row"><span>Body fat</span><strong>{m.body_fat_pct}%</strong></div>}
                {m.waist_cm != null && <div className="mb-row"><span>Waist</span><strong>{m.waist_cm} cm</strong></div>}
                {m.chest_cm != null && <div className="mb-row"><span>Chest</span><strong>{m.chest_cm} cm</strong></div>}
                {m.notes && <p className="mb-muted">{m.notes}</p>}
              </div>
            ))
          )}
        </Section>

        <Section title="Attendance">
          {attendance.length === 0 ? (
            <EmptyNote>No visits recorded yet.</EmptyNote>
          ) : (
            attendance.map((a) => (
              <div className="mb-row" key={a.id}>
                <span>{formatDate(a.check_in)}</span>
                <strong>
                  {new Date(a.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  {a.check_out
                    ? ` – ${new Date(a.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                    : " · still in"}
                </strong>
              </div>
            ))
          )}
        </Section>

        <Section title="Payments">
          {payments.length === 0 ? (
            <EmptyNote>No payments recorded yet.</EmptyNote>
          ) : (
            payments.map((p) => (
              <div className="mb-row" key={p.id}>
                <span>{formatDate(p.paid_on)} · {p.method}</span>
                <strong>{formatMoney(p.amount_minor, p.currency)} <Badge>{p.status}</Badge></strong>
              </div>
            ))
          )}
        </Section>
      </main>
    </div>
  )
}
