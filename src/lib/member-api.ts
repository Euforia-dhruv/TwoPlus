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
  limit = 50,
): Promise<Payment[]> {
  const { data, error } = await getSupabase()
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("paid_on", { ascending: false })
    .limit(limit);
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
  /** The assignment row that links this plan to the member. */
  assignment_id: string;
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
      assignment_id: r.id,
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
  limit = 10,
): Promise<MyMeasurement[]> {
  const { data, error } = await getSupabase()
    .from("fitness_measurements")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("measured_on", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load your measurements");
  return (data ?? []) as MyMeasurement[];
}

// Records the caller's own measurements for a day.
//
// The table has one row per (member_id, measured_on), so this upserts: logging
// weight twice on the same day corrects the entry instead of stacking a second
// one. Writes rely on the self policies added by 0015.
export async function saveMyMeasurement(input: {
  orgId: string;
  memberId: string;
  measuredOn: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  notes?: string | null;
}): Promise<void> {
  // Only the fields actually supplied go in the payload. PostgREST's upsert
  // updates just the keys it receives, so a member logging their weight must not
  // blank out figures a trainer recorded on the same day's row. Sending explicit
  // nulls here would do exactly that.
  const row: Record<string, unknown> = {
    organization_id: input.orgId,
    member_id: input.memberId,
    measured_on: input.measuredOn,
    recorded_by: (await getSupabase().auth.getUser()).data.user?.id ?? null,
  };
  const put = (column: string, value: number | null | undefined) => {
    if (value != null) row[column] = value;
  };
  put("weight_kg", input.weightKg);
  put("body_fat_pct", input.bodyFatPct);
  put("waist_cm", input.waistCm);
  put("chest_cm", input.chestCm);
  put("arms_cm", input.armsCm);
  put("thighs_cm", input.thighsCm);
  const note = input.notes?.trim();
  if (note) row.notes = note;

  const { error } = await getSupabase()
    .from("fitness_measurements")
    .upsert(row, { onConflict: "member_id,measured_on" });
  throwIf(error, "Could not save your measurements");
}

// Links the signed-in account to the member row whose email matches the
// verified auth email (SQL function from migration 0007). Returns the member
// id on success, or null when no matching unlinked member record exists.
export async function claimMyMemberAccount(): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("claim_member_account");
  throwIf(error, "Could not link your member account");
  return (data ?? null) as string | null;
}

// Where a signed-in user should land.
//
// Staff come first: someone can be both a gym admin and a member of that same
// gym, and sending them to the member app would hide their whole workspace
// behind a role check they already pass. Only an account with no workspace
// role at all lands in the member app.
export async function myHomePath(): Promise<string> {
  const { data: user } = await getSupabase().auth.getUser();
  if (!user.user) return "/login";

  // organization_members has no id column; its key is (organization_id, user_id).
  const { data: staffRows, error } = await getSupabase()
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.user.id)
    .limit(1);

  // A failed read must not silently demote a staff account to the member app.
  if (error) return "/app";
  if (staffRows?.length) return "/app";

  const member = await getMyMember().catch(() => null);
  return member ? "/member" : "/app";
}

// --- Workout logging (migration 0012) ---------------------------------------
//
// A session is one training day; its sets are the individual lifts. Writes go
// straight to the tables under RLS, and the unique index on
// (member_id, performed_on, assignment) makes a repeated "finish" tap
// idempotent rather than creating duplicate sessions.

export type LoggedSet = {
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
};

export type WorkoutSession = {
  id: string;
  performed_on: string;
  duration_minutes: number | null;
  note: string | null;
  completed_at: string | null;
  plan_name: string | null;
  sets: LoggedSet[];
};

export async function getMyWorkoutSessions(
  memberId: string,
  limit = 30,
): Promise<WorkoutSession[]> {
  const { data, error } = await getSupabase()
    .from("workout_sessions")
    .select(
      "id, performed_on, duration_minutes, note, completed_at, plan:workout_plans(name), sets:workout_sets(exercise_id, exercise_name, set_number, reps, weight_kg)",
    )
    .eq("member_id", memberId)
    .order("performed_on", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load your workout history");
  const rows = (data ?? []) as unknown as {
    id: string;
    performed_on: string;
    duration_minutes: number | null;
    note: string | null;
    completed_at: string | null;
    plan: { name: string } | null;
    sets: LoggedSet[] | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    performed_on: r.performed_on,
    duration_minutes: r.duration_minutes,
    note: r.note,
    completed_at: r.completed_at,
    plan_name: r.plan?.name ?? null,
    sets: (r.sets ?? []).slice().sort((a, b) => a.set_number - b.set_number),
  }));
}

