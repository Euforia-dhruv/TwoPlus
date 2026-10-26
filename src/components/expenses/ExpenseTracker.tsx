"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function ExpenseTracker() {
  const categories = [
    { id: "rent", name: "Rent" },
    { id: "salaries", name: "Salaries" },
    { id: "electricity", name: "Electricity" },
    { id: "water", name: "Water" },
    { id: "internet", name: "Internet" },
    { id: "maintenance", name: "Maintenance" },
    { id: "equipment", name: "Equipment" },
    { id: "cleaning", name: "Cleaning" },
    { id: "marketing", name: "Marketing" },
    { id: "software", name: "Software and Subscriptions" },
    { id: "other", name: "Other Operating Expenses" },
  ];

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([
    { id: "exp-1", date: "2026-10-25", category: "rent", description: "October floor rent", amount: 45000, vendor: "Shree Properties", paymentMethod: "bank", reference: "NEFT-2201", receipt: null, createdBy: "current-user" },
    { id: "exp-2", date: "2026-10-24", category: "salaries", description: "Trainer payroll — first half", amount: 32000, vendor: "Staff", paymentMethod: "bank", reference: "NEFT-2202", receipt: null, createdBy: "current-user" },
    { id: "exp-3", date: "2026-10-21", category: "electricity", description: "Monthly power bill", amount: 8600, vendor: "State Electricity Board", paymentMethod: "upi", reference: "UPI-5510", receipt: null, createdBy: "current-user" },
    { id: "exp-4", date: "2026-10-18", category: "equipment", description: "Two new kettlebells", amount: 5400, vendor: "IronWorks Gym Supply", paymentMethod: "card", reference: "CARD-7781", receipt: null, createdBy: "current-user" },
    { id: "exp-5", date: "2026-10-15", category: "cleaning", description: "Deep clean — changing rooms", amount: 3000, vendor: "Sparkle Services", paymentMethod: "cash", reference: "", receipt: null, createdBy: "current-user" },
  ]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = !selectedCategory || expense.category === selectedCategory?.id;
    const matchesSearch = expense.description.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCategoryChange = (category: { id: string; name: string } | null) => {
    setSelectedCategory(category);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleAdd = async () => {
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const newExpense: ExpenseRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split("T")[0],
        category: selectedCategory.id,
        description: "",
        amount: 0,
        paymentMethod: "cash",
        vendor: "",
        reference: "",
        receipt: null,
        createdBy: "current-user",
      };

      // TODO: Save to Supabase
      await new Promise((resolve) => setTimeout(resolve, 500));

      setExpenses((prev) => [newExpense, ...prev]);
      setSelectedCategory(null);
    } catch (err) {
      setError("Failed to add expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-semibold mb-4">Expense Management</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Category</label>
            <select
              value={selectedCategory?.id ?? ""}
              onChange={(e) =>
                handleCategoryChange(
                  categories.find((category) => category.id === e.target.value) ?? null
                )
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Search</label>
            <Input
              placeholder="Description or vendor"
              value={search}
              onChange={handleSearch}
              className="w-full"
            />
          </div>

          <div>
            <Button onClick={handleAdd} disabled={!selectedCategory} className="w-full">
              {selectedCategory ? `Add ${selectedCategory.name} Expense` : "Add Expense"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-semibold mb-4">Expense Records</h2>

        {filteredExpenses.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {expenses.length === 0
              ? "No expenses yet. Record one to start tracking operating costs."
              : "No expenses match your search and filters."}
          </div>
        )}

        {filteredExpenses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full whitespace-nowrap rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Vendor</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Payment Method</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b transition-colors hover:bg-muted/60">
                  <td className="text-sm font-medium px-6 py-3">{expense.date}</td>
                  <td className="text-sm px-6 py-3">
                    <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {categories.find((c) => c.id === expense.category)?.name ?? expense.category}
                    </span>
                  </td>
                  <td className="text-sm px-6 py-3">{expense.description || "—"}</td>
                  <td className="text-sm font-semibold px-6 py-3">₹{expense.amount}</td>
                  <td className="text-sm px-6 py-3">{expense.vendor || "—"}</td>
                  <td className="text-sm px-6 py-3">{expense.paymentMethod}</td>
                  <td className="text-sm font-medium px-6 py-3">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  paymentMethod: "cash" | "card" | "upi" | "bank" | "other";
  reference?: string;
  receipt?: File | null;
  createdBy: string;
}