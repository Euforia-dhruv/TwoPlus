import { Avatar, Badge, Panel, SectionHead } from "@/components/ui/glass";
import { fmtINR, useStore } from "@/lib/data";

const roleTone = {
  Owner: "accent", Manager: "accent", Trainer: "success", Receptionist: "muted", Finance: "muted",
} as const;

export default function Staff() {
  const { employees, members, workouts } = useStore();
  const trainers = employees.filter((e) => e.role === "Trainer");
  const others = employees.filter((e) => e.role !== "Trainer");

  return (
    <div className="page-enter space-y-5">
      {/* Trainers */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {trainers.map((t) => {
          const clients = members.filter((m) => m.trainerId === t.id);
          const plans = workouts.filter((w) => w.trainerId === t.id);
          return (
            <Panel key={t.id} interactive className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Avatar name={t.name} className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.phone} · {t.shift} shift</p>
                </div>
                <Badge tone="success">Trainer</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/4 py-3 ring-1 ring-white/6">
                  <p className="display-figure text-xl text-white">{clients.length}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">Clients</p>
                </div>
                <div className="rounded-xl bg-white/4 py-3 ring-1 ring-white/6">
                  <p className="display-figure text-xl text-white">{plans.length}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">Workout plans</p>
                </div>
                <div className="rounded-xl bg-white/4 py-3 ring-1 ring-white/6">
                  <p className="display-figure text-xl text-white">{t.clients ?? 0}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">PT sessions</p>
                </div>
              </div>
              {clients.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {clients.map((c) => (
                    <span key={c.id} className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/8">{c.name}</span>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Other staff */}
      <Panel>
        <SectionHead title="Team" hint="Roles, shifts and payroll" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold md:px-6">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 text-right font-semibold md:px-6">Monthly salary</th>
              </tr>
            </thead>
            <tbody>
              {others.map((e) => (
                <tr key={e.id} className="border-t border-white/5 transition-colors hover:bg-white/4">
                  <td className="px-5 py-3 md:px-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} className="h-7 w-7 text-[10px]" />
                      <span className="font-semibold">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={roleTone[e.role]}>{e.role}</Badge></td>
                  <td className="px-4 py-3 text-slate-300">{e.shift}</td>
                  <td className="tabular px-4 py-3 text-slate-300">{e.phone}</td>
                  <td className="tabular px-5 py-3 text-right font-semibold md:px-6">{e.salary ? fmtINR(e.salary) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
