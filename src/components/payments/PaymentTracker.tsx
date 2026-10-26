"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function PaymentTracker() {
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
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
    setStatusFilter(e.target.value);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMethodFilter(e.target.value);
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
        <h2 className="text-semibold mb-4">Payment Records</h2>

        {payments.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No payment records found.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-full rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-semibold px-6 py-3">Date</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Member</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Amount</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Method</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Reference</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-border">
                  <td className="text-sm px-6 py-3">{payment.date}</td>
                  <td className="text-sm font-medium px-6 py-3">{payment.memberName}</td>
                  <td className="text-sm font-semibold px-6 py-3">₹{payment.amount}</td>
                  <td className="text-sm px-6 py-3">{payment.method}</td>
                  <td className="text-sm px-6 py-3">{payment.reference || "—"}</td>
                  <td className="text-sm px-6 py-3">
                    <span className={
                      payment.status === "paid"
                        ? "inline-flex items-center rounded bg-primary/10 text-primary"
                        : payment.status === "pending"
                        ? "inline-flex items-center rounded bg-secondary/10 text-secondary"
                        : "inline-flex items-center rounded bg-destructive/10 text-destructive"
                    }>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <Button variant="primary" className="w-full md:w-auto">
          Record New Payment
        </Button>
      </div>
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