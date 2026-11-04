import { supabase } from "./supabase";

/**
 * Member-facing reads.
 *
 * Every query here runs under the member's own JWT, so RLS does the tenant
 * filtering. Nothing in this file passes an organization id the client chose:
 * the member's `organization_id` comes from their own row, and the policies
 * reject anything else.
 */

export type Membership = {
  id: string;
  plan_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  price_minor: number | null;
};

export type Payment = {
  id: string;
  amount_minor: number;
  currency: string | null;
  method: string | null;
  status: string;
  paid_on: string | null;
  description: string | null;
};

export type Attendance = {
  id: string;
  check_in: string;
  check_out: string | null;
  method: string | null;
};

export type Measurement = {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  notes: string | null;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  goal: string | null;
  description: string | null;
};

export type Exercise = {
  id: string;
  plan_id: string;
  day_label: string | null;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  instructions: string | null;
  position: number | null;
};

export type WorkoutSession = {
  id: string;
  performed_on: string;
  duration_minutes: number | null;
  note: string | null;
  completed_at: string | null;
  plan_id: string | null;
};

export type DietPlan = {
  id: string;
  name: string;
  description: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
};

export type Meal = {
  id: string;
  plan_id: string;
  name: string;
  timing: string | null;
  coach_notes: string | null;
  position: number | null;
  diet_meal_items: { id: string; food_item: string; portion: string | null; notes: string | null; position: number | null }[];
};

export type ClassRow = {
  id: string;
  name: string;
  starts_at: string;
  duration_minutes: number | null;
  capacity: number | null;
  trainer_id: string | null;
};

export type Org = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string | null;
  timezone: string | null;
};

export type Staff = { id: string; name: string; job_role: string | null; phone: string | null; email: string | null };

/** Throws on error so screens can catch once, in their loader. */
async function one<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as T) ?? null;
}

async function many<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as T[]) ?? [];
}

export async function getOrg(organizationId: string) {
  return one<Org>(
    supabase
      .from("organizations")
      .select("id, name, phone, address, currency, timezone")
      .eq("id", organizationId)
      .maybeSingle(),
  );
}

export async function getMemberships(memberId: string) {
  return many<Membership>(
    supabase
      .from("member_memberships")
      .select("id, plan_name, status, start_date, end_date, price_minor")
      .eq("member_id", memberId)
      .order("start_date", { ascending: false }),
  );
}

export async function getPayments(memberId: string) {
  return many<Payment>(
    supabase
      .from("payments")
      .select("id, amount_minor, currency, method, status, paid_on, description")
      .eq("member_id", memberId)
      .order("paid_on", { ascending: false })
      .limit(24),
  );
}

export async function getAttendance(memberId: string, limit = 60) {
  return many<Attendance>(
    supabase
      .from("attendance")
      .select("id, check_in, check_out, method")
      .eq("member_id", memberId)
      .order("check_in", { ascending: false })
      .limit(limit),
  );
}

export async function getMeasurements(memberId: string) {
  return many<Measurement>(
    supabase
      .from("fitness_measurements")
      .select(
        "id, measured_on, weight_kg, height_cm, body_fat_pct, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, notes",
      )
      .eq("member_id", memberId)
      .order("measured_on", { ascending: false })
      .limit(40),
  );
}

/**
 * The active workout plan, resolved through the assignment.
 *
 * A member can have several assignments over time; `status = 'active'` plus
 * the most recent `effective_from` is the one their coach means today.
 */
export async function getActiveWorkoutPlan(memberId: string) {
  const assignments = await many<{ plan_id: string; effective_from: string | null }>(
    supabase
      .from("member_workout_assignments")
      .select("plan_id, effective_from")
      .eq("member_id", memberId)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1),
  );
  const planId = assignments[0]?.plan_id;
  if (!planId) return null;

  const plan = await one<WorkoutPlan>(
    supabase.from("workout_plans").select("id, name, goal, description").eq("id", planId).maybeSingle(),
  );
  if (!plan) return null;

  const exercises = await many<Exercise>(
    supabase
      .from("workout_exercises")
      .select("id, plan_id, day_label, exercise_name, sets, reps, rest_seconds, instructions, position")
      .eq("plan_id", planId)
      .order("position", { ascending: true }),
  );

  return { plan, exercises };
}

