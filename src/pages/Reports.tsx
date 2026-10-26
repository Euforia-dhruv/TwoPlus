import { useMemo } from "react";
import { Badge, Bars, Panel, SectionHead } from "@/components/ui/glass";
import { fmtINR, useStore } from "@/lib/data";

export default function Reports() {
  const { revenueHistory, expenses, members, plans, leads, payments } = useStore();

  const collected = payments.filter((p) => p.status !== "pending").reduce((s, p) => s + p.amount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const outstanding = members.reduce((s, m) => s + m.balance, 0);

  const expenseBars = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const e of expenses) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [expenses]);

  const funnel = useMemo(() => {
    const total = leads.length || 1;
    const stageCount = (s: string) => leads.filter((l) => l.stage === s).length;
    return [
      { label: "Enquiries", value: total },
      { label: "Contacted", value: stageCount("Contacted") + stageCount("Trial") + stageCount("Converted") },
      { label: "Trials", value: stageCount("Trial") + stageCount("Converted") },
      { label: "Converted", value: stageCount("Converted") },
    ];
  }, [leads]);

  const planMix = plans.map((p) => ({ label: p.name, value: p.members }));

  const conversion = Math.round((leads.filter((l) => l.stage === "Converted").length / Math.max(leads.length, 1)) * 100);

  return (
    <div className="page-enter space-y-5">
      {/* Financial summary with stated basis */}
      <Panel className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          { label: "Collections", value: fmtINR(collected), hint: "Successful payments received" },
          { label: "Outstanding", value: fmtINR(outstanding), hint: "Dues minus allocated payments" },
          { label: "Recorded expenses", value: fmtINR(expenseTotal), hint: "Expenses entered this period" },
          { label: "Est. operating profit", value: fmtINR(collected - expenseTotal), hint: "Collections minus recorded expenses", accent: true },
        ].map((s) => (
          <div key={s.label} className="p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`display-figure mt-2.5 text-2xl md:text-3xl ${s.accent ? "text-teal-300" : "text-white"}`}>{s.value}</p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{s.hint}</p>
          </div>
        ))}
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHead title="Revenue by month" hint="Collections, last 6 months" />
          <div className="p-5 md:p-6">
            <Bars data={revenueHistory.map((v, i) => ({ label: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"][i], value: v }))} format={fmtINR} />
          </div>
        </Panel>
        <Panel>
          <SectionHead title="Expenses by category" hint="Where the money goes" />
          <div className="p-5 md:p-6">
            <Bars data={expenseBars} format={fmtINR} />
          </div>
        </Panel>
        <Panel>
          <SectionHead title="Lead funnel" hint="Conversion this period" action={<Badge tone="accent">{conversion}% converted</Badge>} />
          <ul className="p-5 md:p-6">
            {funnel.map((f, i) => (
              <li key={f.label} className="flex items-center gap-4">
                <span className="w-20 shrink-0 text-xs font-semibold text-slate-400">{f.label}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-white/5">
                  <div
                    className="flex h-full items-center rounded-lg bg-gradient-to-r from-teal-500/50 to-teal-300/80 px-3"
                    style={{ width: `${Math.max((f.value / funnel[0].value) * 100, 12)}%` }}
                  >
                    <span className="tabular text-[11px] font-bold text-teal-950">{f.value}</span>
                  </div>
                </div>
                {i < funnel.length - 1 && <span className="w-12 shrink-0 text-right text-[11px] text-slate-500">{Math.round((f.value / Math.max(funnel[i].value, 1)) * 100)}%</span>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionHead title="Membership mix" hint="Members per plan" />
          <div className="p-5 md:p-6">
            <Bars data={planMix} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
