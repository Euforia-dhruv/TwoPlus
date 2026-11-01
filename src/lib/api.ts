// Typed data-access layer. Every query is organization-scoped explicitly;
// RLS enforces the same scoping server-side as the security boundary.
import { getSupabase } from "./supabase";
import type {
  AppNotification,
  AttendanceRecord,
  Branch,
  DashboardStats,
  DietMealWithItems,
  DietPlan,
  DietPlanListRow,
  Enquiry,
  Expense,
  FitnessMeasurement,
  GymClass,
  Invoice,
  InvoiceListRow,
  Member,
  MemberMembership,
  MembershipPlan,
  OrgContext,
  OrgMemberRow,
  OrgRole,
  Payment,
  PaymentMethod,
  ReportMonth,
  StaffMember,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlanListRow,
} from "./types";

function err(message: string): Error {
  return new Error(message);
}

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw err(error.message || fallback);
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function createOrganization(input: {
  name: string;
  phone?: string;
  address?: string;
  timezone?: string;
  branchName?: string;
}): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_organization", {
    p_name: input.name,
    p_phone: input.phone || null,
    p_address: input.address || null,
    p_timezone: input.timezone || "Asia/Kolkata",
    p_branch_name: input.branchName || null,
  });
  throwIf(error, "Could not create the gym organization");
  return data as string;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export type ListMembersOptions = {
  query?: string;
  status?: "active" | "suspended" | "archived";
  limit?: number;
  offset?: number;
};

export async function listMembers(
  orgId: string,
  options: ListMembersOptions = {},
): Promise<Member[]> {
  let q = getSupabase()
    .from("members")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 99));
  if (options.status) q = q.eq("status", options.status);
  const needle = options.query?.trim();
  if (needle) {
    const safe = needle.replace(/[%_,()]/g, " ");
    q = q.or(
      `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%,member_code.ilike.%${safe}%`,
    );
  }
  const { data, error } = await q;
  throwIf(error, "Could not load members");
  return (data ?? []) as Member[];
}

