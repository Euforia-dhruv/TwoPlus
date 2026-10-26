"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function AddMemberForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    membershipPlan: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual member creation with Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setForm({
        name: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        membershipPlan: "",
      });
    } catch (err) {
      setError("Failed to add member. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Add New Member</h2>
        
        {error && (
          <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            name="phone"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <Input
            name="email"
            type="email"
            placeholder="Email address (optional)"
            value={form.email}
            onChange={handleChange}
          />
          <Input
            name="dateOfBirth"
            type="date"
            placeholder="Date of birth"
            value={form.dateOfBirth}
            onChange={handleChange}
          />
          <Input
            name="membershipPlan"
            placeholder="Membership plan"
            value={form.membershipPlan}
            onChange={handleChange}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating member..." : "Add Member"}
          </Button>
        </form>
      </Card>
    </div>
  );
}