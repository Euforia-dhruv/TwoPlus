"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const seedMembers: Member[] = [
  { memberId: "M-0034", name: "Aarav Mehta", phone: "+91 98200 11223", email: "aarav.mehta@example.com", status: "active", assignedTrainer: "trainer-1" },
  { memberId: "M-0058", name: "Priya Sharma", phone: "+91 98765 44321", email: "priya.s@example.com", status: "active", assignedTrainer: "trainer-2" },
  { memberId: "M-0072", name: "Rohan Das", phone: "+91 90045 88127", status: "suspended", assignedTrainer: "unassigned" },
  { memberId: "M-0019", name: "Sneha Iyer", phone: "+91 91234 55667", email: "sneha.iyer@example.com", status: "expired", assignedTrainer: "trainer-1" },
  { memberId: "M-0090", name: "Vikram Rao", phone: "+91 99887 22110", status: "active", assignedTrainer: "trainer-2" },
];

export default function MemberList() {
  const [search, setSearch] = useState("");
  const [members] = useState<Member[]>(seedMembers);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "suspended">("all");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "trainer-1" | "trainer-2" | "unassigned">("all");


  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.memberId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesAssigned = assignedFilter === "all" || member.assignedTrainer === assignedFilter;
    return matchesSearch && matchesStatus && matchesAssigned;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as "all" | "active" | "expired" | "suspended");
  };

  const handleAssignedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAssignedFilter(e.target.value as "all" | "trainer-1" | "trainer-2" | "unassigned");
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-semibold mb-4">Member Management</h2>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Search</label>
            <Input
              placeholder="Name, phone, or member ID"
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
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Assigned Trainer</label>
            <select
              value={assignedFilter}
              onChange={handleAssignedChange}
              className="w-full rounded-md border border-input py-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Trainers</option>
              <option value="trainer-1">Trainer 1</option>
              <option value="trainer-2">Trainer 2</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-semibold">Member List</h2>
          <Button variant="primary">Add New Member</Button>
        </div>

        {filteredMembers.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {members.length === 0
                ? "No members yet. Add your first member to get started."
                : "No members match your search and filters."}
            </p>
          </div>
        )}

        {filteredMembers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full whitespace-nowrap rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Member ID</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Assigned Trainer</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.memberId} className="border-b transition-colors hover:bg-muted/60">
                  <td className="text-xs font-medium px-6 py-3">{member.memberId}</td>
                  <td className="text-xs font-medium px-6 py-3">{member.name}</td>
                  <td className="text-xs px-6 py-3">{member.phone}</td>
                  <td className="text-xs px-6 py-3">{member.email || "—"}</td>
                  <td className="text-xs px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        member.status === "active"
                          ? "bg-success/10 text-success"
                          : member.status === "expired"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="text-xs px-6 py-3">{member.assignedTrainer || "Unassigned"}</td>
                  <td className="text-xs font-medium px-6 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">View</Button>
                      <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                    </div>
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

interface Member {
  memberId: string;
  name: string;
  phone: string;
  email?: string;
  status: "active" | "expired" | "suspended";
  assignedTrainer?: string;
}