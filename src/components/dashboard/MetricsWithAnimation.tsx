"use client";

import * as React from "react";
import { useDashboardMetricsAnimation } from "@/utils/animations";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const mockMetrics = [
  { id: 1, label: "Active Members", value: "1,247", color: "primary" },
  { id: 2, label: "New Registrations", value: "24", color: "secondary" },
  { id: 3, label: "Expiring Memberships", value: "15", color: "destructive" },
  { id: 4, label: "Monthly Collections", value: "$42,300", color: "primary" },
  { id: 5, label: "Pending Payments", value: "$3,800", color: "warning" },
  { id: 6, label: "Today's Attendance", value: "47", color: "primary" },
];

export default function MetricsWithAnimation() {
  const [search, setSearch] = useState("");

  const refs = React.useRef<React.RefObject<HTMLDivElement>[]>([]);

  // Register refs after render
  React.useEffect(() => {
    // Ref registration happens after DOM update
  }, []);

  // Pass refs to animation hook
  React.useEffect(() => {
    if (refs.current.length > 0) {
      useDashboardMetricsAnimation(refs.current);
    }
  }, [refs]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Gym Performance Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockMetrics.map((metric) => (
          <Card
            key={metric.id}
            ref={refs.current?.[metric.id - 1]}
            className="p-6 text-center"
          >
            <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
            <div className="text-3xl font-bold" data-value={metric.value}>
              {metric.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Input
          placeholder="Search metrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>
    </div>
  );
}