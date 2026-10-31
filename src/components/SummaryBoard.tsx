// Overview: the screen answers one question first, "is the gym okay this month,
// and what needs me today?". A KPI band, the attendance chart, the money card,
// and the memberships that need action. Every figure comes from live rows.
//
// Class names (.board-*, .board-hero-stats) are the vocabulary the 26 theme
// blocks in index.css target, so the composition changed and the hooks stayed.
import { Icon } from "../icons"
import { formatMoney, type DashboardStats, type ReportMonth } from "@/lib/types"

export type BoardMember = {
  name: string
  plan: string
  status: string
  expires: string
  due: string
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

// Straight segments on a rounded scale: a smoothed curve invents values between
// monthly totals (app-screens.md §6.4).
function plot(values: number[], w: number, h: number, pad: { l: number; r: number; t: number; b: number }) {
  const max = Math.max(...values, 0)
  // A round step so the top tick sits above the peak instead of on the plot edge.
  const step = max <= 4 ? 1 : Math.ceil(max / 4)
  const top = Math.max(step * Math.ceil(max / step), step)
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const x = (i: number) => pad.l + (values.length === 1 ? innerW / 2 : (i * innerW) / (values.length - 1))
  const y = (v: number) => pad.t + innerH - (v / top) * innerH
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")
  return { d, top, x, y, mid: top / 2 }
}

export function SummaryBoard({
  stats,
  reports,
  currency,
  members,
  loading,
  onAddMember,
  onOpenMembers,
  onOpenPayments,
}: {
  stats: DashboardStats | null
  reports: ReportMonth[]
  currency: string
  members: BoardMember[]
  loading: boolean
  onAddMember: () => void
  onOpenMembers: () => void
  onOpenPayments: () => void
}) {
  const visits = reports.map((r) => r.visits)
  const last = reports[reports.length - 1]
  const prev = reports[reports.length - 2]
  // Percent change needs a baseline, and a zero baseline makes it meaningless.
  const delta =
    last && prev && prev.collectedMinor > 0
      ? Math.round(((last.collectedMinor - prev.collectedMinor) / prev.collectedMinor) * 100)
      : null

  const planCounts = new Map<string, number>()
  for (const m of members) {
    if (m.plan && m.plan !== "Unassigned") planCounts.set(m.plan, (planCounts.get(m.plan) ?? 0) + 1)
  }
  const topPlan = [...planCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

  const attention = members
    .filter((m) => m.status === "Expiring soon" || m.status === "Expired")
    .slice(0, 5)

  const money = (minor: number) => formatMoney(minor, currency)
  const chart = plot(visits, 300, 120, { l: 30, r: 6, t: 10, b: 18 })
  const maxVisits = Math.max(...visits, 0)

  const cells: Array<[string, string, string]> = [
    ["Members", stats ? compact(stats.totalMembers) : "", `${stats?.activeMembers ?? 0} active`],
    ["Memberships", stats ? compact(stats.activeMemberships) : "", "active this month"],
    [
      "Collected",
      stats ? money(stats.monthCollectionsMinor) : "",
      stats && delta !== null ? `${delta > 0 ? "+" : ""}${delta}% vs ${prev?.label}` : "this month",
    ],
    [
      "Dues",
      stats ? money(stats.pendingPaymentsMinor) : "",
      stats && stats.pendingPaymentsMinor > 0 ? "needs chasing" : "all settled",
    ],
  ]

  // While the rows are still arriving, the slot holds a bar at the value's own
  // height rather than a dash, so nothing shifts when the number lands.
  const pending = !stats

  // The side card carries only figures the band above does not already show.
  const side: Array<[string, string]> = [
    ["Expenses", stats ? money(stats.monthExpensesMinor) : "\u2014"],
    [
      "Net",
      stats ? money(stats.monthCollectionsMinor - stats.monthExpensesMinor) : "\u2014",
    ],
    ["New enquiries", stats ? String(stats.newEnquiries) : "\u2014"],
    ["Top plan", topPlan ? `${topPlan[0]}` : "\u2014"],
  ]

  return (
    <div className="board">
      {/* The answer strip. Labels above values, one container split by rules. */}
      <section className="board-hero" aria-label="Key figures">
        <div className="board-hero-stats">
          {cells.map(([label, value, note]) => (
            <div key={label}>
              <span>{label}</span>
              {pending ? <i className="board-skeleton" aria-hidden="true" /> : <strong>{value}</strong>}
              <small>{note}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="board-card board-chart-card">
        <div className="board-card-head">
          <div>
            <h3>Check-ins by month</h3>
            <p>
              {reports.length > 1
                ? `${reports[0].label} to ${last.label} · ${stats?.attendanceToday ?? 0} today`
                : "Attendance recorded in your gym"}
            </p>
          </div>
          {maxVisits > 0 && <span className="board-peak">{maxVisits} best</span>}
        </div>

        {maxVisits > 0 && reports.length > 1 ? (
          <>
            <svg
              className="board-chart"
              viewBox="0 0 300 120"
              role="img"
              aria-label={`Check-ins per month, highest ${maxVisits}`}
            >
              {[chart.top, chart.mid].map((t) => (
                <g key={t}>
                  <line x1="30" x2="294" y1={chart.y(t)} y2={chart.y(t)} className="board-grid" />
                  <text x="24" y={chart.y(t) + 3} className="board-tick" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}
              <line x1="30" x2="294" y1={chart.y(0)} y2={chart.y(0)} className="board-axis" />
              <path d={chart.d} className="board-line board-line-accent" strokeWidth="2" fill="none" />
            </svg>
            <div className="board-chart-foot">
              <span>{reports[0]?.label}</span>
              <span>{last?.label}</span>
            </div>
          </>
        ) : (
          <div className="board-empty">
            <Icon name="chart" size={20} />
            <p>
              {reports.length > 1
                ? "No check-ins recorded in these months yet."
                : "Two months of check-ins unlock this chart."}
            </p>
          </div>
        )}
      </section>

      <section className="board-card board-side">
        <div className="board-card-head">
          <div>
            <h3>This month</h3>
            <p>{last?.label ?? "No months recorded yet"}</p>
          </div>
          <button className="board-filter" onClick={onOpenPayments}>
            Payments
            <Icon name="arrow" size={13} />
          </button>
        </div>

        <div className="board-figures">
          {side.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        {!loading && (!stats || stats.totalMembers === 0) && (
          <div className="board-note">
            <span>Nothing to count yet.</span>
            <button className="board-filter" onClick={onAddMember}>
              <Icon name="plus" size={13} />
              Add member
            </button>
          </div>
        )}
      </section>

      <section className="board-card board-table">
        <div className="board-card-head">
          <div>
            <h3>Memberships needing attention</h3>
            <p>Expiring within 7 days or already expired</p>
          </div>
          <button className="board-filter" onClick={onOpenMembers}>
            Open directory
            <Icon name="arrow" size={13} />
          </button>
        </div>

        {attention.length ? (
          <div className="board-rows">
            {attention.map((m) => (
              <div className="board-row" key={`${m.name}-${m.expires}`}>
                <span className="board-avatar">{m.name.slice(0, 1).toUpperCase()}</span>
                <div className="board-row-main">
                  <strong>{m.name}</strong>
                  <small>{m.plan}</small>
                </div>
                <span className={`board-pill ${m.status === "Expired" ? "is-bad" : ""}`}>{m.status}</span>
                <span className="board-row-cell">{m.expires}</span>
                <span className="board-row-cell board-row-due">{m.due}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="board-empty">
            <Icon name="check" size={20} />
            <p>Nothing expiring in the next 7 days.</p>
          </div>
        )}
      </section>
    </div>
  )
}