// Records one training day. Re-submitting the same day updates that day's
// session instead of inserting a second one, so a double tap is harmless.
export async function logWorkout(input: {
  organizationId: string;
  memberId: string;
  planId: string | null;
  assignmentId: string | null;
  performedOn: string;
  durationMinutes: number | null;
  note: string | null;
  sets: Omit<LoggedSet, "set_number">[];
}): Promise<string> {
  const supabase = getSupabase();

  let find = supabase
    .from("workout_sessions")
    .select("id")
    .eq("member_id", input.memberId)
    .eq("performed_on", input.performedOn);
  // A null assignment means an ad-hoc session. .eq(null) emits "= null", which
  // never matches in SQL, so NULL needs .is().
  find = input.assignmentId
    ? find.eq("assignment_id", input.assignmentId)
    : find.is("assignment_id", null);

  const { data: existing, error: findError } = await find.maybeSingle();
  throwIf(findError, "Could not save your workout");

  let sessionId = (existing as { id: string } | null)?.id ?? null;

  if (sessionId) {
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        duration_minutes: input.durationMinutes,
        note: input.note,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    throwIf(error, "Could not update your workout");
    // Replace the set list: the member re-entered the whole session.
    const { error: clearError } = await supabase
      .from("workout_sets")
      .delete()
      .eq("session_id", sessionId);
    throwIf(clearError, "Could not update your workout");
  } else {
    const { data: created, error } = await supabase
      .from("workout_sessions")
      .insert({
        organization_id: input.organizationId,
        member_id: input.memberId,
        plan_id: input.planId,
        assignment_id: input.assignmentId,
        performed_on: input.performedOn,
        duration_minutes: input.durationMinutes,
        note: input.note,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    throwIf(error, "Could not save your workout");
    sessionId = (created as { id: string }).id;
  }

  if (input.sets.length) {
    const { error } = await supabase.from("workout_sets").insert(
      input.sets.map((s, i) => ({
        session_id: sessionId,
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: i + 1,
        reps: s.reps,
        weight_kg: s.weight_kg,
      })),
    );
    throwIf(error, "Could not save your sets");
  }

  return sessionId;
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);
  throwIf(error, "Could not delete this workout");
}

// --- Classes (migration 0013) ----------------------------------------------
//
// Reading classes and writing bookings both go through RLS policies that key
// off the caller's linked member row, and booking goes through book_class()
// because capacity has to be enforced server-side.

export type BookableClass = {
  id: string;
  name: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  branch: string | null;
  trainer: string | null;
  /** How many seats are taken, counted from real bookings. */
  booked: number;
  /** The caller's booking id when they hold a seat, otherwise null. */
  my_booking: string | null;
};

export async function getBookableClasses(
  orgId: string,
  memberId: string,
  limit = 30,
): Promise<BookableClass[]> {
  const { data, error } = await getSupabase()
    .from("classes")
    .select(
      "id, name, starts_at, duration_minutes, capacity, branch:branches(name), trainer:staff(name), bookings:class_bookings(id, member_id, status)",
    )
    .eq("organization_id", orgId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  throwIf(error, "Could not load the class schedule");

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    starts_at: string;
    duration_minutes: number;
    capacity: number;
    branch: { name: string } | null;
    trainer: { name: string } | null;
    bookings: { id: string; member_id: string; status: string }[];
  }[];

  // RLS only exposes the caller's own bookings, so the embedded relation can
  // never count other people. Seat counts come from the aggregate RPC, which
  // returns numbers without revealing who holds them.
  const { data: seats } = await getSupabase().rpc("class_seats");
  const taken = new Map(
    ((seats ?? []) as { class_id: string; booked: number }[]).map((s) => [
      s.class_id,
      s.booked,
    ]),
  );

  return rows.map((r) => {
    const mine = r.bookings.find((b) => b.member_id === memberId && b.status === "booked");
    return {
      id: r.id,
      name: r.name,
      starts_at: r.starts_at,
      duration_minutes: r.duration_minutes,
      capacity: r.capacity,
      branch: r.branch?.name ?? null,
      trainer: r.trainer?.name ?? null,
      booked: taken.get(r.id) ?? 0,
      my_booking: mine?.id ?? null,
    };
  });
}

export async function bookClass(classId: string): Promise<void> {
  const { error } = await getSupabase().rpc("book_class", { p_class_id: classId });
  throwIf(error, "Could not book that class");
}

export async function cancelClassBooking(classId: string): Promise<void> {
  const { error } = await getSupabase().rpc("cancel_class_booking", {
    p_class_id: classId,
  });
  throwIf(error, "Could not cancel that booking");
}

// --- Progress photos -------------------------------------------------------
//
// Fitness photographs are the most sensitive rows a member owns, so the bucket
// is private and every read goes through a short-lived signed URL rather than a
// public link.

const PROGRESS_BUCKET = "member-progress";

export type ProgressPhoto = {
  id: string;
  taken_on: string;
  storage_path: string;
  note: string | null;
  url: string | null;
};

export async function getMyProgressPhotos(
  orgId: string,
  memberId: string,
  limit = 24,
): Promise<ProgressPhoto[]> {
  const { data, error } = await getSupabase()
    .from("member_progress_photos")
    .select("id, taken_on, storage_path, note")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("taken_on", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load your progress photos");

  const rows = (data ?? []) as Omit<ProgressPhoto, "url">[];
  if (!rows.length) return [];

  const { data: signed } = await getSupabase()
    .storage
    .from(PROGRESS_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      60 * 10,
    );

  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }));
}

