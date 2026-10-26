import { useState } from "react";
import { Badge, Button, Field, Input, Meter, Modal, Panel, SectionHead, Select } from "@/components/ui/glass";
import { useStore } from "@/lib/data";

export default function Programs() {
  const { workouts, classes, members, employees, addWorkout, bookClass } = useStore();
  const [adding, setAdding] = useState(false);
  const trainers = employees.filter((e) => e.role === "Trainer");

  return (
    <div className="page-enter space-y-5">
      <Panel>
        <SectionHead
          title="Workout plans"
          hint="Assigned programs and their blocks"
          action={<Button onClick={() => setAdding(true)}>New plan</Button>}
        />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-6">
          {workouts.map((w) => (
            <div key={w.id} className="rounded-xl bg-white/4 p-4 ring-1 ring-white/8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{w.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{w.goal} · {w.weeks} weeks</p>
                </div>
                <Badge tone="accent">{w.memberName}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">
                {w.sessions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400/70" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                By {employees.find((e) => e.id === w.trainerId)?.name}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHead title="Class timetable" hint="Capacity is enforced at booking" />
        <ul>
          {classes.map((c) => {
            const full = c.booked >= c.capacity;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/5 px-5 py-4 last:border-0 md:px-6">
                <div className="min-w-44 flex-1">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.day} · {c.time} · {employees.find((e) => e.id === c.trainerId)?.name}</p>
                </div>
                <div className="min-w-40 flex-1">
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className={full ? "font-semibold text-amber-300" : "text-slate-500"}>
                      {full ? "Full" : `${c.capacity - c.booked} spots left`}
                    </span>
                    <span className="tabular text-slate-500">{c.booked}/{c.capacity}</span>
                  </div>
                  <Meter value={c.booked} max={c.capacity} tone={full ? "warning" : "accent"} />
                </div>
                <Button variant="ghost" disabled={full} onClick={() => bookClass(c.id)}>
                  Book member
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <AddWorkoutModal open={adding} onClose={() => setAdding(false)} onSave={addWorkout} members={members} trainers={trainers} />
    </div>
  );
}

function AddWorkoutModal({ open, onClose, onSave, members, trainers }: {
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useStore>["addWorkout"];
  members: ReturnType<typeof useStore>["members"];
  trainers: ReturnType<typeof useStore>["employees"];
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? "");

  return (
    <Modal open={open} onClose={onClose} title="New workout plan">
      <div className="space-y-4">
        <Field label="Plan name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Foundation Strength" /></Field>
        <Field label="Goal"><Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Build base strength" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Weeks"><Input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></Field>
          <Field label="Member">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Trainer">
            <Select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || !goal.trim()} onClick={() => { onSave({ name: name.trim(), goal: goal.trim(), weeks: Number(weeks) || 4, memberId, trainerId }); setName(""); setGoal(""); onClose(); }}>
            Create plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
