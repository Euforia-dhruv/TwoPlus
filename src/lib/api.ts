// Typed data-access layer. Every query is organization-scoped explicitly;
// RLS enforces the same scoping server-side as the security boundary.
import { getSupabase } from "./supabase";
import type {
  AttendanceRecord,
  DashboardStats,
  Enquiry,
  Expense,
  GymClass,
  Member,
  MemberMembership,
  MembershipPlan,
  OrgContext,
  Payment,
  PaymentMethod,
  StaffMember,
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
    })
    .select("*")
    .single();
  throwIf(error, "Could not create the member");
  return data as Member;
}

export async function updateMember(
  memberId: string,
  patch: Partial<
    Pick<Member, "first_name" | "last_name" | "email" | "phone" | "status" | "notes" | "date_of_birth">
  >,
): Promise<void> {
  const { error } = await getSupabase()
    .from("members")
    .update(patch)
    .eq("id", memberId);
  throwIf(error, "Could not update the member");
}

// ---------------------------------------------------------------------------
// Membership plans & member memberships
// ---------------------------------------------------------------------------

export async function listPlans(orgId: string): Promise<MembershipPlan[]> {
  const { data, error } = await getSupabase()
    .from("membership_plans")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");
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
  options: { status?: Payment["status"]; limit?: number } = {},
): Promise<Payment[]> {
  let q = getSupabase()
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .order("paid_on", { ascending: false })
    .limit(options.limit ?? 200);
  if (options.status) q = q.eq("status", options.status);
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
