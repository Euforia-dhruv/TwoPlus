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
  claimMyMemberAccount,
  type MyDietPlan,
  type MyMeasurement,
  type MyWorkoutPlan,
} from "@/lib/member-api"
import { formatDate, formatMoney } from "@/lib/types"
import { Badge } from "@/components/kit"
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

  // Linked data, loaded after the member row resolves.
  const [memberships, setMemberships] = useState<Awaited<ReturnType<typeof getMyMemberships>>>([])
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getMyPayments>>>([])
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof getMyAttendance>>>([])
  const [workouts, setWorkouts] = useState<MyWorkoutPlan[]>([])
  const [diets, setDiets] = useState<MyDietPlan[]>([])
  const [measurements, setMeasurements] = useState<MyMeasurement[]>([])

  const loadMember = useCallback(async () => {
    setLoading(true)
    const m = await getMyMember().catch(() => null)
    setMember(m)
    setLoading(false)
    if (!m) return
    const orgId = m.organization_id
    const [ms, ps, att, wo, di, me] = await Promise.all([
      getMyMemberships(orgId, m.id).catch(() => []),
      getMyPayments(orgId, m.id).catch(() => []),
      getMyAttendance(orgId, m.id).catch(() => []),
      getMyWorkoutPlans(orgId, m.id).catch(() => []),
      getMyDietPlans(orgId, m.id).catch(() => []),
      getMyMeasurements(orgId, m.id).catch(() => []),
    ])
    setMemberships(ms)
    setPayments(ps)
    setAttendance(att)
    setWorkouts(wo)
    setDiets(di)
    setMeasurements(me)
  }, [])

  useEffect(() => {
    void loadMember()
  }, [loadMember])

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
          <button className="mb-signout" onClick={() => void signOut()}>Sign out</button>
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
        <button className="mb-signout" onClick={() => void signOut()}>Sign out</button>
      </header>
      <main className="mb-main">
        <section className="mb-hero">
          <h1>{member.first_name} {member.last_name}</h1>
          <Badge>{member.status}</Badge>
          {member.phone && <p className="mb-muted">{member.phone}</p>}
          {member.joined_on && <p className="mb-muted">Member since {formatDate(member.joined_on)}</p>}
        </section>

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

        <Section title="Diet plans">
          {diets.length === 0 ? (
            <EmptyNote>No diet plan assigned yet.</EmptyNote>
          ) : (
            diets.map((p) => (
              <article className="mb-plan" key={p.id}>
                <h3>{p.name}</h3>
                {p.goal && <p className="mb-muted">{p.goal}</p>}
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
          {measurements.length === 0 ? (
            <EmptyNote>No measurements recorded yet.</EmptyNote>
          ) : (
            measurements.map((m) => (
              <div className="mb-measure" key={m.id}>
                <div className="mb-row"><span>Date</span><strong>{formatDate(m.measured_on)}</strong></div>
                {m.weight_kg != null && <div className="mb-row"><span>Weight</span><strong>{m.weight_kg} kg</strong></div>}
                {m.body_fat_pct != null && <div className="mb-row"><span>Body fat</span><strong>{m.body_fat_pct}%</strong></div>}
                {m.waist_cm != null && <div className="mb-row"><span>Waist</span><strong>{m.waist_cm} cm</strong></div>}
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
