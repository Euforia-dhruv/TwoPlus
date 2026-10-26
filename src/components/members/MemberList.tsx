"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function MemberList() {
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

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
    setStatusFilter(e.target.value);
  };

  const handleAssignedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAssignedFilter(e.target.value);
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
        <h2 className="text-semibold mb-4">Member List</h2>
        
        {members.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No members found. Add your first member to get started.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-full rounded-md border bg-card text-card-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-semibold px-6 py-3">Member ID</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Name</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Phone</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Email</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Status</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Assigned Trainer</th>
                <th className="text-left text-sm font-semibold px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.memberId} className="border-b border-border">
                  <td className="text-sm font-medium px-6 py-3">{member.memberId}</td>
                  <td className="text-sm font-medium px-6 py-3">{member.name}</td>
                  <td className="text-sm px-6 py-3">{member.phone}</td>
                  <td className="text-sm px-6 py-3">{member.email || "—"}</td>
                  <td className="text-sm px-6 py-3">
                    <span className={`inline-flex items-center rounded bg-${member.status === "active" ? "primary" : member.status === "expired" ? "destructive" : "secondary"}/10 text-${member.status === "active" ? "primary" : member.status === "expired" ? "destructive" : "secondary"}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="text-sm px-6 py-3">{member.assignedTrainer || "Unassigned"}</td>
                  <td className="text-sm font-medium px-6 py-3">
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <Button variant="primary" className="w-full md:w-auto">
          Add New Member
        </Button>
      </div>
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