import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePlatformAdmin } from "@/lib/use-platform-admin";
import * as admin from "@/lib/admin-api";
import type { AuditRow, OrgDetails, OrgListRow, OrgStatus, PlatformMetrics, PlatformPlan, SubscriptionRow, TicketRow } from "@/lib/admin-api";

const PAGE_SIZE = 10;
import "./auth.css";

type Section = "Overview" | "Gyms" | "Billing" | "Plans" | "Support" | "Audit";
const sections: Section[] = ["Overview", "Gyms", "Billing", "Plans", "Support", "Audit"];

function money(minor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="super-admin-panel"><header className="super-admin-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="super-admin-empty">{children}</p>;
}

/** "1 failed payment" / "3 failed payments" / "—" while loading. */
function count(value: number | undefined, noun: string) {
  if (value === undefined) return "—";
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

export default function SuperAdmin() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { isAdmin, role, loading: roleLoading } = usePlatformAdmin();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("Overview");
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [orgs, setOrgs] = useState<OrgListRow[]>([]);
  const [allOrgs, setAllOrgs] = useState<OrgListRow[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState<OrgDetails | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [orgForm, setOrgForm] = useState(false);
  const [gymName, setGymName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [ticketOrg, setTicketOrg] = useState("");
  const [subscriptionOrg, setSubscriptionOrg] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("");
  const [subscriptionTrialDays, setSubscriptionTrialDays] = useState("");
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planId, setPlanId] = useState("");
  const [planTrialDays, setPlanTrialDays] = useState("14");
  const [planInterval, setPlanInterval] = useState<admin.BillingInterval>("monthly");
  const [planStatus, setPlanStatus] = useState<"active" | "retired">("active");
  const [planMaxMembers, setPlanMaxMembers] = useState("");
  const requestKey = `${session?.user.id ?? ""}:${section}:${query}:${page}:${refresh}`;
  const loadingData = isAdmin && loadedKey !== requestKey;

  useEffect(() => {
    if (!session || !isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const [metricsResult, orgResult] = await Promise.all([
          admin.getMetrics(),
          admin.listOrganizations({ query, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
        ]);
        if (cancelled) return;
        setMetrics(metricsResult);
        setOrgs(orgResult.rows);
        setOrgTotal(orgResult.total);
        // Ticket form needs every gym, not just the current page.
        if (section === "Support" || section === "Billing") setAllOrgs((await admin.listOrganizations({ limit: 100 })).rows);
        if (section === "Billing") {
          const [subscriptionResult, planResult] = await Promise.all([
            admin.listSubscriptions({ query, limit: 50 }),
            admin.listPlans(),
          ]);
          setSubscriptions(subscriptionResult.rows);
          setPlans(planResult);
        }
        if (section === "Plans") setPlans(await admin.listPlans());
        if (section === "Support") setTickets((await admin.listTickets({ query, limit: 50 })).rows);
        if (section === "Audit") setAuditRows((await admin.listAudit({ query, limit: 50 })).rows);
        setError("");
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load the platform workspace.");
      } finally {
        if (!cancelled) setLoadedKey(requestKey);
      }
    })();
    return () => { cancelled = true; };
  }, [session, isAdmin, section, query, page, refresh, requestKey]);

  async function runAction(action: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await action();
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function openDetails(orgId: string) {
    setError("");
    try {
      setDetails(await admin.getOrgDetails(orgId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load that gym.");
    }
  }

  async function createGym(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      await admin.provisionOrganization({ ownerEmail, name: gymName });
      setGymName(""); setOwnerEmail(""); setOrgForm(false);
    });
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    const maxMembers = planMaxMembers.trim();
    if (maxMembers && (!Number.isInteger(Number(maxMembers)) || Number(maxMembers) < 1)) {
      setError("Member limit must be a whole number of one or more, or left blank for unlimited.");
      return;
    }
    await runAction(async () => {
      await admin.upsertPlan({
        id: planId || undefined,
        code: planCode,
        name: planName,
        priceMinor: Math.round(Number(planPrice) * 100),
        billingInterval: planInterval,
        trialDays: Number(planTrialDays || 0),
        status: planStatus,
        featureLimits: maxMembers ? { max_members: Number(maxMembers) } : {},
      });
      resetPlanForm();
    });
  }

  function resetPlanForm() {
    setPlanId(""); setPlanCode(""); setPlanName(""); setPlanPrice("");
    setPlanTrialDays("14"); setPlanInterval("monthly"); setPlanStatus("active");
    setPlanMaxMembers("");
  }

  function editPlan(plan: PlatformPlan) {
    setPlanId(plan.id); setPlanCode(plan.code); setPlanName(plan.name);
    setPlanPrice(String(plan.price_minor / 100));
    setPlanTrialDays(String(plan.trial_days));
    setPlanInterval(plan.billing_interval);
    setPlanStatus(plan.status);
    setPlanMaxMembers(
      plan.feature_limits.max_members === undefined
        ? ""
        : String(plan.feature_limits.max_members),
    );
  }

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    if (!ticketOrg) { setError("Choose a gym for this support ticket."); return; }
    await runAction(async () => {
      await admin.upsertTicket({ orgId: ticketOrg, subject: ticketSubject, body: ticketBody, status: "open" });
      setTicketSubject(""); setTicketBody("");
    });
  }

  async function assignPlan(event: FormEvent) {
    event.preventDefault();
    const trialDays = subscriptionTrialDays.trim() === ""
      ? null
      : Number(subscriptionTrialDays);
    if (!subscriptionOrg || !subscriptionPlan) {
      setError("Choose a gym and a plan.");
      return;
    }
    if (trialDays !== null && (!Number.isInteger(trialDays) || trialDays < 0)) {
      setError("Trial days must be a whole number of zero or more.");
      return;
    }
    await runAction(async () => {
      await admin.assignSubscription(subscriptionOrg, subscriptionPlan, trialDays);
      setSubscriptionOrg("");
      setSubscriptionPlan("");
      setSubscriptionTrialDays("");
    });
  }

  if (authLoading || roleLoading) return <div className="super-admin-loading">Checking administrator access…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin || role !== "super_admin") return <Navigate to="/" replace />;

  return (
    <main className="super-admin-page">
      <header className="super-admin-topbar">
        <div><span className="super-admin-mark">TwoPlus.fit</span><small>PLATFORM CONTROL</small></div>
        <div className="super-admin-actions"><span className="super-admin-identity">{session.user.email} · Super Admin</span><button className="super-admin-button secondary" onClick={() => navigate("/")}>Gym workspace</button><button className="super-admin-button" onClick={() => void signOut()}>Sign out</button></div>
      </header>
      <section className="super-admin-content">
        <p className="super-admin-eyebrow">SUPER ADMIN</p><h1>Platform control center</h1><p className="super-admin-intro">Manage gym workspaces, plans, billing, and support from one secure control room.</p>
        <nav className="super-admin-nav" aria-label="Platform sections">{sections.map((item) => <button key={item} className={section === item ? "selected" : ""} onClick={() => { setSection(item); setQuery(""); setPage(0); setDetails(null); }}>{item}</button>)}</nav>
        {error && <p className="super-admin-error" role="alert">{error}</p>}
        {section === "Overview" && <>
          <div className="super-admin-stats"><article><span>Gym workspaces</span><strong>{loadingData ? "—" : metrics?.total_orgs ?? "—"}</strong></article><article><span>Active members</span><strong>{loadingData ? "—" : metrics?.active_members ?? "—"}</strong></article><article><span>Active subscriptions</span><strong>{loadingData ? "—" : metrics?.active_subscriptions ?? "—"}</strong></article><article><span>Monthly recurring revenue</span><strong>{loadingData ? "—" : metrics ? money(metrics.mrr_minor) : "—"}</strong></article></div>
          <div className="super-admin-stats"><article><span>Trial workspaces</span><strong>{loadingData ? "—" : metrics?.orgs_by_status.trial ?? 0}</strong></article><article><span>Suspended workspaces</span><strong>{loadingData ? "—" : metrics?.orgs_by_status.suspended ?? 0}</strong></article><article><span>Cancelled workspaces</span><strong>{loadingData ? "—" : metrics?.orgs_by_status.cancelled ?? 0}</strong></article><article><span>Verified platform revenue</span><strong>{loadingData ? "—" : metrics ? money(metrics.verified_revenue_minor) : "—"}</strong></article></div>
          <div className="super-admin-grid"><Panel title="Recent gyms" subtitle="Latest workspaces on the platform">{metrics?.recent_orgs.length ? <div className="super-admin-list">{metrics.recent_orgs.map((org) => <div key={org.id}><strong>{org.name}</strong><span>{org.status} · {new Date(org.created_at).toLocaleDateString("en-IN")}</span></div>)}</div> : <Empty>{loadingData ? "Loading…" : "No gym workspaces yet."}</Empty>}</Panel><Panel title="Needs attention" subtitle="Current billing and support signals"><div className="super-admin-list"><div><strong>{count(metrics?.overdue_invoices, "overdue invoice")}</strong><span>Open invoices past their due date</span></div><div><strong>{count(metrics?.failed_payments_30d, "failed payment")}</strong><span>In the last 30 days</span></div><div><strong>{count(metrics?.renewals_due_14d, "renewal")} due</strong><span>Active subscriptions ending within 14 days</span></div><div><strong>{count(metrics?.trials_ending_14d, "trial")} ending soon</strong><span>Within the next 14 days</span></div><div><strong>{count(metrics?.support_open, "open support ticket")}</strong><span>Waiting for an administrator</span></div></div></Panel></div>
          <div className="super-admin-grid"><Panel title="Recent platform activity" subtitle="Changes recorded in the admin audit log">{metrics?.recent_activity.length ? <div className="super-admin-list">{metrics.recent_activity.map((entry, index) => <div key={`${entry.created_at}-${index}`}><strong>{entry.action}</strong><span>{entry.actor_email || "System"} · {entry.target_type} · {new Date(entry.created_at).toLocaleString("en-IN")}</span></div>)}</div> : <Empty>{loadingData ? "Loading…" : "No administrative changes recorded yet."}</Empty>}</Panel><Panel title="System health" subtitle="Reported directly by the database">{metrics ? <div className="super-admin-list"><div><strong>Database reachable</strong><span>Server time {new Date(metrics.health.server_time).toLocaleString("en-IN")}</span></div><div><strong>Error monitoring: {metrics.health.error_monitoring}</strong><span>No error-tracking service is connected, so backend errors are not aggregated here.</span></div><div><strong>{metrics.new_orgs_7d} new gyms this week</strong><span>{metrics.trialing_subscriptions} subscriptions currently trialing</span></div></div> : <Empty>{loadingData ? "Loading…" : "Health data unavailable."}</Empty>}</Panel></div>
        </>}
        {section === "Gyms" && <>
          {details && <Panel title={details.name} subtitle={`${details.status} · ${details.owner_email || "no owner email"} · created ${new Date(details.created_at).toLocaleDateString("en-IN")}`} action={<button className="super-admin-button secondary" onClick={() => setDetails(null)}>Close</button>}>
            <div className="super-admin-grid">
              <div className="super-admin-list">
                <div><strong>{details.member_count} members</strong><span>{details.active_member_count} active · {details.branch_count} branches · {details.staff_count} staff</span></div>
                <div><strong>{money(details.gym_revenue_minor, details.currency)}</strong><span>Gym revenue from {details.gym_payment_count} recorded payments</span></div>
                <div><strong>{details.subscription ? `${details.subscription.plan_name} · ${details.subscription.status}` : "No subscription"}</strong><span>{details.subscription ? `${money(details.subscription.price_minor, details.subscription.currency)} / ${details.subscription.billing_interval}` : "No platform plan assigned"}</span></div>
                <div><strong>{details.tickets.length} support tickets</strong><span>{details.tickets.filter((ticket) => ticket.status !== "resolved").length} still open</span></div>
              </div>
              <div className="super-admin-list">
                <div><strong>Branches</strong><span>{details.branches.map((branch) => branch.name).join(", ") || "None"}</span></div>
                <div><strong>Invoices</strong><span>{details.invoices.length} total · {details.invoices.filter((invoice) => invoice.status === "open").length} open</span></div>
                <div><strong>Contact</strong><span>{details.phone || "No phone"} · {details.address || "No address"}</span></div>
                <div><strong>Recent admin changes</strong><span>{details.recent_audit.length ? details.recent_audit[0].action + " · " + new Date(details.recent_audit[0].created_at).toLocaleDateString("en-IN") : "None recorded"}</span></div>
              </div>
            </div>
          </Panel>}
          <Panel title="Gym workspaces" subtitle={`${orgTotal} total · search and manage access`} action={<button className="super-admin-button" onClick={() => setOrgForm((value) => !value)}>{orgForm ? "Close" : "Add gym"}</button>}>
            {orgForm && <form className="super-admin-form" onSubmit={createGym}><label>Gym name<input required minLength={2} value={gymName} onChange={(event) => setGymName(event.target.value)} /></label><label>Owner email<input required type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} /></label><button className="super-admin-button" disabled={busy}>Create workspace</button><small>The owner must already have a TwoPlus account. No invitation email is sent.</small></form>}
            <input className="super-admin-search" aria-label="Search gyms" placeholder="Search gyms or owners" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
            {orgs.length ? <div className="super-admin-table-wrap"><table className="super-admin-table"><thead><tr><th>Gym</th><th>Owner</th><th>Status</th><th>Members</th><th>Branches</th><th>Plan</th><th>Access</th></tr></thead><tbody>{orgs.map((org) => <tr key={org.id}><td><strong>{org.name}</strong><small>{org.phone || "No phone added"}</small></td><td>{org.owner_email || org.owner_name || "—"}</td><td><span className={`super-admin-status ${org.status}`}>{org.status}</span></td><td>{org.member_count}</td><td>{org.branch_count}</td><td>{org.plan_name || "Unassigned"}</td><td className="super-admin-row-actions"><button disabled={busy} onClick={() => void openDetails(org.id)}>Details</button><select aria-label={`Change ${org.name} status`} value={org.status} disabled={busy} onChange={(event) => { const status = event.target.value as OrgStatus; if (window.confirm(`Change ${org.name} to ${status}?`)) void runAction(() => admin.setOrganizationStatus(org.id, status, "Changed in platform control center")); }}><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table></div> : <Empty>{loadingData ? "Loading gyms…" : "No gyms match this search."}</Empty>}
            {orgTotal > PAGE_SIZE && <div className="super-admin-pager"><button disabled={busy || page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><span>Page {page + 1} of {Math.ceil(orgTotal / PAGE_SIZE)}</span><button disabled={busy || (page + 1) * PAGE_SIZE >= orgTotal} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
          </Panel>
        </>}
        {section === "Billing" && <div className="super-admin-grid">
          <Panel title="Subscriptions" subtitle="Platform plans and verified billing activity">
            <input className="super-admin-search" aria-label="Search subscriptions" placeholder="Search gyms or email" value={query} onChange={(event) => setQuery(event.target.value)} />
            {subscriptions.length ? <div className="super-admin-table-wrap"><table className="super-admin-table"><thead><tr><th>Gym</th><th>Owner</th><th>Plan</th><th>Status</th><th>Period end</th><th>Invoice</th><th>Actions</th></tr></thead><tbody>{subscriptions.map((sub) => <tr key={sub.id}><td><strong>{sub.org_name}</strong><small>{sub.org_status}</small></td><td>{sub.owner_email || "—"}</td><td>{sub.plan_name}<small>{money(sub.price_minor)} / {sub.billing_interval}</small></td><td>{sub.status}</td><td>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("en-IN") : "—"}</td><td>{sub.open_invoice ? `${money(sub.open_invoice.amount_minor)} · due ${sub.open_invoice.due_at}` : "None open"}</td><td className="super-admin-row-actions"><button disabled={busy} onClick={() => void runAction(() => admin.generateInvoice(sub.id))}>Invoice</button>{sub.open_invoice && <button disabled={busy} onClick={() => { if (window.confirm("Only continue if this invoice has actually been paid and verified outside TwoPlus.")) void runAction(() => admin.recordSubscriptionPayment(sub.open_invoice!.id)); }}>Mark paid</button>}<button disabled={busy || sub.status === "cancelled"} onClick={() => { if (window.confirm(`Cancel the subscription for ${sub.org_name}? Open invoices will be voided.`)) void runAction(() => admin.cancelSubscription(sub.id, "Cancelled in platform control center")); }}>Cancel</button></td></tr>)}</tbody></table></div> : <Empty>{loadingData ? "Loading subscriptions…" : "No subscriptions found."}</Empty>}
          </Panel>
          <Panel title="Assign a plan" subtitle="Start a gym trial or create its first invoice">
            <form className="super-admin-form" onSubmit={assignPlan}>
              <label>Gym<select required value={subscriptionOrg} onChange={(event) => setSubscriptionOrg(event.target.value)}><option value="">Choose a gym</option>{allOrgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
              <label>Plan<select required value={subscriptionPlan} onChange={(event) => setSubscriptionPlan(event.target.value)}><option value="">Choose a plan</option>{plans.filter((plan) => plan.status === "active").map((plan) => <option key={plan.id} value={plan.code}>{plan.name} · {money(plan.price_minor, plan.currency)} / {plan.billing_interval}</option>)}</select></label>
              <label>Trial days<input type="number" min="0" step="1" placeholder="Use plan default" value={subscriptionTrialDays} onChange={(event) => setSubscriptionTrialDays(event.target.value)} /></label>
              <small>Set trial days to 0 to open an invoice immediately. A blank value uses the plan’s default trial.</small>
              <button className="super-admin-button" disabled={busy || !plans.some((plan) => plan.status === "active")}>Assign subscription</button>
            </form>
          </Panel>
        </div>}
        {section === "Plans" && <div className="super-admin-grid"><Panel title="Platform plans" subtitle="Prices are stored in minor units of the plan currency">{plans.length ? <div className="super-admin-list">{plans.map((plan) => <div key={plan.id}><strong>{plan.name} <span className="super-admin-code">{plan.code}</span></strong><span>{money(plan.price_minor, plan.currency)} / {plan.billing_interval} · {plan.trial_days} trial days · {plan.subscriber_count} subscribers · {plan.status}{plan.feature_limits.max_members !== undefined ? ` · up to ${plan.feature_limits.max_members} members` : ""}</span><button className="super-admin-button secondary" disabled={busy} onClick={() => editPlan(plan)}>Edit</button></div>)}</div> : <Empty>{loadingData ? "Loading plans…" : "No plans configured."}</Empty>}</Panel><Panel title={planId ? "Edit plan" : "Create a plan"} subtitle={planId ? "Existing subscribers keep their assigned plan record" : "Pricing, interval, trial, and member limit"}><form className="super-admin-form" onSubmit={savePlan}><label>Plan name<input required minLength={2} value={planName} onChange={(event) => { setPlanName(event.target.value); if (!planId && !planCode.replace(/[^a-z0-9-]/g, "")) setPlanCode(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} /></label><label>Plan code<input required pattern="[a-z0-9\-]+" title="Lowercase letters, numbers, and hyphens" value={planCode} onChange={(event) => setPlanCode(event.target.value)} /></label><label>Price<input required type="number" min="0" step="1" value={planPrice} onChange={(event) => setPlanPrice(event.target.value)} /></label><label>Billing interval<select value={planInterval} onChange={(event) => setPlanInterval(event.target.value as admin.BillingInterval)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label><label>Trial days<input required type="number" min="0" step="1" value={planTrialDays} onChange={(event) => setPlanTrialDays(event.target.value)} /></label><label>Member limit<input type="number" min="1" step="1" placeholder="Unlimited" value={planMaxMembers} onChange={(event) => setPlanMaxMembers(event.target.value)} /><small>Enforced when a gym adds members. Leave blank for unlimited.</small></label><label>Status<select value={planStatus} onChange={(event) => setPlanStatus(event.target.value as "active" | "retired")}><option value="active">Active</option><option value="retired">Retired (no new assignments)</option></select></label><div className="super-admin-row-actions"><button className="super-admin-button" disabled={busy}>{planId ? "Save plan" : "Create plan"}</button>{planId && <button type="button" className="super-admin-button secondary" onClick={resetPlanForm}>Cancel edit</button>}</div></form></Panel></div>}
        {section === "Support" && <div className="super-admin-grid"><Panel title="Support queue" subtitle="Track and resolve gym requests"><input className="super-admin-search" aria-label="Search tickets" placeholder="Search tickets or gyms" value={query} onChange={(event) => setQuery(event.target.value)} />{tickets.length ? <div className="super-admin-list">{tickets.map((ticket) => <div key={ticket.id}><strong>{ticket.subject} · {ticket.org_name}</strong><span>{ticket.body || "No details"}</span><select aria-label={`Ticket status: ${ticket.subject}`} value={ticket.status} disabled={busy} onChange={(event) => void runAction(() => admin.upsertTicket({ id: ticket.id, subject: ticket.subject, body: ticket.body || "", status: event.target.value as "open" | "in_progress" | "resolved" }))}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div>)}</div> : <Empty>{loadingData ? "Loading support tickets…" : "No tickets found."}</Empty>}</Panel><Panel title="Create a support ticket" subtitle="Record a request for a gym"><form className="super-admin-form" onSubmit={createTicket}><label>Gym<select required value={ticketOrg} onChange={(event) => setTicketOrg(event.target.value)}><option value="">Choose a gym</option>{allOrgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Subject<input required minLength={3} value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} /></label><label>Details<textarea value={ticketBody} onChange={(event) => setTicketBody(event.target.value)} rows={4} /></label><button className="super-admin-button" disabled={busy}>Create ticket</button></form></Panel></div>}
        {section === "Audit" && <Panel title="Admin audit log" subtitle="Recent platform changes"><input className="super-admin-search" aria-label="Search audit log" placeholder="Search actions or administrators" value={query} onChange={(event) => setQuery(event.target.value)} />{auditRows.length ? <div className="super-admin-table-wrap"><table className="super-admin-table"><thead><tr><th>Action</th><th>Target</th><th>Administrator</th><th>Time</th></tr></thead><tbody>{auditRows.map((row) => <tr key={row.id}><td><strong>{row.action}</strong></td><td>{row.target_type}{row.target_id ? <small>{row.target_id}</small> : null}</td><td>{row.actor_email || "System"}</td><td>{new Date(row.created_at).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div> : <Empty>{loadingData ? "Loading audit history…" : "No admin changes recorded yet."}</Empty>}</Panel>}
        <p className="super-admin-note">Every cross-gym operation is checked by a database authorization function and recorded where it changes platform state.</p>
      </section>
    </main>
  );
}