export async function createMember(
  orgId: string,
  input: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone: string;
    date_of_birth?: string;
    gender?: "male" | "female" | "other";
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    joined_on?: string;
    member_code?: string;
    photo_url?: string;
  },
): Promise<Member> {
  const supabase = getSupabase();
  const code =
    input.member_code?.trim() ||
    `GYM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from("members")
    .insert({
      organization_id: orgId,
      member_code: code,
      first_name: input.first_name.trim(),
      last_name: input.last_name?.trim() || "",
      email: input.email?.trim() || null,
      phone: input.phone.trim(),
      date_of_birth: input.date_of_birth || null,
      gender: input.gender ?? null,
      emergency_contact_name: input.emergency_contact_name || null,
      emergency_contact_phone: input.emergency_contact_phone || null,
      joined_on: input.joined_on || new Date().toISOString().slice(0, 10),
      // Omitted unless set, so workspaces without migration 0005 keep working.
      ...(input.photo_url?.trim() ? { photo_url: input.photo_url.trim() } : {}),
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the member");
  return data as Member;
}

// Workspace appearance. The "org update owner" RLS policy already permits this
// for owners; staff get a silent 0-row update, which we surface as an error.
export async function saveOrganizationTheme(
  orgId: string,
  theme: { preset: string; mode: string; style: string; image: string | null },
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("organizations")
    .update({
      theme_preset: theme.preset,
      theme_mode: theme.mode,
      theme_style: theme.style,
      theme_image: theme.image,
    })
    .eq("id", orgId)
    .select("id");
  throwIf(error, "Could not save the workspace appearance");
  if (!data || data.length === 0) {
    throw err("Only the workspace owner can change its appearance.");
  }
}

export async function updateMember(
  memberId: string,
  patch: Partial<
    Pick<Member, "first_name" | "last_name" | "email" | "phone" | "status" | "notes" | "date_of_birth" | "photo_url">
  >,
): Promise<void> {
  // An empty photo is dropped rather than written as null, so a workspace
  // without migration 0005 can still edit every other field.
  const { photo_url, ...rest } = patch;
  const body = photo_url ? { ...rest, photo_url } : rest;
  const { error } = await getSupabase()
    .from("members")
    .update(body)
    .eq("id", memberId);
  throwIf(error, "Could not update the member");
}

// ---------------------------------------------------------------------------
// Membership plans & member memberships
// ---------------------------------------------------------------------------

export async function listPlans(
  orgId: string,
  options: { includeInactive?: boolean } = {},
): Promise<MembershipPlan[]> {
  let q = getSupabase()
    .from("membership_plans")
    .select("*")
    .eq("organization_id", orgId);
  if (!options.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q.order("name");
  throwIf(error, "Could not load membership plans");
  return (data ?? []) as MembershipPlan[];
}

export async function createPlan(
  orgId: string,
  input: { name: string; duration_days: number; price_minor: number; description?: string },
): Promise<MembershipPlan> {
  const { data, error } = await getSupabase()
    .from("membership_plans")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description || null,
      duration_days: input.duration_days,
      price_minor: input.price_minor,
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the plan");
  return data as MembershipPlan;
}

export async function updatePlan(
  planId: string,
  patch: Partial<
    Pick<
      MembershipPlan,
      "name" | "description" | "duration_days" | "price_minor" | "is_active"
    >
  >,
): Promise<void> {
  const { error } = await getSupabase()
    .from("membership_plans")
    .update(patch)
    .eq("id", planId);
  throwIf(error, "Could not update the plan");
}

export async function listMembershipsForMember(
  orgId: string,
  memberId: string,
): Promise<MemberMembership[]> {
  const { data, error } = await getSupabase()
    .from("member_memberships")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("end_date", { ascending: false });
  throwIf(error, "Could not load memberships");
  return (data ?? []) as MemberMembership[];
}

export async function listMemberships(
  orgId: string,
  options: { expiringWithinDays?: number } = {},
): Promise<MemberMembership[]> {
  let q = getSupabase()
    .from("member_memberships")
    .select("*")
    .eq("organization_id", orgId)
    .order("end_date", { ascending: true });
  if (options.expiringWithinDays != null) {
    const until = new Date();
    until.setDate(until.getDate() + options.expiringWithinDays);
    q = q.gte("end_date", new Date().toISOString().slice(0, 10))
      .lte("end_date", until.toISOString().slice(0, 10));
  }
  const { data, error } = await q;
  throwIf(error, "Could not load memberships");
  return (data ?? []) as MemberMembership[];
}

export async function assignMembership(
  orgId: string,
  input: {
    member_id: string;
    plan_id: string;
    plan_name: string;
    price_minor: number;
    start_date: string;
    end_date: string;
  },
): Promise<MemberMembership> {
  const { data, error } = await getSupabase()
    .from("member_memberships")
    .insert({
      organization_id: orgId,
      member_id: input.member_id,
      plan_id: input.plan_id,
      plan_name: input.plan_name,
      price_minor: input.price_minor,
      start_date: input.start_date,
      end_date: input.end_date,
      status: "active",
    })
    .select("*")
    .single();
  throwIf(error, "Could not assign the membership");
  return data as MemberMembership;
}

export async function updateMembershipExpiry(
  membershipId: string,
  endDate: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("member_memberships")
    .update({ end_date: endDate, status: "active" })
    .eq("id", membershipId);
  throwIf(error, "Could not renew the membership");
}

export async function setMembershipStatus(
  membershipId: string,
  status: "active" | "frozen" | "cancelled" | "expired",
): Promise<void> {
  const { error } = await getSupabase()
    .from("member_memberships")
    .update({ status })
    .eq("id", membershipId);
  throwIf(error, "Could not update the membership status");
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function listPayments(
  orgId: string,
  options: {
    status?: Payment["status"];
    memberId?: string;
    limit?: number;
  } = {},
): Promise<Payment[]> {
  let q = getSupabase()
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .order("paid_on", { ascending: false })
    .limit(options.limit ?? 200);
  if (options.status) q = q.eq("status", options.status);
  if (options.memberId) q = q.eq("member_id", options.memberId);
  const { data, error } = await q;
  throwIf(error, "Could not load payments");
  return (data ?? []) as Payment[];
}

// Records a manually-verified payment. Online gateway capture is intentionally
// not simulated: status reflects what staff actually recorded.
export async function recordPayment(
  orgId: string,
  input: {
    member_id: string;
    membership_id?: string | null;
    invoice_id?: string | null;
    amount_minor: number;
    method: PaymentMethod;
    status: Payment["status"];
    paid_on?: string;
    description?: string;
  },
): Promise<Payment> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      organization_id: orgId,
      member_id: input.member_id,
      membership_id: input.membership_id ?? null,
      invoice_id: input.invoice_id ?? null,
      amount_minor: input.amount_minor,
      method: input.method,
      status: input.status,
      paid_on: input.paid_on || new Date().toISOString().slice(0, 10),
      description: input.description || null,
      recorded_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not record the payment");
  return data as Payment;
}

// Marks an already-recorded pending payment as received. There is no gateway:
// staff confirm the money arrived, and this only changes what the workspace says.
// RLS limits payment updates to owner, manager and finance, so a receptionist
// gets a policy error rather than a silent no-op — hence the zero-row check.
export async function settlePayment(
  paymentId: string,
  input: { method: PaymentMethod; paid_on?: string },
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("payments")
    .update({
      status: "paid",
      method: input.method,
      paid_on: input.paid_on || new Date().toISOString().slice(0, 10),
    })
    .eq("id", paymentId)
    .select("id");
  throwIf(error, "Could not settle the payment");
  if (!data?.length) throw err("You cannot settle this payment");
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function listAttendance(
  orgId: string,
  options: { since?: string; limit?: number } = {},
): Promise<AttendanceRecord[]> {
  let q = getSupabase()
    .from("attendance")
    .select("*")
    .eq("organization_id", orgId)
    .order("check_in", { ascending: false })
    .limit(options.limit ?? 200);
  if (options.since) q = q.gte("check_in", options.since);
  const { data, error } = await q;
  throwIf(error, "Could not load attendance");
  return (data ?? []) as AttendanceRecord[];
}

export async function checkInMember(
  orgId: string,
  memberId: string,
  branchId?: string | null,
): Promise<AttendanceRecord> {
  const { data, error } = await getSupabase()
    .from("attendance")
    .insert({
      organization_id: orgId,
      member_id: memberId,
      branch_id: branchId ?? null,
      method: "manual",
    })
    .select("*")
    .single();
  if (error) {
    if (error.message?.includes("attendance_open_checkin_idx")) {
      throw err("This member already has an open check-in");
    }
    throw err(error.message || "Could not record the check-in");
  }
  return data as AttendanceRecord;
}

export async function checkOutMember(attendanceId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("attendance")
    .update({ check_out: new Date().toISOString() })
    .eq("id", attendanceId);
  throwIf(error, "Could not record the check-out");
}

// Recent visits for the member drawer. Reads only that member's rows.
export async function listMemberAttendance(
  orgId: string,
  memberId: string,
  limit = 10,
): Promise<AttendanceRecord[]> {
  const { data, error } = await getSupabase()
    .from("attendance")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("check_in", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load this member's attendance");
  return (data ?? []) as AttendanceRecord[];
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export async function listEnquiries(
  orgId: string,
  options: { status?: Enquiry["status"] } = {},
): Promise<Enquiry[]> {
  let q = getSupabase()
    .from("enquiries")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (options.status) q = q.eq("status", options.status);
  const { data, error } = await q;
  throwIf(error, "Could not load enquiries");
  return (data ?? []) as Enquiry[];
}

export async function createEnquiry(
  orgId: string,
  input: {
    name: string;
    phone: string;
    email?: string;
    interest?: string;
    source?: Enquiry["source"];
    follow_up_date?: string;
    notes?: string;
  },
): Promise<Enquiry> {
  const { data, error } = await getSupabase()
    .from("enquiries")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      interest: input.interest || null,
      source: input.source ?? "walk_in",
      follow_up_date: input.follow_up_date || null,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the enquiry");
  return data as Enquiry;
}

export async function updateEnquiry(
  enquiryId: string,
  patch: Partial<Pick<Enquiry, "status" | "follow_up_date" | "notes" | "converted_member_id">>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("enquiries")
    .update(patch)
    .eq("id", enquiryId);
  throwIf(error, "Could not update the enquiry");
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function listStaff(orgId: string): Promise<StaffMember[]> {
  const { data, error } = await getSupabase()
    .from("staff")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  throwIf(error, "Could not load staff");
  return (data ?? []) as StaffMember[];
}

export async function createStaffMember(
  orgId: string,
  input: {
    name: string;
    phone: string;
    email?: string;
    job_role: string;
    branch_id?: string | null;
    joined_on?: string;
  },
): Promise<StaffMember> {
  const { data, error } = await getSupabase()
    .from("staff")
    .insert({
      organization_id: orgId,
      branch_id: input.branch_id ?? null,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      job_role: input.job_role.trim() || "Trainer",
      joined_on: input.joined_on || new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  throwIf(error, "Could not add the staff member");
  return data as StaffMember;
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function updateStaffMember(
  staffId: string,
  patch: Partial<
    Pick<
      StaffMember,
      "name" | "phone" | "email" | "job_role" | "employment_status"
    >
  >,
): Promise<void> {
  const { error } = await getSupabase()
    .from("staff")
    .update(patch)
    .eq("id", staffId);
  throwIf(error, "Could not update the team member");
}

export async function listClasses(
  orgId: string,
  options: { upcomingOnly?: boolean } = {},
): Promise<GymClass[]> {
  let q = getSupabase()
    .from("classes")
    .select("*")
    .eq("organization_id", orgId)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (options.upcomingOnly) q = q.gte("starts_at", new Date().toISOString());
  const { data, error } = await q;
  throwIf(error, "Could not load classes");
  return (data ?? []) as GymClass[];
}

export async function createClass(
  orgId: string,
  input: {
    name: string;
    starts_at: string;
    capacity: number;
    duration_minutes?: number;
    trainer_id?: string | null;
    branch_id?: string | null;
  },
): Promise<GymClass> {
  const { data, error } = await getSupabase()
    .from("classes")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      starts_at: input.starts_at,
      capacity: input.capacity,
      duration_minutes: input.duration_minutes ?? 60,
      trainer_id: input.trainer_id ?? null,
      branch_id: input.branch_id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not schedule the class");
  return data as GymClass;
}

// Seats taken per class. Cancelled bookings do not count, so a class that has
// been emptied reads as 0 / capacity rather than showing stale interest.
export async function listClassBookingCounts(
  orgId: string,
): Promise<Record<string, number>> {
  const { data, error } = await getSupabase()
    .from("class_bookings")
    .select("class_id, status")
    .eq("organization_id", orgId)
    .neq("status", "cancelled")
    .limit(1000);
  throwIf(error, "Could not load class bookings");
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { class_id: string }[])
    counts[row.class_id] = (counts[row.class_id] ?? 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function listBranches(orgId: string): Promise<Branch[]> {
  const { data, error } = await getSupabase()
    .from("branches")
    .select("id, organization_id, name, address, is_primary, is_archived")
    .eq("organization_id", orgId)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true })
    .limit(100);
  throwIf(error, "Could not load branches");
  return (data ?? []) as Branch[];
}

export async function createBranch(
  orgId: string,
  input: { name: string; address?: string },
): Promise<Branch> {
  const { data, error } = await getSupabase()
    .from("branches")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      address: input.address?.trim() || null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not add the branch");
  return data as Branch;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function listExpenses(
  orgId: string,
  options: { since?: string } = {},
): Promise<Expense[]> {
  let q = getSupabase()
    .from("expenses")
    .select("*")
    .eq("organization_id", orgId)
    .order("expense_date", { ascending: false })
    .limit(200);
  if (options.since) q = q.gte("expense_date", options.since);
  const { data, error } = await q;
  throwIf(error, "Could not load expenses");
  return (data ?? []) as Expense[];
}

export async function createExpense(
  orgId: string,
  input: {
    category: string;
    amount_minor: number;
    expense_date?: string;
    description?: string;
    branch_id?: string | null;
  },
): Promise<Expense> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      organization_id: orgId,
      branch_id: input.branch_id ?? null,
      category: input.category.trim(),
      description: input.description || null,
      amount_minor: input.amount_minor,
      expense_date: input.expense_date || new Date().toISOString().slice(0, 10),
      recorded_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not record the expense");
  return data as Expense;
}

// ---------------------------------------------------------------------------
// Team roster & roles
// ---------------------------------------------------------------------------

// Needs migration 0004: profiles is readable only for your own row, so names
// have to come from a definer function rather than a join.
export async function listOrgMembers(orgId: string): Promise<OrgMemberRow[]> {
  const { data, error } = await getSupabase().rpc("list_org_members", {
    p_org_id: orgId,
  });
  throwIf(error, "Could not load the team roster");
  return (data ?? []) as OrgMemberRow[];
}

// RLS allows this for the workspace owner only; everyone else gets a policy error.
export async function updateOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  const { error } = await getSupabase()
    .from("organization_members")
    .update({ role })
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  throwIf(error, "Could not change that role");
}

// ---------------------------------------------------------------------------
// In-app reminders (notifications)
// ---------------------------------------------------------------------------

// Needs the INSERT policy from migration 0004 before anything can be created.
export async function listNotifications(orgId: string): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  throwIf(error, "Could not load reminders");
  return (data ?? []) as AppNotification[];
}

export async function createNotification(
  orgId: string,
  input: {
    user_id: string;
    title: string;
    body?: string;
    type?: AppNotification["type"];
  },
): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .insert({
      organization_id: orgId,
      user_id: input.user_id,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      type: input.type ?? "task",
    });
  throwIf(error, "Could not create the reminder");
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  throwIf(error, "Could not mark the reminder as read");
}

// ---------------------------------------------------------------------------
// Monthly reports
// ---------------------------------------------------------------------------

// Aggregates the last N calendar months from rows that exist. Nothing is
// projected or estimated: an empty month simply sums to zero.
export async function loadMonthlyReports(
  orgId: string,
  months = 6,
): Promise<ReportMonth[]> {
  const supabase = getSupabase();
  const first = new Date();
  first.setDate(1);
  first.setMonth(first.getMonth() - (months - 1));
  const since = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`;

  const [payments, expenses, attendance, members] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_minor, status, paid_on")
      .eq("organization_id", orgId)
      .gte("paid_on", since)
      .limit(10_000),
    supabase
      .from("expenses")
      .select("amount_minor, expense_date")
      .eq("organization_id", orgId)
      .gte("expense_date", since)
      .limit(10_000),
    supabase
      .from("attendance")
      .select("check_in")
      .eq("organization_id", orgId)
      .gte("check_in", since)
      .limit(10_000),
    supabase
      .from("members")
      .select("joined_on")
      .eq("organization_id", orgId)
      .gte("joined_on", since)
      .limit(10_000),
  ]);

  throwIf(payments.error, "Could not load payment reports");
  throwIf(expenses.error, "Could not load expense reports");
  throwIf(attendance.error, "Could not load attendance reports");
  throwIf(members.error, "Could not load membership reports");

  const buckets: ReportMonth[] = Array.from({ length: months }, (_, i) => {
    const day = new Date(first);
    day.setMonth(first.getMonth() + i);
    return {
      month: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`,
      label: day.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      collectedMinor: 0,
      pendingMinor: 0,
      expensesMinor: 0,
      visits: 0,
      newMembers: 0,
    };
  });
  const byMonth = new Map(buckets.map((b) => [b.month, b]));
  const monthOf = (iso: string) => iso.slice(0, 7);

  for (const p of (payments.data ?? []) as {
    amount_minor: number;
    status: string;
    paid_on: string;
  }[]) {
    const bucket = byMonth.get(monthOf(p.paid_on));
    if (!bucket) continue;
    if (p.status === "paid") bucket.collectedMinor += p.amount_minor;
    if (p.status === "pending") bucket.pendingMinor += p.amount_minor;
  }
  for (const e of (expenses.data ?? []) as {
    amount_minor: number;
    expense_date: string;
  }[]) {
    const bucket = byMonth.get(monthOf(e.expense_date));
    if (bucket) bucket.expensesMinor += e.amount_minor;
  }
  for (const a of (attendance.data ?? []) as { check_in: string }[]) {
    const bucket = byMonth.get(monthOf(a.check_in));
    if (bucket) bucket.visits += 1;
  }
  for (const m of (members.data ?? []) as { joined_on: string }[]) {
    const bucket = byMonth.get(monthOf(m.joined_on));
    if (bucket) bucket.newMembers += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Dashboard statistics
// ---------------------------------------------------------------------------

export async function loadDashboardStats(org: OrgContext): Promise<DashboardStats> {
  const orgId = org.organization.id;
  const supabase = getSupabase();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = `${today.toISOString().slice(0, 7)}-01`;
  const inSevenDays = new Date(today.getTime() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    membersRes,
    activeMembershipsRes,
    expiringRes,
    expiredRes,
    attendanceRes,
    paidRes,
    pendingRes,
    expensesRes,
    enquiriesRes,
    classesRes,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, status")
      .eq("organization_id", orgId)
      .limit(10_000),
    supabase
      .from("member_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("member_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .gte("end_date", todayStr)
      .lte("end_date", inSevenDays),
    supabase
      .from("member_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active")
      .lt("end_date", todayStr),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("check_in", `${todayStr}T00:00:00`),
    supabase
      .from("payments")
      .select("amount_minor")
      .eq("organization_id", orgId)
      .eq("status", "paid")
      .gte("paid_on", monthStart)
      .limit(10_000),
    supabase
      .from("payments")
      .select("amount_minor")
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .limit(10_000),
    supabase
      .from("expenses")
      .select("amount_minor")
      .eq("organization_id", orgId)
      .gte("expense_date", monthStart)
      .limit(10_000),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", monthStart),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString()),
  ]);

  const members = (membersRes.data ?? []) as { status: string }[];
  throwIf(membersRes.error, "Could not load member statistics");
  throwIf(paidRes.error, "Could not load payment statistics");
  throwIf(expensesRes.error, "Could not load expense statistics");

  const sumMinor = (rows: { amount_minor: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + r.amount_minor, 0);

  return {
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "active").length,
    activeMemberships: activeMembershipsRes.count ?? 0,
    expiringSoon: expiringRes.count ?? 0,
    expiredMemberships: expiredRes.count ?? 0,
    attendanceToday: attendanceRes.count ?? 0,
    monthCollectionsMinor: sumMinor(paidRes.data),
    pendingPaymentsMinor: sumMinor(pendingRes.data),
    monthExpensesMinor: sumMinor(expensesRes.data),
    newEnquiries: enquiriesRes.count ?? 0,
    upcomingClasses: classesRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Workout plans (migration 0006)
// ---------------------------------------------------------------------------

// One query for the whole directory: exercise count and current assignee come
// back nested, so the table does not fan out into a request per plan.
export async function listWorkoutPlans(
  orgId: string,
  options: { includeArchived?: boolean } = {},
): Promise<WorkoutPlanListRow[]> {
  let q = getSupabase()
    .from("workout_plans")
    .select(
      "id, organization_id, name, goal, description, is_archived, created_at, exercises:workout_exercises(count), assignments:member_workout_assignments(status, member:members(first_name, last_name))",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (!options.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  throwIf(error, "Could not load workout plans");
  return (data ?? []) as unknown as WorkoutPlanListRow[];
}

export async function listWorkoutExercises(planId: string): Promise<WorkoutExercise[]> {
  const { data, error } = await getSupabase()
    .from("workout_exercises")
    .select("*")
    .eq("plan_id", planId)
    .order("position");
  throwIf(error, "Could not load the exercises");
  return (data ?? []) as WorkoutExercise[];
}

// Creates the plan and its exercises together. A plan with no exercises is
// still valid, so an empty list is allowed.
export async function createWorkoutPlan(
  orgId: string,
  input: {
    name: string;
    goal?: string;
    description?: string;
    exercises?: {
      day_label?: string;
      exercise_name: string;
      sets?: number | null;
      reps?: string;
      rest_seconds?: number | null;
    }[];
  },
): Promise<WorkoutPlan> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      goal: input.goal?.trim() || null,
      description: input.description?.trim() || null,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the workout plan");
  const plan = data as WorkoutPlan;
  const rows = input.exercises ?? [];
  if (rows.length) {
    const { error: exError } = await supabase.from("workout_exercises").insert(
      rows.map((e, i) => ({
        plan_id: plan.id,
        day_label: e.day_label?.trim() || null,
        exercise_name: e.exercise_name.trim(),
        sets: e.sets ?? null,
        reps: e.reps?.trim() || null,
        rest_seconds: e.rest_seconds ?? null,
        position: i,
      })),
    );
    // The plan row already exists, so report the partial state instead of
    // letting the caller think nothing was written.
    if (exError) {
      throw err(
        `The plan "${plan.name}" was created, but its exercises were not saved: ${exError.message}`,
      );
    }
  }
  return plan;
}

export async function addWorkoutExercise(
  planId: string,
  input: {
    day_label?: string;
    exercise_name: string;
    sets?: number | null;
    reps?: string;
    rest_seconds?: number | null;
    instructions?: string;
  },
): Promise<void> {
  const supabase = getSupabase();
  // Append at the end: position drives the order the member reads.
  const { data: last, error: readError } = await supabase
    .from("workout_exercises")
    .select("position")
    .eq("plan_id", planId)
    .order("position", { ascending: false })
    .limit(1);
  throwIf(readError, "Could not read the existing exercises");
  const { error } = await supabase.from("workout_exercises").insert({
    plan_id: planId,
    day_label: input.day_label?.trim() || null,
    exercise_name: input.exercise_name.trim(),
    sets: input.sets ?? null,
    reps: input.reps?.trim() || null,
    rest_seconds: input.rest_seconds ?? null,
    instructions: input.instructions?.trim() || null,
    position: ((last?.[0] as { position: number } | undefined)?.position ?? -1) + 1,
  });
  throwIf(error, "Could not add the exercise");
}

export async function assignWorkoutPlan(
  orgId: string,
  input: {
    member_id: string;
    plan_id: string;
    trainer_id?: string | null;
    effective_from?: string;
    notes?: string;
  },
): Promise<void> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  // One active plan per member: end the previous one first, otherwise the
  // member app would show two "current" plans at once.
  const { error: endError } = await supabase
    .from("member_workout_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
    .eq("organization_id", orgId)
    .eq("member_id", input.member_id)
    .eq("status", "active");
  throwIf(endError, "Could not end the previous workout plan");
  const { error } = await supabase.from("member_workout_assignments").insert({
    organization_id: orgId,
    member_id: input.member_id,
    plan_id: input.plan_id,
    trainer_id: input.trainer_id ?? null,
    assigned_by: userData.user?.id ?? null,
    effective_from: input.effective_from || new Date().toISOString().slice(0, 10),
    notes: input.notes?.trim() || null,
  });
  throwIf(error, "Could not assign the workout plan");
}

// ---------------------------------------------------------------------------
// Diet plans (migration 0006)
// ---------------------------------------------------------------------------

export async function listDietPlans(
  orgId: string,
  options: { includeArchived?: boolean } = {},
): Promise<DietPlanListRow[]> {
  let q = getSupabase()
    .from("diet_plans")
    .select(
      "id, organization_id, name, description, target_calories, target_protein_g, target_carbs_g, target_fat_g, is_archived, meals:diet_meals(count), assignments:member_diet_assignments(status, member:members(first_name, last_name))",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (!options.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  throwIf(error, "Could not load diet plans");
  return (data ?? []) as unknown as DietPlanListRow[];
}

export async function listDietMeals(planId: string): Promise<DietMealWithItems[]> {
  const { data, error } = await getSupabase()
    .from("diet_meals")
    .select("*, items:diet_meal_items(*)")
    .eq("plan_id", planId)
    .order("position");
  throwIf(error, "Could not load the meals");
  const meals = (data ?? []) as unknown as DietMealWithItems[];
  // Embedded children come back unordered, so sort them here.
  return meals.map((m) => ({
    ...m,
    items: [...(m.items ?? [])].sort((a, b) => a.position - b.position),
  }));
}

export async function createDietPlan(
  orgId: string,
  input: {
    name: string;
    description?: string;
    target_calories?: number | null;
    target_protein_g?: number | null;
    target_carbs_g?: number | null;
    target_fat_g?: number | null;
  },
): Promise<DietPlan> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      target_calories: input.target_calories ?? null,
      target_protein_g: input.target_protein_g ?? null,
      target_carbs_g: input.target_carbs_g ?? null,
      target_fat_g: input.target_fat_g ?? null,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the diet plan");
  return data as DietPlan;
}

// Adds one meal with its items in a single form submission.
export async function addDietMeal(
  planId: string,
  input: {
    name: string;
    timing?: string;
    coach_notes?: string;
    items?: { food_item: string; portion?: string }[];
  },
): Promise<void> {
  const supabase = getSupabase();
  const { data: existing, error: countError } = await supabase
    .from("diet_meals")
    .select("position")
    .eq("plan_id", planId)
    .order("position", { ascending: false })
    .limit(1);
  throwIf(countError, "Could not read the existing meals");
  const nextPosition =
    ((existing?.[0] as { position: number } | undefined)?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("diet_meals")
    .insert({
      plan_id: planId,
      name: input.name.trim(),
      timing: input.timing?.trim() || null,
      coach_notes: input.coach_notes?.trim() || null,
      position: nextPosition,
    })
    .select("id")
    .single();
  throwIf(error, "Could not add the meal");
  const mealId = (data as { id: string }).id;
  const items = input.items ?? [];
  if (items.length) {
    const { error: itemError } = await supabase.from("diet_meal_items").insert(
      items.map((it, i) => ({
        meal_id: mealId,
        food_item: it.food_item.trim(),
        portion: it.portion?.trim() || null,
        position: i,
      })),
    );
    if (itemError) {
      throw err(
        `The meal "${input.name}" was added, but its items were not saved: ${itemError.message}`,
      );
    }
  }
}

export async function assignDietPlan(
  orgId: string,
  input: {
    member_id: string;
    plan_id: string;
    trainer_id?: string | null;
    effective_from?: string;
    notes?: string;
  },
): Promise<void> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { error: endError } = await supabase
    .from("member_diet_assignments")
    .update({ status: "ended", ended_on: new Date().toISOString().slice(0, 10) })
    .eq("organization_id", orgId)
    .eq("member_id", input.member_id)
    .eq("status", "active");
  throwIf(endError, "Could not end the previous diet plan");
  const { error } = await supabase.from("member_diet_assignments").insert({
    organization_id: orgId,
    member_id: input.member_id,
    plan_id: input.plan_id,
    trainer_id: input.trainer_id ?? null,
    assigned_by: userData.user?.id ?? null,
    effective_from: input.effective_from || new Date().toISOString().slice(0, 10),
    notes: input.notes?.trim() || null,
  });
  throwIf(error, "Could not assign the diet plan");
}

// ---------------------------------------------------------------------------
// Fitness measurements (migration 0006)
// ---------------------------------------------------------------------------

export async function listMeasurements(
  orgId: string,
  memberId: string,
  limit = 20,
): Promise<FitnessMeasurement[]> {
  const { data, error } = await getSupabase()
    .from("fitness_measurements")
    .select("*")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .order("measured_on", { ascending: false })
    .limit(limit);
  throwIf(error, "Could not load measurements");
  return (data ?? []) as FitnessMeasurement[];
}

// One row per member per day is enforced by a unique constraint, so a repeat
// measurement on the same date updates rather than duplicates.
export async function recordMeasurement(
  orgId: string,
  input: {
    member_id: string;
    measured_on?: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    body_fat_pct?: number | null;
    chest_cm?: number | null;
    waist_cm?: number | null;
    hips_cm?: number | null;
    arms_cm?: number | null;
    thighs_cm?: number | null;
    notes?: string;
  },
): Promise<void> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("fitness_measurements").upsert(
    {
      organization_id: orgId,
      member_id: input.member_id,
      measured_on: input.measured_on || new Date().toISOString().slice(0, 10),
      weight_kg: input.weight_kg ?? null,
      height_cm: input.height_cm ?? null,
      body_fat_pct: input.body_fat_pct ?? null,
      chest_cm: input.chest_cm ?? null,
      waist_cm: input.waist_cm ?? null,
      hips_cm: input.hips_cm ?? null,
      arms_cm: input.arms_cm ?? null,
      thighs_cm: input.thighs_cm ?? null,
      notes: input.notes?.trim() || null,
      recorded_by: userData.user?.id ?? null,
    },
    { onConflict: "member_id,measured_on" },
  );
  throwIf(error, "Could not save the measurement");
}

// ---------------------------------------------------------------------------
// Invoices (migration 0006)
// ---------------------------------------------------------------------------

export async function listInvoices(orgId: string): Promise<InvoiceListRow[]> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select(
      "id, organization_id, member_id, membership_id, invoice_number, issued_on, due_on, total_minor, status, notes, member:members(first_name, last_name), payments(amount_minor, status)",
    )
    .eq("organization_id", orgId)
    .order("issued_on", { ascending: false })
    .limit(200);
  throwIf(error, "Could not load invoices");
  return (data ?? []) as unknown as InvoiceListRow[];
}

// The invoice number is the only client-supplied identifier in the table and it
// must be unique per gym. Counting the year's existing rows gives a readable
// series; the unique constraint is the real guard, so a concurrent create fails
// loudly instead of overwriting.
// shortcut: number derives from a count, so a deleted invoice can reuse a
// number; switch to a per-org counter table if numbering must never repeat.
export async function createInvoice(
  orgId: string,
  input: {
    member_id: string;
    membership_id?: string | null;
    total_minor: number;
    issued_on?: string;
    due_on?: string;
    notes?: string;
  },
): Promise<Invoice> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { count, error: countError } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .like("invoice_number", `${prefix}%`);
  throwIf(countError, "Could not number the invoice");
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      member_id: input.member_id,
      membership_id: input.membership_id ?? null,
      invoice_number: `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`,
      issued_on: input.issued_on || new Date().toISOString().slice(0, 10),
      due_on: input.due_on || null,
      total_minor: input.total_minor,
      notes: input.notes?.trim() || null,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the invoice");
  return data as Invoice;
}

// Voiding keeps the row so the numbering series and the audit trail survive.
export async function voidInvoice(invoiceId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .update({ status: "void" })
    .eq("id", invoiceId)
    .select("id");
  throwIf(error, "Could not void the invoice");
  if (!data?.length) throw err("You cannot void this invoice");
}

// Uploads a workspace background image and returns its public URL. Objects
// live in the workspace-media bucket under <org>/<file>, which the storage
// policies (0008) authorize on the first path segment alone.
export async function uploadWorkspaceImage(
  orgId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await getSupabase()
    .storage
    .from("workspace-media")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  throwIf(error, "Could not upload the image");
  const { data } = getSupabase().storage.from("workspace-media").getPublicUrl(path);
  return data.publicUrl;
}
