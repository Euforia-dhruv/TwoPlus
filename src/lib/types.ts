// Row shapes for the TwoPlus.fit database (see supabase/migrations/0001_init.sql).

export type OrgRole =
  | "owner"
  | "manager"
  | "trainer"
  | "receptionist"
  | "finance";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type OrganizationStatus = "active" | "trial" | "suspended" | "cancelled";

export type Organization = {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  /** Absent until migration 0002 is applied. */
  status?: OrganizationStatus;
  /** Absent until migration 0003 is applied. */
  theme_preset?: string;
  theme_mode?: string;
  theme_image?: string | null;
};

export type Branch = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  is_primary: boolean;
  is_archived: boolean;
};

export type OrgContext = {
  organization: Organization;
  branch: Branch | null;
  role: OrgRole;
};

export type MembershipPlan = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price_minor: number;
  joining_fee_minor: number;
  is_active: boolean;
};

export type MemberStatus = "active" | "suspended" | "archived";

export type Member = {
  id: string;
  organization_id: string;
  member_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  trainer_id: string | null;
  status: MemberStatus;
  notes: string | null;
  joined_on: string;
};

export type MembershipStatus =
  | "scheduled"
  | "active"
  | "expired"
  | "frozen"
  | "cancelled";

export type MemberMembership = {
  id: string;
  organization_id: string;
  member_id: string;
  plan_id: string | null;
  plan_name: string;
  status: MembershipStatus;
  start_date: string;
  end_date: string;
  price_minor: number;
};

export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "other";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

export type Payment = {
  id: string;
  organization_id: string;
  member_id: string;
  membership_id: string | null;
  amount_minor: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_on: string;
  description: string | null;
};

export type AttendanceRecord = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  member_id: string;
  check_in: string;
  check_out: string | null;
  method: string;
};

export type EnquiryStatus = "new" | "contacted" | "follow_up" | "converted" | "lost";

export type Enquiry = {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: "walk_in" | "referral" | "social" | "website" | "phone" | "other";
  status: EnquiryStatus;
  follow_up_date: string | null;
  notes: string | null;
  converted_member_id: string | null;
};

export type StaffMember = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  job_role: string;
  employment_status: "active" | "inactive";
  joined_on: string;
};

export type GymClass = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  trainer_id: string | null;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  status: "scheduled" | "completed" | "cancelled";
};

export type Expense = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  category: string;
  description: string | null;
  amount_minor: number;
  expense_date: string;
};

export type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  activeMemberships: number;
  expiringSoon: number;
  expiredMemberships: number;
  attendanceToday: number;
  monthCollectionsMinor: number;
  pendingPaymentsMinor: number;
  monthExpensesMinor: number;
  newEnquiries: number;
  upcomingClasses: number;
};

export type AppNotification = {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "info" | "warning" | "success" | "task";
  read_at: string | null;
  created_at: string;
};

// Returned by the list_org_members RPC (migration 0004). profiles is not
// readable across users, so the roster has to come from a definer function.
export type OrgMemberRow = {
  user_id: string;
  role: OrgRole;
  full_name: string;
  email: string | null;
};

// One row per calendar month, built from records that actually exist. No
// projections or sample figures.
export type ReportMonth = {
  month: string;
  label: string;
  collectedMinor: number;
  pendingMinor: number;
  expensesMinor: number;
  visits: number;
  newMembers: number;
};

// ---------------------------------------------------------------------------
// Formatting helpers shared by the dashboard views
// ---------------------------------------------------------------------------

export function formatMoney(minor: number, currency = "INR"): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `₹${major.toLocaleString("en-IN")}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
