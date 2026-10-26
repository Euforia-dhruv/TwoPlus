import { useState } from "react";
import { Badge, Button, Field, Input, Meter, Modal, Panel, SectionHead } from "@/components/ui/glass";
import { fmtINR, useStore } from "@/lib/data";

export default function Memberships() {
  const { plans, members, addPlan } = useStore();
  const [adding, setAdding] = useState(false);

  const lifecycle = [
    { label: "Active", count: members.filter((m) => m.status === "active").length, tone: "success" as const },
    { label: "Expiring soon", count: members.filter((m) => m.status === "expiring").length, tone: "warning" as const },
    { label: "Expired", count: members.filter((m) => m.status === "expired").length, tone: "danger" as const },
    { label: "Frozen", count: members.filter((m) => m.status === "frozen").length, tone: "muted" as const },
  ];

  return (
    <div className="page-enter space-y-5">
      {/* Lifecycle states */}
      <Panel className="grid grid-cols-2 divide-x divide-y divide-white/8 md:grid-cols-4 md:divide-y-0">
        {lifecycle.map((l) => (
          <div key={l.label} className="p-5 md:p-6">
            <Badge tone={l.tone}>{l.label}</Badge>
            <p className="display-figure mt-3 text-3xl text-white">{l.count}</p>
          </div>
        ))}
      </Panel>

      <Panel>
        <SectionHead
          title="Membership plans"
          hint="Price, joining fee and availability"
          action={<Button onClick={() => setAdding(true)}>New plan</Button>}
        />
        <ul>
          {plans.map((p) => {
            const revenue = p.price * p.members;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/5 px-5 py-4 last:border-0 md:px-6">
                <div className="min-w-40 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="font-bold">{p.name}</p>
                    {!p.openForNew && <Badge tone="muted">Closed</Badge>}
                    {p.joiningFee > 0 && <Badge tone="accent">+{fmtINR(p.joiningFee)} joining</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}</p>
                </div>
                <div className="min-w-20">
                  <p className="text-[11px] text-slate-500">Price</p>
                  <p className="tabular text-sm font-bold">{fmtINR(p.price)}</p>
                </div>
                <div className="min-w-20">
                  <p className="text-[11px] text-slate-500">Members</p>
                  <p className="tabular text-sm font-bold">{p.members}</p>
                </div>
                <div className="min-w-36 flex-1">
                  <p className="mb-1.5 text-[11px] text-slate-500">Active revenue {fmtINR(revenue)}</p>
                  <Meter value={revenue} max={Math.max(...plans.map((x) => x.price * x.members), 1)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <AddPlanModal open={adding} onClose={() => setAdding(false)} onSave={addPlan} />
    </div>
  );
}

function AddPlanModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["addPlan"];
}) {
  const [name, setName] = useState("");
  const [months, setMonths] = useState("1");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("0");

  return (
    <Modal open={open} onClose={onClose} title="New membership plan">
      <div className="space-y-4">
        <Field label="Plan name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Half-yearly" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Months"><Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
          <Field label="Price ₹"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" /></Field>
          <Field label="Joining fee ₹"><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim() || !Number(price)}
            onClick={() => { onSave({ name: name.trim(), durationMonths: Number(months) || 1, price: Number(price), joiningFee: Number(fee) || 0 }); setName(""); setPrice(""); onClose(); }}
          >
            Create plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
