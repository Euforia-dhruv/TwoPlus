"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/dropdown-menu";
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

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = !selectedCategory || expense.category === selectedCategory?.id;
    const matchesSearch = expense.description.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCategoryChange = (category: { id: string; name: string }) => {
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

      setCategories((prev) => [...prev, selectedCategory.id]);
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
            <Select onValueChange={handleCategoryChange} className="w-full">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {expenses.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No expense records found.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-full rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-semibold px-6 py-3">Date</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Category</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Description</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Amount</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Vendor</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Payment Method</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border">
                  <td className="text-sm font-medium px-6 py-3">{expense.date}</td>
                  <td className="text-sm px-6 py-3">
                    <span className="inline-flex items-center rounded bg-primary/10 text-primary text-xs">
                      {expense.category}
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
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

interface ExpenseCategory {
  id: string;
  name: string;
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