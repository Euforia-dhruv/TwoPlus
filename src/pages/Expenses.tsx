import { useState } from "react";
import { Badge, Button, Field, Input, Modal, Panel, SectionHead, Select } from "@/components/ui/glass";
import { fmtINR, fmtDate, useStore, type Expense } from "@/lib/data";

export default function Expenses() {
  const { expenses, addExpense } = useStore();
  const [adding, setAdding] = useState(false);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + e.amount }), {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page-enter space-y-5">
      <Panel className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recorded expenses</p>
          <p className="display-figure mt-3 text-3xl text-white md:text-4xl">{fmtINR(total)}</p>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Biggest category</p>
          <p className="mt-3 text-2xl font-bold text-white">{byCategory[0]?.[0]}</p>
          <p className="mt-1 text-xs text-slate-500">{fmtINR(byCategory[0]?.[1] ?? 0)} this period</p>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Entries</p>
          <p className="display-figure mt-3 text-3xl text-white md:text-4xl">{expenses.length}</p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionHead
            title="Expense log"
            hint="Recorded costs feed the operating summary"
            action={<Button onClick={() => setAdding(true)}>Add expense</Button>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold md:px-6">Category</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 text-right font-semibold md:px-6">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-white/5 transition-colors hover:bg-white/4">
                    <td className="px-5 py-3 md:px-6"><Badge tone="muted">{e.category}</Badge></td>
                    <td className="px-4 py-3 text-slate-300">{e.note}</td>
                    <td className="tabular px-4 py-3 text-slate-300">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-slate-400">{e.method}</td>
                    <td className="tabular px-5 py-3 text-right font-bold md:px-6">{fmtINR(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionHead title="By category" hint="Share of recorded spend" />
          <ul className="space-y-3.5 p-5 md:p-6">
            {byCategory.map(([cat, amt]) => (
              <li key={cat}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{cat}</span>
                  <span className="tabular text-slate-500">{fmtINR(amt)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500/60 to-teal-300" style={{ width: `${(amt / total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <AddExpenseModal open={adding} onClose={() => setAdding(false)} onSave={addExpense} />
    </div>
  );
}

function AddExpenseModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["addExpense"];
}) {
  const [category, setCategory] = useState("Rent");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Expense["method"]>("UPI");

  return (
    <Modal open={open} onClose={onClose} title="Add expense">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {["Rent", "Salaries", "Electricity", "Water", "Internet", "Maintenance", "Equipment", "Cleaning", "Marketing", "Software", "Other"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount ₹"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" /></Field>
        </div>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" /></Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as Expense["method"])}>
            {["UPI", "Cash", "Bank transfer"].map((mm) => <option key={mm}>{mm}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!Number(amount) || !note.trim()} onClick={() => { onSave({ category, note: note.trim(), amount: Number(amount), method }); setNote(""); setAmount(""); onClose(); }}>
            Save expense
          </Button>
        </div>
      </div>
    </Modal>
  );
}
