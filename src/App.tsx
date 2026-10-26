import { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/Dashboard";
import MemberList from "@/components/members/MemberList";
import PaymentTracker from "@/components/payments/PaymentTracker";
import ExpenseTracker from "@/components/expenses/ExpenseTracker";

type Page = "dashboard" | "members" | "payments" | "expenses";

const navItems: { id: Page; label: string; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Members" },
  { id: "payments", label: "Payments", badge: "3" },
  { id: "expenses", label: "Expenses" },
];

const pageMeta: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Today at a glance" },
  members: { title: "Members", subtitle: "Roster, statuses and trainers" },
  payments: { title: "Payments", subtitle: "Collections and dues" },
  expenses: { title: "Expenses", subtitle: "Operating costs" },
};

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <span className="flex h-8 w-8 items-center justify-center bg-sidebar-active text-sm font-extrabold text-sidebar">
            G
          </span>
          <span className="text-lg font-extrabold tracking-[-0.02em] text-white">
            GymOS
          </span>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`mb-1 flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-white/10 font-semibold text-white"
                    : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-sidebar-active" : "bg-transparent"
                    }`}
                  />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="rounded bg-sidebar-active px-1.5 py-0.5 text-[11px] font-bold text-sidebar">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-sidebar-foreground">
          {today}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] md:text-2xl">
                {pageMeta[page].title}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {pageMeta[page].subtitle}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    DB
                  </span>
                  Dhruv
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile nav strip */}
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
            {navItems.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`shrink-0 rounded px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            {page === "dashboard" && <Dashboard />}
            {page === "members" && <MemberList />}
            {page === "payments" && <PaymentTracker />}
            {page === "expenses" && <ExpenseTracker />}
          </div>
        </main>
      </div>
    </div>
  );
}