import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type Metric = {
  id: number;
  label: string;
  value: string;
  trend: string;
  tone?: "attention" | "danger" | "calm";
};

const headlineMetrics: Metric[] = [
  { id: 1, label: "Active members", value: "1,247", trend: "+12 today" },
  { id: 4, label: "Monthly collections", value: "$42,300", trend: "+5% vs last month" },
  { id: 6, label: "Attendance today", value: "47", trend: "+12 vs yesterday" },
];

const supportingMetrics: Metric[] = [
  { id: 2, label: "New registrations", value: "24", trend: "+8 this week" },
  { id: 3, label: "Expiring memberships", value: "15", trend: "+3 this week", tone: "attention" },
  { id: 5, label: "Pending payments", value: "$3,800", trend: "+2% vs last month", tone: "danger" },
  { id: 7, label: "Recorded expenses", value: "$8,500", trend: "this month" },
  { id: 8, label: "Est. operating profit", value: "$33,800", trend: "+15% vs last month" },
  { id: 9, label: "New enquiries", value: "33", trend: "+5 today" },
  { id: 10, label: "Pending follow-ups", value: "12", trend: "3 overdue", tone: "danger" },
  { id: 11, label: "Staff tasks outstanding", value: "28", trend: "+4 today" },
  { id: 12, label: "Member retention", value: "87%", trend: "+3% this month" },
];

const toneClass: Record<NonNullable<Metric["tone"]>, string> = {
  attention: "bg-warning",
  danger: "bg-destructive",
  calm: "bg-success",
};

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [enquiry, setEnquiry] = useState("");
  const [checkin, setCheckin] = useState("");

  const filtered = supportingMetrics.filter((m) =>
    m.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Headline band — the one loud moment */}
      <section className="grid grid-cols-1 divide-y divide-border rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {headlineMetrics.map((metric) => (
          <div key={metric.id} className="p-6 md:p-8">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-3 text-4xl md:text-5xl display-figure">{metric.value}</p>
            <p className="mt-3 text-sm text-muted-foreground">{metric.trend}</p>
          </div>
        ))}
      </section>

      {/* Supporting metrics — dense, table-like */}
      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-6">
          <h2 className="text-base font-bold">All metrics</h2>
          <Input
            placeholder="Filter metrics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full max-w-56 text-sm"
          />
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2">
          {filtered.map((metric, i) => (
            <li
              key={metric.id}
              className={`flex items-center justify-between gap-4 px-5 py-3.5 md:px-6 ${
                i % 2 === 0 ? "sm:border-r sm:border-border" : ""
              } ${i >= 2 ? "border-t border-border" : "border-t border-transparent sm:border-t-border"}`}
            >
              <span className="flex min-w-0 items-center gap-2.5 text-sm">
                {metric.tone && (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${toneClass[metric.tone]}`}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{metric.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="tabular text-sm font-bold">{metric.value}</span>
                <span className="w-32 text-right text-xs text-muted-foreground">
                  {metric.trend}
                </span>
              </span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-muted-foreground">
              No metrics match “{search}”.
            </li>
          )}
        </ul>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form
          className="rounded-lg border bg-card p-5 md:p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="text-base font-bold">New enquiry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log a lead and assign a follow-up.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Enquiry name"
              value={enquiry}
              onChange={(e) => setEnquiry(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="shrink-0">
              Assign follow-up
            </Button>
          </div>
        </form>

        <form
          className="rounded-lg border bg-card p-5 md:p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="text-base font-bold">Record attendance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Check a member in by name or ID.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Member ID or name"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="shrink-0">
              Check in
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}