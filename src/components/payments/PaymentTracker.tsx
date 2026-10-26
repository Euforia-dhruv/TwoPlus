"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const seedPayments: PaymentRecord[] = [
  { id: "PAY-1041", date: "2026-10-26", memberId: "M-0034", memberName: "Aarav Mehta", amount: 2500, method: "upi", reference: "UPI-88213", status: "paid" },
  { id: "PAY-1042", date: "2026-10-25", memberId: "M-0058", memberName: "Priya Sharma", amount: 3000, method: "card", reference: "CARD-4417", status: "paid" },
  { id: "PAY-1043", date: "2026-10-24", memberId: "M-0072", memberName: "Rohan Das", amount: 1800, method: "cash", reference: "", status: "pending" },
  { id: "PAY-1044", date: "2026-10-23", memberId: "M-0090", memberName: "Vikram Rao", amount: 2500, method: "upi", reference: "UPI-77109", status: "pending" },
  { id: "PAY-1045", date: "2026-10-22", memberId: "M-0019", memberName: "Sneha Iyer", amount: 2200, method: "bank", reference: "NEFT-9930", status: "pending" },
  { id: "PAY-1046", date: "2026-10-20", memberId: "M-0112", memberName: "Kabir Nair", amount: 1500, method: "card", reference: "CARD-4489", status: "failed" },
];

export default function PaymentTracker() {
  const [search, setSearch] = useState("");
  const [payments] = useState<PaymentRecord[]>(seedPayments);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "failed" | "refunded">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "cash" | "upi" | "bank" | "card">("all");

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
    const matchesSearch =
      payment.reference?.toLowerCase().includes(search.toLowerCase()) ||
      (payment.memberId && payment.memberId.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch && matchesMethod;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as "all" | "pending" | "paid" | "failed" | "refunded");
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMethodFilter(e.target.value as "all" | "cash" | "upi" | "bank" | "card");
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-semibold mb-4">Payment Tracking</h2>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Search</label>
            <Input
              placeholder="Reference ID or member"
              value={search}
              onChange={handleSearch}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full rounded-md border border-input py-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Method</label>
            <select
              value={methodFilter}
              onChange={handleMethodChange}
              className="w-full rounded-md border border-input py-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-semibold">Payment Records</h2>
          <Button variant="primary">Record New Payment</Button>
        </div>

        {filteredPayments.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {payments.length === 0
                ? "No payments yet. Record your first payment to get started."
                : "No payments match your search and filters."}
            </p>
          </div>
        )}

        {filteredPayments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full whitespace-nowrap rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Member</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Reference</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="transition-colors hover:bg-muted/60">
                  <td className="text-xs px-6 py-3">{payment.date}</td>
                  <td className="text-xs font-medium px-6 py-3">{payment.memberName}</td>
                  <td className="text-xs font-semibold px-6 py-3">₹{payment.amount}</td>
                  <td className="text-xs px-6 py-3">{payment.method}</td>
                  <td className="text-xs px-6 py-3">{payment.reference || "—"}</td>
                  <td className="text-xs px-6 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      payment.status === "paid"
                        ? "bg-success/10 text-success"
                        : payment.status === "pending"
                        ? "bg-warning/15 text-warning"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>
    </div>
  );
}

interface PaymentRecord {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: "cash" | "upi" | "bank" | "card";
  reference?: string;
  status: "pending" | "paid" | "failed" | "refunded";
}