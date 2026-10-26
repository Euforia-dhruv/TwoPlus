import { Badge, Button, Panel, SectionHead } from "@/components/ui/glass";
import { fmtDate, useStore, type Ticket } from "@/lib/data";
import { useState } from "react";

const statusTone = { Open: "danger", "In progress": "warning", Resolved: "success" } as const;

export default function Support() {
  const { tickets, setTicketStatus } = useStore();
  const [filter, setFilter] = useState<"all" | Ticket["status"]>("all");

  const shown = tickets.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="page-enter">
      <Panel>
        <SectionHead
          title="Support tickets"
          hint="Member-raised issues and their resolution"
          action={
            <div className="flex gap-1.5">
              {(["all", "Open", "In progress", "Resolved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === f ? "bg-teal-400/90 text-teal-950" : "bg-white/6 text-slate-300 hover:bg-white/12"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />
        {shown.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No tickets in this state.</p>
        ) : (
          <ul>
            {shown.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/5 px-5 py-4 last:border-0 md:px-6">
                <div className="min-w-56 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="font-bold">{t.subject}</p>
                    <Badge tone={statusTone[t.status]}>{t.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t.id} · {t.from} · {t.category} · raised {fmtDate(t.created)}</p>
                </div>
                <div className="flex gap-2">
                  {t.status === "Open" && (
                    <Button variant="ghost" onClick={() => setTicketStatus(t.id, "In progress")}>Start work</Button>
                  )}
                  {t.status !== "Resolved" && (
                    <Button onClick={() => setTicketStatus(t.id, "Resolved")}>Resolve</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
