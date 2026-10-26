import { useMemo } from "react";
import { Badge, Button, Dot, Panel, SectionHead, Avatar, Meter, EmptyState } from "@/components/ui/glass";
import { fmtINR, fmtDate, useStore } from "@/lib/data";

export default function Overview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { members, payments, attendance, followUps, leads, expenses, revenueHistory } = useStore();

  const m = useMemo(() => {
    const active = members.filter((x) => x.status === "active" || x.status === "expiring").length;
    const expiring = members.filter((x) => x.status === "expiring").length;
    const expired = members.filter((x) => x.status === "expired").length;
    const collected = payments.filter((p) => p.status !== "pending").reduce((s, p) => s + p.amount, 0);
    const outstanding = members.reduce((s, x) => s + x.balance, 0);
    const pending = payments.filter((p) => p.status === "pending").length;
    const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const todayCount = attendance.filter((a) => a.date === new Date().toISOString().slice(0, 10)).length;
    const openFollowUps = followUps.filter((f) => !f.done);
    const overdue = openFollowUps.filter((f) => f.due <= new Date().toISOString().slice(0, 10));
    const newLeads = leads.filter((l) => l.stage === "New").length;
    return { active, expiring, expired, collected, outstanding, pending, expenseTotal, todayCount, openFollowUps, overdue, newLeads };
  }, [members, payments, attendance, followUps, leads, expenses]);

  const attention = [
    { label: "Memberships expiring in 14 days", count: m.expiring, tone: "warning" as const, page: "members" },
    { label: "Memberships expired", count: m.expired, tone: "danger" as const, page: "members" },
    { label: "Pending payments to collect", count: m.pending, tone: "danger" as const, page: "payments" },
    { label: "Overdue follow-up tasks", count: m.overdue.length, tone: "warning" as const, page: "enquiries" },
    { label: "New enquiries waiting", count: m.newLeads, tone: "accent" as const, page: "enquiries" },
  ].filter((a) => a.count > 0);

  return (
    <div className="page-enter space-y-5">
      {/* Headline band */}
      <Panel className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: "Active members", value: String(m.active), sub: `${members.length} on the roster` },
          { label: "Collected this month", value: fmtINR(m.collected), sub: `Outstanding ${fmtINR(m.outstanding)}` },
          { label: "Check-ins today", value: String(m.todayCount), sub: `${Math.round((m.todayCount / Math.max(m.active, 1)) * 100)}% of active members` },
        ].map((s) => (
          <div key={s.label} className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="display-figure mt-3 text-4xl text-white md:text-5xl">{s.value}</p>
            <p className="mt-2.5 text-xs text-slate-500">{s.sub}</p>
          </div>
        ))}
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Needs attention */}
        <Panel className="lg:col-span-2">
          <SectionHead title="Needs attention" hint="Tap a row to open the records" />
          {attention.length === 0 ? (
            <EmptyState icon="✓" title="Nothing urgent" hint="Every expiring membership, due payment and follow-up is handled." />
          ) : (
            <ul>
              {attention.map((a) => (
                <li key={a.label}>
                  <button
                    onClick={() => onNavigate(a.page)}
                    className="flex w-full items-center justify-between gap-4 border-b border-white/5 px-5 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-white/4 md:px-6"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Dot tone={a.tone} />
                      <span className="truncate">{a.label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular font-bold">{a.count}</span>
                      <span className="text-slate-500">→</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Collections trend */}
        <Panel>
          <SectionHead title="Collections trend" hint="Last 6 months" />
          <div className="p-5 md:p-6">
            <div className="flex items-baseline gap-2">
              <span className="display-figure text-2xl text-white">{fmtINR(revenueHistory[revenueHistory.length - 1])}</span>
              <Badge tone="success">+7.9%</Badge>
            </div>
            <div className="mt-5">
              <Meter value={m.collected} max={350000} />
              <p className="mt-2 text-[11px] text-slate-500">Month target ₹3,50,000</p>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Expenses recorded</dt><dd className="tabular font-semibold">{fmtINR(m.expenseTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Est. operating profit</dt><dd className="tabular font-semibold text-teal-300">{fmtINR(m.collected - m.expenseTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Open follow-ups</dt><dd className="tabular font-semibold">{m.openFollowUps.length}</dd></div>
            </dl>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent payments */}
        <Panel>
          <SectionHead title="Recent transactions" action={<Button variant="ghost" onClick={() => onNavigate("payments")}>View all</Button>} />
          <ul>
            {payments.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <Avatar name={p.memberName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.memberName}</p>
                  <p className="text-[11px] text-slate-500">{p.receipt} · {p.method} · {fmtDate(p.date)}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-bold">{fmtINR(p.amount)}</p>
                  <Badge tone={p.status === "paid" ? "success" : p.status === "partial" ? "muted" : "warning"}>{p.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Latest check-ins */}
        <Panel>
          <SectionHead title="Latest check-ins" action={<Button variant="ghost" onClick={() => onNavigate("attendance")}>Attendance</Button>} />
          <ul>
            {attendance.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(a.date)}</p>
                </div>
                <span className="tabular text-sm text-slate-300">{a.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
