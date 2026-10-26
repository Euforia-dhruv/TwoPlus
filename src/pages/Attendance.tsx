import { useMemo, useState } from "react";
import { Avatar, Badge, Bars, Button, EmptyState, Input, Panel, SectionHead } from "@/components/ui/glass";
import { fmtDate, iso, useStore } from "@/lib/data";

export default function Attendance() {
  const { attendance, members, checkIn } = useStore();
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const today = iso(0);
  const todayLog = attendance.filter((a) => a.date === today);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = iso(i - 6);
      return { label: fmtDate(d), value: attendance.filter((a) => a.date === d).length };
    });
  }, [attendance]);

  const stale = members.filter((m) => {
    if (m.status === "expired" || m.status === "frozen") return false;
    return !m.lastVisit || m.lastVisit < iso(-7);
  });

  const submit = () => {
    if (!entry.trim()) return;
    const err = checkIn(entry.trim());
    setMessage(err ? { text: err, ok: false } : { text: `Checked in — welcome, ${entry.trim()}!`, ok: true });
    setEntry("");
  };

  return (
    <div className="page-enter space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Check-in */}
        <Panel className="lg:col-span-1">
          <SectionHead title="Quick check-in" hint="Member ID or full name" />
          <div className="p-5 md:p-6">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <Input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="GYM-0001 or Arjun Mehta" />
              <Button type="submit">Check in</Button>
            </form>
            {message && (
              <p className={`mt-3 text-sm font-semibold ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p>
            )}
            <div className="mt-6 rounded-xl bg-white/4 p-4 ring-1 ring-white/8">
              <p className="display-figure text-3xl text-white">{todayLog.length}</p>
              <p className="mt-1 text-xs text-slate-500">check-ins today · {new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p>
            </div>
          </div>
        </Panel>

        {/* Week trend */}
        <Panel className="lg:col-span-2">
          <SectionHead title="This week's footfall" hint="Check-ins per day" />
          <div className="p-5 md:p-6">
            <Bars data={week} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHead title="Today's log" hint={`${todayLog.length} visits recorded`} />
          {todayLog.length === 0 ? (
            <EmptyState icon="🕐" title="No check-ins yet" hint="Front desk can check members in by ID or name." />
          ) : (
            <ul>
              {todayLog.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="text-[11px] text-slate-500">{a.memberId}</p>
                  </div>
                  <span className="tabular text-sm text-slate-300">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionHead title="Haven't visited in 7+ days" hint="Active members at risk of dropping off" />
          {stale.length === 0 ? (
            <EmptyState icon="💪" title="Everyone is showing up" hint="No active member has been away for more than a week." />
          ) : (
            <ul>
              {stale.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Last visit {m.lastVisit ? fmtDate(m.lastVisit) : "never"}
                      </p>
                    </div>
                  </div>
                  <Badge tone="warning">{m.lastVisit ? Math.max(Math.round((Date.now() - new Date(m.lastVisit + "T00:00:00").getTime()) / 86400000), 7) : 30}+ days</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
