import { useMemo, useState } from "react";
import { Avatar, Badge, Bars, Button, EmptyState, Field, Input, Modal, Panel, SectionHead, Select } from "@/components/ui/glass";
import { fmtINR, fmtDate, paymentStatusTone, useStore, type Payment } from "@/lib/data";

export default function Payments() {
  const { payments, members, revenueHistory, recordPayment } = useStore();
  const [recording, setRecording] = useState(false);

  const stats = useMemo(() => {
    const collected = payments.filter((p) => p.status !== "pending").reduce((s, p) => s + p.amount, 0);
    const outstanding = members.reduce((s, m) => s + m.balance, 0);
    const pending = payments.filter((p) => p.status === "pending");
    return { collected, outstanding, pendingCount: pending.length, pendingAmount: pending.reduce((s, p) => s + p.amount, 0) };
  }, [payments, members]);

  const dues = members.filter((m) => m.balance > 0);

  const methodMix = useMemo(() => {
    const mix: Record<string, number> = {};
    for (const p of payments) mix[p.method] = (mix[p.method] ?? 0) + p.amount;
    const total = Math.max(Object.values(mix).reduce((a, b) => a + b, 0), 1);
    return Object.entries(mix).map(([k, v]) => ({ label: k, pct: Math.round((v / total) * 100), amount: v }));
  }, [payments]);

  return (
    <div className="page-enter space-y-5">
      <Panel className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collected this month</p>
          <p className="display-figure mt-3 text-3xl text-white md:text-4xl">{fmtINR(stats.collected)}</p>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding dues</p>
          <p className="display-figure mt-3 text-3xl text-rose-300 md:text-4xl">{fmtINR(stats.outstanding)}</p>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending transactions</p>
          <p className="display-figure mt-3 text-3xl text-white md:text-4xl">{stats.pendingCount}</p>
          <p className="mt-2 text-xs text-slate-500">{fmtINR(stats.pendingAmount)} awaiting confirmation</p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead
            title="Transactions"
            hint="Every payment gets a numbered receipt"
            action={<Button onClick={() => setRecording(true)}>Record payment</Button>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold md:px-6">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 md:px-6" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 transition-colors hover:bg-white/4">
                    <td className="tabular px-5 py-3 text-slate-400 md:px-6">{p.receipt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.memberName} className="h-7 w-7 text-[10px]" />
                        <span className="font-semibold">{p.memberName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.method}</td>
                    <td className="tabular px-4 py-3 text-slate-300">{fmtDate(p.date)}</td>
                    <td className="tabular px-4 py-3 text-right font-bold">{fmtINR(p.amount)}</td>
                    <td className="px-5 py-3 text-right md:px-6">
                      <Badge tone={paymentStatusTone(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <SectionHead title="Collections trend" hint="Last 6 months" />
            <div className="p-5 md:p-6">
              <Bars data={revenueHistory.map((v, i) => ({ label: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"][i], value: v }))} format={fmtINR} />
            </div>
          </Panel>
          <Panel>
            <SectionHead title="Payment methods" hint="Share of collections" />
            <ul className="space-y-3 p-5 md:p-6">
              {methodMix.map((m) => (
                <li key={m.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">{m.label}</span>
                    <span className="tabular text-slate-500">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500/60 to-teal-300" style={{ width: `${m.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionHead title="Members with dues" hint={`${dues.length} members owe ${fmtINR(stats.outstanding)}`} />
        {dues.length === 0 ? (
          <EmptyState icon="✓" title="No outstanding dues" hint="Every member is fully paid up." />
        ) : (
          <ul>
            {dues.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-[11px] text-slate-500">{m.id} · {m.phone}</p>
                  </div>
                </div>
                <span className="tabular text-sm font-bold text-rose-300">{fmtINR(m.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RecordPaymentModal open={recording} onClose={() => setRecording(false)} onSave={recordPayment} />
    </div>
  );
}

function RecordPaymentModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["recordPayment"];
}) {
  const { members } = useStore();
  const withDues = members.filter((m) => m.balance > 0);
  const [memberId, setMemberId] = useState(withDues[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("UPI");
  const selected = members.find((m) => m.id === memberId);

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <div className="space-y-4">
        <Field label="Member">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {withDues.map((m) => <option key={m.id} value={m.id}>{m.name} — owes {fmtINR(m.balance)}</option>)}
            {withDues.length === 0 && <option value="">No members with dues</option>}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount ₹">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(selected?.balance ?? "")} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>
              {["UPI", "Cash", "Card", "Bank transfer"].map((mm) => <option key={mm}>{mm}</option>)}
            </Select>
          </Field>
        </div>
        {selected && (
          <p className="rounded-lg bg-white/4 px-3.5 py-2.5 text-xs text-slate-400 ring-1 ring-white/6">
            {selected.name} currently owes <span className="font-bold text-rose-300">{fmtINR(selected.balance)}</span>. A receipt is generated on save.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!memberId || !Number(amount)}
            onClick={() => { onSave({ memberId, amount: Number(amount), method }); setAmount(""); onClose(); }}
          >
            Save payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