export async function getActiveDietPlan(memberId: string) {
  const assignments = await many<{ plan_id: string }>(
    supabase
      .from("member_diet_assignments")
      .select("plan_id")
      .eq("member_id", memberId)
      .eq("status", "active")
      .limit(1),
  );
  const planId = assignments[0]?.plan_id;
  if (!planId) return null;

  const plan = await one<DietPlan>(
    supabase
      .from("diet_plans")
      .select("id, name, description, target_calories, target_protein_g, target_carbs_g, target_fat_g")
      .eq("id", planId)
      .maybeSingle(),
  );
  if (!plan) return null;

  const meals = await many<Meal>(
    supabase
      .from("diet_meals")
      .select("id, plan_id, name, timing, coach_notes, position, diet_meal_items(id, food_item, portion, notes, position)")
      .eq("plan_id", planId)
      .order("position", { ascending: true }),
  );

  return { plan, meals };
}

export async function getUpcomingClasses(organizationId: string) {
  return many<ClassRow>(
    supabase
      .from("classes")
      .select("id, name, starts_at, duration_minutes, capacity, trainer_id")
      .eq("organization_id", organizationId)
      .gte("starts_at", new Date().toISOString())
      .in("status", ["scheduled", "active"])
      .order("starts_at", { ascending: true })
      .limit(20),
  );
}

export async function getMyBookings(memberId: string) {
  return many<{ id: string; class_id: string; status: string }>(
    supabase.from("class_bookings").select("id, class_id, status").eq("member_id", memberId),
  );
}

/** Seats taken per class, computed server-side by the 0013 RPC. */
export async function getClassSeats() {
  const { data, error } = await supabase.rpc("class_seats");
  if (error) return new Map<string, number>();
  return new Map((data as { class_id: string; booked: number }[]).map((r) => [r.class_id, r.booked]));
}

export async function bookClass(classId: string) {
  const { error } = await supabase.rpc("book_class", { p_class_id: classId });
  if (error) throw new Error(error.message);
}

export async function cancelBooking(classId: string) {
  const { error } = await supabase.rpc("cancel_class_booking", { p_class_id: classId });
  if (error) throw new Error(error.message);
}

export async function getRecentSessions(memberId: string, limit = 30) {
  return many<WorkoutSession>(
    supabase
      .from("workout_sessions")
      .select("id, performed_on, duration_minutes, note, completed_at, plan_id")
      .eq("member_id", memberId)
      .order("performed_on", { ascending: false })
      .limit(limit),
  );
}

/**
 * Start (or resume) today's session.
 *
 * The unique index on (member_id, performed_on, assignment) makes this
 * idempotent: a double tap returns the row that already exists instead of
 * creating a second one.
 */
export async function startSession(input: {
  memberId: string;
  organizationId: string;
  planId: string | null;
  assignmentId?: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await many<WorkoutSession>(
    supabase
      .from("workout_sessions")
      .select("id, performed_on, duration_minutes, note, completed_at, plan_id")
      .eq("member_id", input.memberId)
      .eq("performed_on", today)
      .limit(1),
  );
  if (existing[0]) return existing[0];

  const row = await one<WorkoutSession>(
    supabase
      .from("workout_sessions")
      .insert({
        member_id: input.memberId,
        organization_id: input.organizationId,
        plan_id: input.planId,
        assignment_id: input.assignmentId ?? null,
        performed_on: today,
      })
      .select("id, performed_on, duration_minutes, note, completed_at, plan_id")
      .single(),
  );
  if (!row) throw new Error("Could not start the session");
  return row;
}

export async function logSet(input: {
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}) {
  const { error } = await supabase.from("workout_sets").upsert(
    {
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      exercise_name: input.exerciseName,
      set_number: input.setNumber,
      reps: input.reps,
      weight_kg: input.weightKg,
    },
    { onConflict: "session_id,set_number" },
  );
  if (error) throw new Error(error.message);
}

export async function getSets(sessionId: string) {
  return many<{
    id: string;
    exercise_id: string | null;
    exercise_name: string;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
  }>(
    supabase
      .from("workout_sets")
      .select("id, exercise_id, exercise_name, set_number, reps, weight_kg")
      .eq("session_id", sessionId)
      .order("set_number", { ascending: true }),
  );
}

export async function finishSession(sessionId: string, durationMinutes: number, note?: string) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      duration_minutes: Math.max(0, Math.min(1440, Math.round(durationMinutes))),
      note: note?.slice(0, 2000) ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function getNotifications(userId: string) {
  return many<{ id: string; title: string; body: string | null; type: string | null; read_at: string | null; created_at: string }>(
    supabase
      .from("notifications")
      .select("id, title, body, type, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  );
}

export async function getTrainer(trainerId: string | null) {
  if (!trainerId) return null;
  return one<Staff>(supabase.from("staff").select("id, name, job_role, phone, email").eq("id", trainerId).maybeSingle());
}

/** Latest measurement is the baseline for BMI and trend arrows. */
export function bmiOf(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function formatMoney(minor: number, currency = "INR") {
  const major = minor / 100;
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${symbol}${major.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