export async function uploadProgressPhoto(input: {
  orgId: string;
  memberId: string;
  file: File;
  takenOn: string;
  note?: string;
}): Promise<void> {
  const ext = (input.file.name.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${input.orgId}/${input.memberId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await getSupabase()
    .storage
    .from(PROGRESS_BUCKET)
    .upload(path, input.file, { cacheControl: "3600", upsert: false });
  throwIf(upErr, "Could not upload that photo");

  const { error } = await getSupabase().from("member_progress_photos").insert({
    organization_id: input.orgId,
    member_id: input.memberId,
    taken_on: input.takenOn,
    storage_path: path,
    note: input.note?.trim() || null,
  });

  if (error) {
    // Don't leave an orphaned object behind if the row fails.
    await getSupabase().storage.from(PROGRESS_BUCKET).remove([path]);
    throw err(error.message || "Could not save that photo");
  }
}

export async function deleteProgressPhoto(
  photo: Pick<ProgressPhoto, "id" | "storage_path">,
): Promise<void> {
  const { error } = await getSupabase()
    .from("member_progress_photos")
    .delete()
    .eq("id", photo.id);
  throwIf(error, "Could not delete that photo");
  await getSupabase().storage.from(PROGRESS_BUCKET).remove([photo.storage_path]);
}

// ---------------------------------------------------------------------------
// Your data
// ---------------------------------------------------------------------------

// The list getters cap themselves so the member app stays fast. An export must
// not: a member asking for their data gets all of it, not the last page.
const EXPORT_LIMIT = 100_000;

// Everything the member app holds about the caller, in one file. Deliberately
// JSON rather than a zipped spreadsheet: photos are signed URLs that expire, so
// the file records which photos exist instead of pretending to contain them.
export async function exportMyData(): Promise<void> {
  const member = await getMyMember();
  if (!member) throw err("No member record is linked to this account");
  const orgId = member.organization_id;
  const memberId = member.id;

  const [
    memberships,
    payments,
    attendance,
    sessions,
    workoutPlans,
    dietPlans,
    measurements,
    photos,
  ] = await Promise.all([
    getMyMemberships(orgId, memberId),
    getMyPayments(orgId, memberId, EXPORT_LIMIT),
    getMyAttendance(orgId, memberId, EXPORT_LIMIT),
    getMyWorkoutSessions(memberId, EXPORT_LIMIT),
    getMyWorkoutPlans(orgId, memberId),
    getMyDietPlans(orgId, memberId),
    getMyMeasurements(orgId, memberId, EXPORT_LIMIT),
    getMyProgressPhotos(orgId, memberId, EXPORT_LIMIT),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    about:
      "This is a copy of what TwoPlus holds about you. Photos are listed with their dates and notes, not embedded.",
    profile: {
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      address: member.address,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      member_since: member.joined_on,
      status: member.status,
    },
    memberships,
    payments,
    attendance,
    workouts: sessions,
    workout_plans: workoutPlans,
    diet_plans: dietPlans,
    measurements,
    // Signed URLs are dropped: they expire, and a file full of dead links is
    // worse than a list that says what the photos were.
    progress_photos: photos.map(({ url: _url, ...rest }) => rest),
  };

  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `twoplus-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Ends the relationship: identity and health data are erased, the sign-in is
// deleted, and money records stay attached to an anonymised row. The work
// happens in one database function (0016) so it cannot half-apply.
export async function deleteMyAccount(): Promise<{
  member_erased: boolean;
  photos_removed: number;
}> {
  const { data, error } = await getSupabase().rpc("delete_my_account");
  if (error) {
    // The function refuses gym owners with a readable sentence; surface it
    // rather than the generic fallback.
    throw err(error.message || "Could not delete your account");
  }
  return data as { member_erased: boolean; photos_removed: number };
}

export { personalRecords } from "./workout-stats";
export type { PersonalRecord } from "./workout-stats";
