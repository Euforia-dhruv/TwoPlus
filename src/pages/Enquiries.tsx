import { useState } from "react";
import { Badge, Button, Field, Input, Modal, Panel, SectionHead, Select } from "@/components/ui/glass";
import { fmtDate, useStore, type Lead, type LeadStage } from "@/lib/data";

const stages: LeadStage[] = ["New", "Contacted", "Trial", "Converted", "Lost"];
const nextStage: Record<LeadStage, { label: string; stage: LeadStage; tone: "primary" | "ghost" } | null> = {
  New: { label: "Mark contacted", stage: "Contacted", tone: "primary" },
  Contacted: { label: "Book trial", stage: "Trial", tone: "primary" },
  Trial: { label: "Convert", stage: "Converted", tone: "primary" },
  Converted: null,
  Lost: { label: "Reopen", stage: "New", tone: "ghost" },
};

export default function Enquiries() {
  const { leads, followUps, employees, addLead, moveLead, toggleFollowUp } = useStore();
  const [adding, setAdding] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const open = followUps.filter((f) => !f.done).sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="page-enter space-y-5">
      {/* Pipeline */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stages.map((stage) => {
          const cards = leads.filter((l) => l.stage === stage);
          return (
            <Panel key={stage} className="flex flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <h3 className="text-[13px] font-bold">{stage}</h3>
                <Badge tone={stage === "Converted" ? "success" : stage === "Lost" ? "danger" : stage === "New" ? "accent" : "muted"}>
                  {cards.length}
                </Badge>
              </div>
              <div className="flex-1 space-y-2 p-3">
                {cards.length === 0 && <p className="px-1 py-3 text-xs text-slate-600">Empty</p>}
                {cards.map((l) => (
                  <div key={l.id} className="rounded-xl bg-white/4 p-3 ring-1 ring-white/8">
                    <p className="text-sm font-semibold">{l.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{l.source} · wants {l.interest}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{employees.find((e) => e.id === l.ownerId)?.name}</p>
                    {l.note && <p className="mt-1.5 text-[11px] italic text-slate-400">{l.note}</p>}
                    {nextStage[stage] && (
                      <Button
                        variant={nextStage[stage]!.tone}
                        className="mt-2.5 h-7 w-full px-2 text-[11px]"
                        onClick={() => moveLead(l.id, nextStage[stage]!.stage)}
                      >
                        {nextStage[stage]!.label}
                      </Button>
                    )}
                    {stage !== "Converted" && stage !== "Lost" && (
                      <Button variant="ghost" className="mt-1.5 h-7 w-full px-2 text-[11px]" onClick={() => moveLead(l.id, "Lost")}>
                        Mark lost
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <SectionHead
          title="Follow-up tasks"
          hint={`${open.length} open · ${open.filter((f) => f.due <= today).length} due or overdue`}
          action={<Button onClick={() => setAdding(true)}>New follow-up</Button>}
        />
        <ul>
          {open.map((f) => {
            const overdue = f.due <= today;
            return (
              <li key={f.id} className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-0 md:px-6">
                <button
                  onClick={() => toggleFollowUp(f.id)}
                  aria-label="Mark done"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/25 text-transparent transition-colors hover:border-teal-300 hover:text-teal-300"
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.about}</p>
                  <p className="text-[11px] text-slate-500">{f.kind} · {employees.find((e) => e.id === f.assigneeId)?.name}</p>
                </div>
                <Badge tone={overdue ? "danger" : f.due === today ? "warning" : "muted"}>
                  {overdue ? "Overdue" : f.due === today ? "Due today" : fmtDate(f.due)}
                </Badge>
              </li>
            );
          })}
          {open.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-slate-500">All follow-ups are done. Good work.</li>
          )}
        </ul>
      </Panel>

      <AddLeadModal open={adding} onClose={() => setAdding(false)} onSave={addLead} />
    </div>
  );
}

function AddLeadModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["addLead"];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<Lead["source"]>("Walk-in");
  const [interest, setInterest] = useState("Monthly");

  return (
    <Modal open={open} onClose={onClose} title="New enquiry">
      <div className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sameer Joshi" /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98220 00000" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <Select value={source} onChange={(e) => setSource(e.target.value as Lead["source"])}>
              {["Walk-in", "Instagram", "Referral", "Local ad", "Google"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Interested in">
            <Select value={interest} onChange={(e) => setInterest(e.target.value)}>
              {["Monthly", "Quarterly", "Annual", "Personal Training"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || !phone.trim()} onClick={() => { onSave({ name: name.trim(), phone: phone.trim(), source, interest }); setName(""); setPhone(""); onClose(); }}>
            Save enquiry
          </Button>
        </div>
      </div>
    </Modal>
  );
}
