// Self-service data access for signed-in gym members.
//
// Every query relies on the RLS policies added by migrations 0007 and 0009:
// a member can only ever read their own rows (or the plans assigned to them),
// so no extra client-side filtering is needed. All functions are read-only.
import { getSupabase } from "./supabase";
import type {
  AttendanceRecord,
  Member,
  MemberMembership,
  Payment,
} from "./types";

function err(message: string): Error {
  return new Error(message);
}

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw err(error.message || fallback);
}

// The signed-in user's member row, or null when the account is not linked to
// any gym member yet (call claim_member_account() to link it).
export async function getMyMember(): Promise<Member | null> {
  const { data: user } = await getSupabase().auth.getUser();
  if (!user.user) return null;
  const { data, error } = await getSupabase()
    .from("members")
    .select("*")
    .eq("user_id", user.user.id)
    .maybeSingle();
  throwIf(error, "Could not load your member profile");
  return (data ?? null) as Member | null;
}

export async function getMyMemberships(
  orgId: string,
  memberId: string,
): Promise<MemberMembership[]> {
  const { data, error } = await getSupabase()
    .from("member_memberships")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("end_date", { ascending: false });
  throwIf(error, "Could not load your memberships");
  return (data ?? []) as MemberMembership[];
}

export async function getMyPayments(
  orgId: string,
  memberId: string,
): Promise<Payment[]> {
  const { data, error } = await getSupabase()
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("paid_on", { ascending: false })
    .limit(50);
  throwIf(error, "Could not load your payments");
  return (data ?? []) as Payment[];
}

export async function getMyAttendance(
  orgId: string,
  memberId: string,
  limit = 20,
): Promise<AttendanceRecord[]> {
  const { data, error } = await getSupabase()
    .from("attendance")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("check_in", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load your attendance");
  return (data ?? []) as AttendanceRecord[];
}

export type MyWorkoutPlan = {
  id: string;
  name: string;
  goal: string | null;
  description: string | null;
  effective_from: string;
  status: string;
  exercises: {
    id: string;
    exercise_name: string;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    instructions: string | null;
    day_label: string | null;
  }[];
};

export async function getMyWorkoutPlans(
  orgId: string,
  memberId: string,
): Promise<MyWorkoutPlan[]> {
  const { data, error } = await getSupabase()
    .from("member_workout_assignments")
    .select(
      "id, effective_from, status, plan:workout_plans(id, name, goal, description, exercises:workout_exercises(id, day_label, exercise_name, sets, reps, rest_seconds, instructions))",
    )
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("effective_from", { ascending: false });
  throwIf(error, "Could not load your workout plans");
  const rows = (data ?? []) as unknown as {
    id: string;
    effective_from: string;
    status: string;
    plan: {
      id: string;
      name: string;
      goal: string | null;
      description: string | null;
      exercises: {
        id: string;
        day_label: string | null;
        exercise_name: string;
        sets: number | null;
        reps: string | null;
        rest_seconds: number | null;
        instructions: string | null;
      }[];
    } | null;
  }[];
  return rows
    .filter((r) => r.plan)
    .map((r) => ({
      id: r.plan!.id,
      name: r.plan!.name,
      goal: r.plan!.goal,
      description: r.plan!.description,
      effective_from: r.effective_from,
      status: r.status,
      exercises: r.plan!.exercises ?? [],
    }));
}

export type MyDietPlan = {
  id: string;
  name: string;
  description: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  effective_from: string;
  status: string;
  meals: {
    id: string;
    name: string;
    timing: string | null;
    coach_notes: string | null;
    items: {
      id: string;
      food_item: string;
      portion: string | null;
      notes: string | null;
    }[];
  }[];
};

export async function getMyDietPlans(
  orgId: string,
  memberId: string,
): Promise<MyDietPlan[]> {
  const { data, error } = await getSupabase()
    .from("member_diet_assignments")
    .select(
      "id, effective_from, status, plan:diet_plans(id, name, description, target_calories, target_protein_g, target_carbs_g, target_fat_g, meals:diet_meals(id, name, timing, coach_notes, items:diet_meal_items(id, food_item, portion, notes)))",
    )
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("effective_from", { ascending: false });
  throwIf(error, "Could not load your diet plans");
  const rows = (data ?? []) as unknown as {
    id: string;
    effective_from: string;
    status: string;
    plan: {
      id: string;
      name: string;
      description: string | null;
      target_calories: number | null;
      target_protein_g: number | null;
      target_carbs_g: number | null;
      target_fat_g: number | null;
      meals: {
        id: string;
        name: string;
        timing: string | null;
        coach_notes: string | null;
        items: {
          id: string;
          food_item: string;
          portion: string | null;
          notes: string | null;
        }[];
      }[];
    } | null;
  }[];
  return rows
    .filter((r) => r.plan)
    .map((r) => ({
      id: r.plan!.id,
      name: r.plan!.name,
      description: r.plan!.description,
      target_calories: r.plan!.target_calories,
      target_protein_g: r.plan!.target_protein_g,
      target_carbs_g: r.plan!.target_carbs_g,
      target_fat_g: r.plan!.target_fat_g,
      effective_from: r.effective_from,
      status: r.status,
      meals: r.plan!.meals ?? [],
    }));
}

export type MyMeasurement = {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  notes: string | null;
};

export async function getMyMeasurements(
  orgId: string,
  memberId: string,
): Promise<MyMeasurement[]> {
  const { data, error } = await getSupabase()
    .from("fitness_measurements")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("measured_on", { ascending: false })
    .limit(10);
  throwIf(error, "Could not load your measurements");
  return (data ?? []) as MyMeasurement[];
}

// Links the signed-in account to the member row whose email matches the
// verified auth email (SQL function from migration 0007). Returns the member
// id on success, or null when no matching unlinked member record exists.
export async function claimMyMemberAccount(): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("claim_member_account");
  throwIf(error, "Could not link your member account");
  return (data ?? null) as string | null;
}

// Where a signed-in user should land: their member app when the account is
// linked to a member record, otherwise the staff workspace.
export async function myHomePath(): Promise<string> {
  const member = await getMyMember().catch(() => null);
  return member ? "/member" : "/app";
}
