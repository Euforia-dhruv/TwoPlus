import { useState } from "react";
import { Badge, Button, Field, Input, Panel, SectionHead } from "@/components/ui/glass";
import { fmtINR, useStore } from "@/lib/data";

export default function Settings() {
  const { employees } = useStore();
  const [gym, setGym] = useState({
    name: "Iron Temple Fitness",
    address: "Shop 4, Sunrise Complex, MG Road, Pune 411001",
    phone: "98100 00001",
    hours: "05:30 – 22:30",
    currency: "INR (₹)",
    timezone: "Asia/Kolkata",
  });
  const [saved, setSaved] = useState(false);
  const [rules, setRules] = useState([
    { id: 1, label: "Membership expires in 7 days → renewal reminder", on: true },
    { id: 2, label: "Payment overdue → notify manager and finance", on: true },
    { id: 3, label: "New enquiry → assign follow-up task", on: true },
    { id: 4, label: "Trial completed → schedule conversion follow-up", on: true },
    { id: 5, label: "No visit for 14 days → flag for review", on: false },
    { id: 6, label: "Payment succeeds → update balance and generate receipt", on: true },
  ]);

  const permissions: { role: string; access: string }[] = [
    { role: "Owner", access: "Everything, including settings, roles and financial reports" },
    { role: "Manager", access: "Daily operations, enquiries, staff coordination, collections" },
    { role: "Receptionist", access: "Members, attendance, enquiries, memberships, payment entry" },
    { role: "Trainer", access: "Assigned clients, workout plans, schedules, progress" },
    { role: "Finance", access: "Payments, expenses, reports, salary records" },
    { role: "Member", access: "Own membership, receipts, workouts, bookings via portal" },
  ];

  return (
    <div className="page-enter grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel>
        <SectionHead title="Gym profile" hint="Shown on receipts and member invitations" />
        <div className="space-y-4 p-5 md:p-6">
          <Field label="Gym name"><Input value={gym.name} onChange={(e) => setGym({ ...gym, name: e.target.value })} /></Field>
          <Field label="Address"><Input value={gym.address} onChange={(e) => setGym({ ...gym, address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact phone"><Input value={gym.phone} onChange={(e) => setGym({ ...gym, phone: e.target.value })} /></Field>
            <Field label="Business hours"><Input value={gym.hours} onChange={(e) => setGym({ ...gym, hours: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency"><Input value={gym.currency} readOnly className="opacity-70" /></Field>
            <Field label="Time zone"><Input value={gym.timezone} readOnly className="opacity-70" /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}>Save changes</Button>
            {saved && <span className="text-sm font-semibold text-emerald-300">Saved.</span>}
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <SectionHead title="Automation rules" hint="Reminders run once per condition, never duplicated" />
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <span className="text-sm">{r.label}</span>
                <button
                  role="switch"
                  aria-checked={r.on}
                  aria-label={`Toggle: ${r.label}`}
                  onClick={() => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${r.on ? "bg-teal-400/80" : "bg-white/12"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${r.on ? "left-4" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHead title="Roles & permissions" hint="Enforced on the server, not just the interface" />
          <ul>
            {permissions.map((p) => (
              <li key={p.role} className="border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <div className="flex items-center gap-2.5">
                  <Badge tone="accent">{p.role}</Badge>
                  <span className="text-xs text-slate-500">
                    {employees.filter((e) => e.role === p.role).length} on the team
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{p.access}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5 md:p-6">
          <p className="text-sm font-bold">Plan: Pilot</p>
          <p className="mt-1 text-xs text-slate-500">
            Online payment gateway, payroll automation and the member mobile app arrive in later phases.
          </p>
          <p className="mt-3 text-xs text-slate-500">Monthly platform fee: <span className="font-bold text-slate-300">{fmtINR(1499)}</span></p>
        </Panel>
      </div>
    </div>
  );
}
