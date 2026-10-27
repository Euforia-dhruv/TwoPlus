// Typed data-access layer for the platform admin area (/admin).
// Every call is a SECURITY DEFINER RPC that asserts is_platform_admin()
// server-side; the frontend never reads cross-tenant tables directly and
// never holds a service-role credential.
import { getSupabase } from "./supabase";

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export type OrgStatus = "active" | "trial" | "suspended" | "cancelled";
export type SubStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";
export type BillingInterval = "monthly" | "quarterly" | "annual";
export type TicketStatus = "open" | "in_progress" | "resolved";

export type PlatformMetrics = {
  total_orgs: number;
  orgs_by_status: Partial<Record<OrgStatus, number>>;
  total_members: number;
  active_members: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  mrr_minor: number;
  verified_revenue_minor: number;
  failed_payments_30d: number;
  overdue_invoices: number;
  renewals_due_14d: number;
  trials_ending_14d: number;
  new_orgs_7d: number;
  support_open: number;
  recent_orgs: Array<{
    id: string;
    name: string;
    status: OrgStatus;
    created_at: string;
  }>;
  recent_activity: Array<{
    action: string;
    target_type: string;
    target_id: string | null;
    actor_email: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  health: {
    server_time: string;
    database_version: string;
    error_monitoring: string;
  };
};

export type OrgListRow = {
  id: string;
  name: string;
  status: OrgStatus;
  phone: string | null;
  created_at: string;
  owner_id: string;
  owner_email: string | null;
  owner_name: string;
  member_count: number;
  branch_count: number;
  plan_name: string | null;
  sub_status: SubStatus | null;
  period_end: string | null;
  trial_ends_at: string | null;
};

export type OrgDetails = {
  id: string;
  name: string;
  status: OrgStatus;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  created_at: string;
  owner_id: string;
  owner_email: string | null;
  owner_name: string;
  member_count: number;
  active_member_count: number;
  branch_count: number;
  staff_count: number;
  gym_payment_count: number;
  gym_revenue_minor: number;
  branches: Array<{
    id: string;
    name: string;
    is_primary: boolean;
    is_archived: boolean;
    created_at: string;
  }>;
  subscription: {
    id: string;
    status: SubStatus;
    started_at: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancelled_at: string | null;
    plan_id: string;
    plan_code: string;
    plan_name: string;
    price_minor: number;
    currency: string;
    billing_interval: BillingInterval;
    trial_days: number;
    feature_limits: Record<string, unknown>;
  } | null;
  invoices: Array<{
    id: string;
    amount_minor: number;
    status: "open" | "paid" | "void";
    period_start: string;
    period_end: string;
    due_at: string;
    paid_at: string | null;
    created_at: string;
  }>;
  tickets: Array<{
    id: string;
    subject: string;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
  }>;
  recent_audit: Array<{
    action: string;
    actor_email: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
};

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  price_minor: number;
  currency: string;
  billing_interval: BillingInterval;
  trial_days: number;
  status: "active" | "retired";
  feature_limits: Record<string, unknown>;
  created_at: string;
  subscriber_count: number;
};

export type SubscriptionRow = {
  id: string;
  organization_id: string;
  org_name: string;
  org_status: OrgStatus;
  owner_email: string | null;
  status: SubStatus;
  started_at: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_name: string;
  plan_code: string;
  price_minor: number;
  billing_interval: BillingInterval;
  open_invoice: {
    id: string;
    amount_minor: number;
    due_at: string;
    status: string;
  } | null;
  last_payment: {
    amount_minor: number;
    provider: string;
    verified_at: string | null;
  } | null;
};

export type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TicketRow = {
  id: string;
  organization_id: string;
  org_name: string;
  subject: string;
  body: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export type Paged<T> = { rows: T[]; total: number };

async function rpc<T>(name: string, args: Record<string, unknown>, fallback: string): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  throwIf(error, fallback);
  return data as T;
}

// --- Metrics / overview ----------------------------------------------------

export function getMetrics(): Promise<PlatformMetrics> {
  return rpc("admin_platform_metrics", {}, "Could not load platform metrics");
}

// --- Organizations ---------------------------------------------------------

export function listOrganizations(opts: {
  query?: string;
  status?: OrgStatus | null;
  limit?: number;
  offset?: number;
} = {}): Promise<Paged<OrgListRow>> {
  return rpc(
    "admin_list_organizations",
    {
      p_search: opts.query?.trim() || null,
      p_status: opts.status ?? null,
      p_limit: opts.limit ?? 10,
      p_offset: opts.offset ?? 0,
    },
    "Could not load organizations",
  );
}

export function getOrgDetails(orgId: string): Promise<OrgDetails> {
  return rpc("admin_org_details", { p_org_id: orgId }, "Could not load organization");
}

export function provisionOrganization(input: {
  ownerEmail: string;
  name: string;
  phone?: string;
  branchName?: string;
  planCode?: string;
}): Promise<string> {
  return rpc(
    "admin_create_organization",
    {
      p_owner_email: input.ownerEmail,
      p_name: input.name,
      p_phone: input.phone || null,
      p_branch_name: input.branchName || null,
      p_plan_code: input.planCode || null,
    },
    "Could not provision the organization",
  );
}

export function setOrganizationStatus(
  orgId: string,
  status: OrgStatus,
  reason?: string,
): Promise<void> {
  return rpc(
    "admin_set_organization_status",
    { p_org_id: orgId, p_status: status, p_reason: reason || null },
    "Could not change organization status",
  );
}

// --- Subscriptions / billing ----------------------------------------------

export function assignSubscription(
  orgId: string,
  planCode: string,
  trialDays: number | null,
): Promise<string> {
  return rpc(
    "admin_assign_subscription",
    { p_org_id: orgId, p_plan_code: planCode, p_trial_days: trialDays },
    "Could not assign the subscription",
  );
}

export function generateInvoice(subscriptionId: string): Promise<string> {
  return rpc(
    "admin_generate_invoice",
    { p_subscription_id: subscriptionId },
    "Could not generate the invoice",
  );
}

export function recordSubscriptionPayment(
  invoiceId: string,
  providerRef?: string,
): Promise<string> {
  return rpc(
    "admin_record_subscription_payment",
    { p_invoice_id: invoiceId, p_provider: "manual", p_provider_ref: providerRef || null },
    "Could not record the payment",
  );
}

export function cancelSubscription(
  subscriptionId: string,
  reason?: string,
): Promise<void> {
  return rpc(
    "admin_cancel_subscription",
    { p_subscription_id: subscriptionId, p_reason: reason || null },
    "Could not cancel the subscription",
  );
}

export function listSubscriptions(opts: {
  status?: SubStatus | null;
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Paged<SubscriptionRow>> {
  return rpc(
    "admin_list_subscriptions",
    {
      p_status: opts.status ?? null,
      p_search: opts.query?.trim() || null,
      p_limit: opts.limit ?? 10,
      p_offset: opts.offset ?? 0,
    },
    "Could not load subscriptions",
  );
}

// --- Plans -----------------------------------------------------------------

export function listPlans(): Promise<PlatformPlan[]> {
  return rpc("admin_list_plans", {}, "Could not load plans");
}

export function upsertPlan(input: {
  id?: string;
  code: string;
  name: string;
  priceMinor: number;
  currency?: string;
  billingInterval: BillingInterval;
  trialDays: number;
  status: "active" | "retired";
  featureLimits: Record<string, unknown>;
}): Promise<string> {
  return rpc(
    "admin_upsert_plan",
    {
      p_id: input.id ?? null,
      p_code: input.code,
      p_name: input.name,
      p_price_minor: input.priceMinor,
      p_currency: input.currency ?? "INR",
      p_billing_interval: input.billingInterval,
      p_trial_days: input.trialDays,
      p_status: input.status,
      p_feature_limits: input.featureLimits,
    },
    "Could not save the plan",
  );
}

// --- Audit / support -------------------------------------------------------

export function listAudit(opts: {
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Paged<AuditRow>> {
  return rpc(
    "admin_list_audit",
    {
      p_search: opts.query?.trim() || null,
      p_limit: opts.limit ?? 20,
      p_offset: opts.offset ?? 0,
    },
    "Could not load the audit log",
  );
}

export function listTickets(opts: {
  status?: TicketStatus | null;
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Paged<TicketRow>> {
  return rpc(
    "admin_list_tickets",
    {
      p_status: opts.status ?? null,
      p_search: opts.query?.trim() || null,
      p_limit: opts.limit ?? 10,
      p_offset: opts.offset ?? 0,
    },
    "Could not load support tickets",
  );
}

export function upsertTicket(input: {
  id?: string;
  orgId?: string;
  subject: string;
  body?: string;
  status: TicketStatus;
}): Promise<string> {
  return rpc(
    "admin_upsert_ticket",
    {
      p_id: input.id ?? null,
      p_org_id: input.orgId ?? null,
      p_subject: input.subject,
      p_body: input.body || null,
      p_status: input.status,
    },
    "Could not save the ticket",
  );
}
