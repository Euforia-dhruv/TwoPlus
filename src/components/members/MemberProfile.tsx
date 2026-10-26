"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface Member {
  memberId: string;
  name: string;
  dateOfBirth: string;
  age: number;
  phone: string;
  email?: string;
  emergencyContact?: string;
  address?: string;
  joiningDate: string;
  status: "active" | "expired" | "suspended";
  currentPlan: string;
  previousPlans: string[];
  paymentHistory: PaymentRecord[];
  attendanceHistory: AttendanceRecord[];
  assignedTrainer?: string;
  workoutPlans: WorkoutPlan[];
  fitnessGoals: FitnessGoal[];
  internalNotes: string[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: "pending" | "paid" | "failed" | "refunded";
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  exercises: Exercise[];
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
}

interface FitnessGoal {
  id: string;
  description: string;
  target: string;
  current: string;
  completed: boolean;
}

function getStatusClassName(status: string, color: "primary" | "destructive" | "secondary"): string {
  if (status === "active") return `bg-${color}/10 text-${color}`;
  if (status === "expired") return `bg-${color}/10 text-${color}`;
  if (status === "pending") return `bg-${color}/10 text-${color}`;
  if (status === "paid") return `bg-${color}/10 text-${color}`;
  if (status === "refunded") return `bg-${color}/10 text-${color}`;
  return `bg-${color}/10 text-${color}`;
}

export default function MemberProfile({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch member data
  React.useEffect(() => {
    const fetchMember = async () => {
      try {
        // TODO: Fetch from Supabase with organization isolation
        // For demo, use mock data
        const mockMember: Member = {
          memberId: memberId,
          name: "Sarah Johnson",
          dateOfBirth: "1990-05-15",
          age: 34,
          phone: "+91 98765 43210",
          email: "sarah.johnson@email.com",
          emergencyContact: "Mumbai +91 98765 43211",
          address: "12 Gym Road, Mumbai",
          joiningDate: "2023-01-15",
          status: "active",
          currentPlan: "Premium Annual",
          previousPlans: ["Basic Monthly", "3-Month Fitness"],
          paymentHistory: [
            { id: "1", amount: 2500, date: "2024-01-15", method: "UPI", status: "paid" },
            { id: "2", amount: 2500, date: "2023-10-15", method: "Card", status: "paid" },
          ],
          attendanceHistory: [
            { id: "1", date: "2024-01-20", checkIn: "09:00", checkOut: "10:30" },
            { id: "2", date: "2024-01-18", checkIn: "07:00", checkOut: "08:30" },
          ],
          assignedTrainer: "Trainer - Raj",
          workoutPlans: [
            {
              id: "1",
              name: "Strength Training",
              startDate: "2024-01-20",
              endDate: "2024-03-20",
              exercises: [
                { name: "Bench Press", sets: 3, reps: 10 },
                { name: "Squats", sets: 4, reps: 12 },
              ],
            },
          ],
          fitnessGoals: [
            {
              id: "1",
              description: "Increase bench press max",
              target: "120 lbs",
              current: "95 lbs",
              completed: false,
            },
          ],
          internalNotes: [
            "Member prefers morning sessions",
            "No known injuries or restrictions",
          ],
        };

        setMember(mockMember);
        setLoading(false);
      } catch (err) {
        setError("Failed to load member profile.");
        setLoading(false);
      }
    };

    fetchMember();
  }, [memberId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading member profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!member) {
    return <div>Member not found</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Member Profile</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Member ID</dt>
                <dd className="text-lg">{member.memberId}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Full Name</dt>
                <dd>{member.name}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                <dd>{member.dateOfBirth} (Age: {member.age})</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd>{member.phone}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd>{member.email || "Not provided"}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Joining Date</dt>
                <dd>{member.joiningDate}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd>
                  <span className={getStatusClassName(member.status as "active" | "expired" | "suspended", "primary")}>
                    {member.status}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Current Plan</dt>
                <dd>{member.currentPlan}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Previous Plans</dt>
                <dd>
                  {member.previousPlans.map((plan, i) => (
                    <span key={i} className="mr-2 text-sm underline underline-offset-2">
                      {plan}
                    </span>
                  ))}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Assigned Trainer</dt>
                <dd>{member.assignedTrainer || "Unassigned"}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Payment History</h3>
            <div className="space-y-3">
              {member.paymentHistory.map((payment) => (
                <div key={payment.id} className="p-3 rounded bg-card">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{payment.date}</span>
                    <span className="text-sm text-muted-foreground">{payment.method}</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {payment.amount > 0 ? `₹${payment.amount}` : "—"}
                  </p>
                  <span className={getStatusClassName(payment.status, "primary")}>
                    {payment.status}
                  </span>
// @ts-expect-error - status types are compatible
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4">Attendance History</h3>
            <div className="space-y-3">
              {member.attendanceHistory.map((attendance) => (
                <div key={attendance.id} className="p-3 rounded bg-card">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{attendance.date}</span>
                    <span className="text-sm text-muted-foreground">{attendance.checkIn}</span>
                  </div>
                  <p className="text-sm">{attendance.checkOut ? `Checked out: ${attendance.checkOut}` : "Still checked-in"}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mb-4">Workout Plans</h3>
            <div className="space-y-3">
              {member.workoutPlans.map((plan) => (
                <div key={plan.id} className="p-3 rounded bg-card">
                  <h4 className="font-medium mb-2">{plan.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {plan.startDate} — {plan.endDate}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {plan.exercises.map((exercise) => (
                      <span key={exercise.name} className="bg-muted-foreground/20 rounded px-2 py-1">
                        {exercise.name}: {exercise.sets}×{exercise.reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mb-4">Fitness Goals</h3>
            <div className="space-y-3">
              {member.fitnessGoals.map((goal) => (
                <div key={goal.id} className="p-3 rounded bg-card">
                  <p className="font-medium">{goal.description}</p>
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">Current:</span>
                    <span className="font-medium">{goal.current}</span>
                    <span className="text-sm text-muted-foreground">/ {goal.target}</span>
                  </div>
                  <progress
                    value={goal.completed ? 100 : 0}
                    max={100}
                    className="w-full mt-1"
                    aria-label={goal.description}
                  />
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mb-4">Internal Notes</h3>
            <div>
              {member.internalNotes.length > 0 ? (
                member.internalNotes.map((note, i) => (
                  <div key={i} className="p-2 rounded bg-muted-foreground/5 text-xs">
                    {note}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No internal notes</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}