import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const dashboardMetrics = [
  { id: 1, label: "Active Members", value: "1,247", trend: "+12 today", icon: "Users", color: "primary" },
  { id: 2, label: "New Registrations", value: "24", trend: "+8 this week", icon: "UserPlus", color: "secondary" },
  { id: 3, label: "Expiring Memberships", value: "15", trend: "+3 this week", icon: "CalendarX", color: "destructive" },
  { id: 4, label: "Monthly Collections", value: "$42,300", trend: "+5% vs last month", icon: "DollarSign", color: "primary" },
  { id: 5, label: "Pending Payments", value: "$3,800", trend: "+2% vs last month", icon: "Clock", color: "warning" },
  { id: 6, label: "Today's Attendance", value: "47", trend: "+12 vs yesterday", icon: "Calendar", color: "primary" },
  { id: 7, label: "Recorded Expenses", value: "$8,500", trend: "this month", icon: "Folder", color: "secondary" },
  { id: 8, label: "Est. Operating Profit", value: "$33,800", trend: "+15% vs last month", icon: "TrendingUp", color: "primary" },
  { id: 9, label: "New Enquiries", value: "33", trend: "+5 today", icon: "MessageCircle", color: "secondary" },
  { id: 10, label: "Pending Follow-ups", value: "12", trend: "overdue: 3", icon: "AlertCircle", color: "destructive" },
  { id: 11, label: "Outstanding Staff Tasks", value: "28", trend: "+4 today", icon: "Gavel", color: "primary" },
  { id: 12, label: "Member Retention Rate", value: "87%", trend: "+3% this month", icon: "Heart", color: "secondary" },
];

export default function Dashboard() {
  const [search, setSearch] = useState("");

  const filteredMetrics = dashboardMetrics.filter((m) =>
    m.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">GymOS — Gym Management Platform</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20 7l-8-8-8 8 1.41 1.41L4 11.83l7.59 7.59L20 7z" />
                </svg>
                Profile
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <Input
            placeholder="Search metrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMetrics.map((metric) => (
            <Card key={metric.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-xl font-semibold">{metric.value}</p>
                </div>
                <svg
                  className={`h-6 w-6 ${metric.color === "destructive" ? "text-destructive" : metric.color === "primary" ? "text-primary" : "text-secondary"}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 9l9 6 9-6v2H3v-2z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {metric.trend}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <h2 className="text-semibold mb-4">New Enquiry</h2>
            <Input placeholder="Enter enquiry name" className="w-full" />
            <Button className="mt-2">Assign Follow-up</Button>
          </Card>

          <Card>
            <h2 className="text-semibold mb-4">Record Attendance</h2>
            <Input placeholder="Member ID or name" className="w-full" />
            <Button className="mt-2">Check-in</Button>
          </Card>
        </div>
      </main>
    </div>
  );
}