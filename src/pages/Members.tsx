import { useMemo, useState } from "react";
import { Avatar, Badge, Button, EmptyState, Field, Input, Modal, Panel, Select } from "@/components/ui/glass";
import { fmtINR, fmtDate, daysUntil, memberStatusTone, useStore, type Member, type Payment } from "@/lib/data";

const statusLabel: Record<Member["status"], string> = {
  active: "Active", expiring: "Expiring soon", expired: "Expired", frozen: "Frozen",
};
const filters = ["all", "active", "expiring", "expired", "frozen"] as const;

export default function Members() {
  const { members, plans, payments, attendance, employees, addMember, recordPayment, renewMember } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    return members.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || m.id.toLowerCase().includes(q);
    });
  }, [members, filter, query]);

  const selected = members.find((m) => m.id === openId) ?? null;

  return (
    <div className="page-enter space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4 md:px-6">
          <Input
            placeholder="Search name, phone or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  filter === f ? "bg-teal-400/90 text-teal-950" : "bg-white/6 text-slate-300 hover:bg-white/12"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button className="ml-auto" onClick={() => setAdding(true)}>Add member</Button>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon="🔍" title="No members found" hint="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold md:px-6">Member</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Valid till</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 md:px-6" />
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => {
                  const plan = plans.find((p) => p.id === m.planId);
                  return (
                    <tr key={m.id} className="border-t border-white/5 transition-colors hover:bg-white/4">
                      <td className="px-5 py-3 md:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{m.name}</p>
                            <p className="text-[11px] text-slate-500">{m.id} · {m.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{plan?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="tabular">{fmtDate(m.ends)}</span>
                        <span className="ml-2 text-[11px] text-slate-500">{daysUntil(m.ends) < 0 ? "ended" : `in ${daysUntil(m.ends)}d`}</span>
                      </td>
                      <td className="tabular px-4 py-3">
                        {m.balance > 0 ? <span className="font-semibold text-rose-300">{fmtINR(m.balance)}</span> : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3"><Badge tone={memberStatusTone(m.status)}>{statusLabel[m.status]}</Badge></td>
                      <td className="px-5 py-3 text-right md:px-6">
                        <Button variant="ghost" onClick={() => setOpenId(m.id)}>View</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AddMemberModal open={adding} onClose={() => setAdding(false)} onSave={addMember} plans={plans} />
      {selected && (
        <MemberDrawer
          member={selected}
          payments={payments.filter((p) => p.memberId === selected.id)}
          visits={attendance.filter((a) => a.memberId === selected.id).length}
          trainerName={employees.find((e) => e.id === selected.trainerId)?.name ?? null}
          onClose={() => setOpenId(null)}
          onRecordPayment={(amount, method) => recordPayment({ memberId: selected.id, amount, method })}
          onRenew={() => renewMember(selected.id)}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  open, onClose, onSave, plans,
}: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["addMember"];
  plans: ReturnType<typeof useStore>["plans"];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("UPI");

  const plan = plans.find((p) => p.id === planId);
  const owed = (plan?.price ?? 0) + (plan?.joiningFee ?? 0);
  const paidNum = Number(paid) || 0;

  const submit = () => {
    if (!name.trim() || !phone.trim()) return;
    onSave({ name: name.trim(), phone: phone.trim(), planId, paid: paidNum, method });
    setName(""); setPhone(""); setPaid("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <div className="space-y-4">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun Mehta" /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98200 00000" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan">
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtINR(p.price)}</option>)}
            </Select>
          </Field>
          <Field label={`Amount received (due ${fmtINR(owed)})`}>
            <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(owed)} />
          </Field>
        </div>
        <Field label="Payment method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>
            {["UPI", "Cash", "Card", "Bank transfer"].map((mm) => <option key={mm}>{mm}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || !phone.trim()}>Register member</Button>
        </div>
      </div>
    </Modal>
  );
}

function MemberDrawer({
  member, payments, visits, trainerName, onClose, onRecordPayment, onRenew,
}: {
  member: Member;
  payments: Payment[];
  visits: number;
  trainerName: string | null;
  onClose: () => void;
  onRecordPayment: (amount: number, method: Payment["method"]) => void;
  onRenew: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("UPI");
  const plan = useStore().plans.find((p) => p.id === member.planId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <aside
        className="glass pop-enter h-full w-full max-w-md overflow-y-auto rounded-none border-y-0 border-r-0 p-6"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Member ${member.name}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} className="h-11 w-11 text-sm" />
            <div>
              <h3 className="text-lg font-bold tracking-tight">{member.name}</h3>
              <p className="text-xs text-slate-500">{member.id} · {member.phone}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Panel className="p-4"><p className="text-[11px] text-slate-500">Plan</p><p className="mt-1 text-sm font-bold">{plan?.name}</p></Panel>
          <Panel className="p-4"><p className="text-[11px] text-slate-500">Valid till</p><p className="tabular mt-1 text-sm font-bold">{fmtDate(member.ends)}</p></Panel>
          <Panel className="p-4"><p className="text-[11px] text-slate-500">Visits this month</p><p className="tabular mt-1 text-sm font-bold">{visits}</p></Panel>
          <Panel className="p-4"><p className="text-[11px] text-slate-500">Trainer</p><p className="mt-1 text-sm font-bold">{trainerName ?? "Not assigned"}</p></Panel>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/4 px-4 py-3 ring-1 ring-white/8">
          <span className="text-sm text-slate-300">Outstanding balance</span>
          <span className={`tabular text-sm font-bold ${member.balance > 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {member.balance > 0 ? fmtINR(member.balance) : "Clear"}
          </span>
        </div>

        <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">Record a payment</h4>
        <div className="flex gap-2">
          <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])} className="max-w-28">
            {["UPI", "Cash", "Card", "Bank transfer"].map((mm) => <option key={mm}>{mm}</option>)}
          </Select>
          <Button
            disabled={!amount || Number(amount) <= 0}
            onClick={() => { onRecordPayment(Number(amount), method); setAmount(""); }}
          >
            Save
          </Button>
        </div>

        {(member.status === "expired" || member.status === "expiring") && (
          <Button variant="ghost" className="mt-3 w-full" onClick={onRenew}>Renew for 30 days</Button>
        )}

        <h4 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">Payment history</h4>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-white/4 px-3.5 py-2.5 text-sm ring-1 ring-white/6">
                <div>
                  <p className="tabular font-semibold">{fmtINR(p.amount)}</p>
                  <p className="text-[11px] text-slate-500">{p.receipt} · {p.method} · {fmtDate(p.date)}</p>
                </div>
                <Badge tone={p.status === "paid" ? "success" : p.status === "partial" ? "muted" : "warning"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
