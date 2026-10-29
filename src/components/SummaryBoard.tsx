// Overview board: hero + right analytics column + attention table.
// Every number comes from live workspace rows; nothing is sampled.
import { Icon } from "../icons"
import { formatMoney, type DashboardStats, type ReportMonth } from "@/lib/types"

export type BoardMember = {
  name: string
  plan: string
  status: string
  expires: string
  due: string
}

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80"

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

// Smooth cardinal spline through the points, clamped so it cannot bulge
// past the chart box on sparse data.
function linePath(values: number[], w: number, h: number, pad = 8): string {
  if (values.length < 2) return ""
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const clamp = (v: number) => Math.min(h - pad, Math.max(pad, v))
  const pts = values.map((v, i) => [
    pad + (i * (w - pad * 2)) / (values.length - 1),
    clamp(h - pad - ((v - min) / span) * (h - pad * 2)),
  ])
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
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
  const joins = reports.map((r) => r.newMembers)
  const collected = reports.map((r) => r.collectedMinor)
  const last = reports[reports.length - 1]
  const prev = reports[reports.length - 2]
  const delta =
    last && prev && prev.collectedMinor > 0
      ? Math.round(((last.collectedMinor - prev.collectedMinor) / prev.collectedMinor) * 100)
      : null

  const planCounts = new Map<string, number>()
  for (const m of members) {
    if (m.plan && m.plan !== "Unassigned") planCounts.set(m.plan, (planCounts.get(m.plan) ?? 0) + 1)
  }
  const topPlan = [...planCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

  const attention = members.filter((m) => m.status === "Expiring soon" || m.status === "Expired").slice(0, 5)
  const money = (minor: number) => formatMoney(minor, currency)
  const collectedPath = linePath(collected, 260, 90, 8)
  const areaPath = collectedPath
    ? `${collectedPath} L${252},82 L8,82 Z`
    : ""

  return (
    <div className="board">
      <section className="board-hero" style={{ backgroundImage: `linear-gradient(105deg,rgba(14,14,14,.92) 12%,rgba(20,18,16,.72) 45%,rgba(20,18,16,.25) 78%),url(${HERO_PHOTO})` }}>
        <div className="board-hero-body">
          <p className="board-eyebrow">Workspace overview</p>
          <h2>Optimize how your gym runs</h2>
          <p className="board-hero-sub">
            {loading
              ? "Loading your workspace…"
              : stats && stats.totalMembers > 0
                ? "Live figures from your members, memberships and payments."
                : "Add your first member and these cards fill with real numbers."}
          </p>
          <button className="board-cta" onClick={onAddMember}>
            <Icon name="plus" size={15} />
            Add member
          </button>
        </div>

        <div className="board-hero-stats">
          {[
            ["Members", stats ? compact(stats.totalMembers) : "—", `${stats?.activeMembers ?? 0} active`],
            ["Memberships", stats ? compact(stats.activeMemberships) : "—", `${stats?.expiringSoon ?? 0} expiring`],
            ["Collected", stats ? money(stats.monthCollectionsMinor) : "—", "this month"],
            ["Enquiries", stats ? compact(stats.newEnquiries) : "—", "this month"],
          ].map(([label, value, note]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>
                <i className="board-dot" />
                {label} · {note}
              </span>
            </div>
          ))}
          <button className="board-round" onClick={onOpenMembers} aria-label="Open member directory">
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </section>

      <div className="board-side">
        <section className="board-card">
          <div className="board-card-head">
            <div>
              <h3>Check-ins by month</h3>
              <p>Last {reports.length || 0} months of attendance and joins</p>
            </div>
            <span className="board-live"><i />Live</span>
          </div>

          {reports.length > 1 ? (
            <>
              <svg className="board-chart" viewBox="0 0 300 130" preserveAspectRatio="none" aria-hidden="true">
                {[0.25, 0.5, 0.75].map((t) => (
                  <line key={t} x1="0" x2="300" y1={130 * t} y2={130 * t} className="board-grid" vectorEffect="non-scaling-stroke" />
                ))}
                <path d={linePath(joins, 300, 130, 12)} className="board-line board-line-muted" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <path d={linePath(visits, 300, 130, 12)} className="board-line board-line-accent" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="board-chart-foot">
                <span>{reports[0]?.label}</span>
                <span>{reports[Math.floor(reports.length / 2)]?.label}</span>
                <span>{last?.label}</span>
              </div>
              <div className="board-key">
                <span><i className="board-swatch board-swatch-accent" />Check-ins {stats?.attendanceToday ?? 0} today</span>
                <span><i className="board-swatch board-swatch-muted" />New members {stats?.newEnquiries ?? 0} enquiries</span>
              </div>
            </>
          ) : (
            <div className="board-empty">
              <Icon name="chart" size={22} />
              <p>Two months of attendance unlock this chart.</p>
            </div>
          )}
        </section>

        <section className="board-card board-collect">
          <div className="board-card-head">
            <div>
              <h3>Latest collections</h3>
              <p>{last?.label ?? "This month"}</p>
            </div>
            {delta !== null && (
              <span className={`board-delta ${delta < 0 ? "is-down" : ""}`}>
                <Icon name="chart" size={12} />
                {delta > 0 ? "+" : ""}{delta}%
              </span>
            )}
          </div>

          {collected.length > 1 ? (
            <svg className="board-area" viewBox="0 0 260 90" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="boardAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--lime)" stopOpacity=".42" />
                  <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#boardAreaFill)" />
              <path d={collectedPath} className="board-line board-line-accent" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <div className="board-flat" />
          )}

          <strong className="board-amount">{stats ? money(stats.monthCollectionsMinor) : "—"}</strong>
          <p className="board-caption">Your recorded collections this month</p>

          <div className="board-split">
            <button onClick={onOpenPayments}>
              <span>Pending</span>
              <strong>{stats ? money(stats.pendingPaymentsMinor) : "—"}</strong>
            </button>
            <div>
              <span>Top plan</span>
              <strong>{topPlan ? topPlan[0] : "—"}</strong>
              <small>{topPlan ? `${topPlan[1]} members` : "No memberships yet"}</small>
            </div>
          </div>
        </section>
      </div>

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
          <div className="board-empty board-empty-row">
            <Icon name="check" size={20} />
            <p>Nothing expiring in the next 7 days. Good place to be.</p>
          </div>
        )}
      </section>
    </div>
  )
}
