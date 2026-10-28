import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { Icon, type IconName } from "@/icons";
import { Avatar, Badge, Button, Input, Select, Stats, Title } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { usePlatformAdmin } from "@/lib/use-platform-admin";
import * as admin from "@/lib/admin-api";
import type {
  AuditRow,
  BillingInterval,
  OrgDetails,
  OrgListRow,
  OrgStatus,
  PlatformMetrics,
  PlatformPlan,
  SubStatus,
  SubscriptionRow,
  TicketRow,
  TicketStatus,
} from "@/lib/admin-api";
import { formatDate, formatMoney } from "@/lib/types";

const PAGE_SIZE = 10;

type Section = "Overview" | "Gyms" | "Billing" | "Plans" | "Support" | "Audit";

const sections: Array<{ key: Section; icon: IconName; title: string; intro: string }> = [
  {
    key: "Overview",
    icon: "dashboard",
    title: "Platform overview",
    intro: "Live figures from every gym workspace on TwoPlus.",
  },
  {
    key: "Gyms",
    icon: "building",
    title: "Gym workspaces",
    intro: "Search, inspect, and manage access for every organization.",
  },
  {
    key: "Billing",
    icon: "wallet",
    title: "Subscriptions & billing",
    intro: "Platform plans, invoices, and payments verified outside the app.",
  },
  {
    key: "Plans",
    icon: "package",
    title: "Platform plans",
    intro: "Pricing, billing intervals, trial periods, and feature limits.",
  },
  {
    key: "Support",
    icon: "headset",
    title: "Support",
    intro: "Requests raised by gym workspaces.",
  },
  {
    key: "Audit",
    icon: "shield",
    title: "Audit log",
    intro: "Every administrative change, with actor and timestamp.",
  },
];

/** past_due -> "Past due" */
function label(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** "1 failed payment" / "3 failed payments" / "—" while loading. */
function count(value: number | undefined, noun: string) {
  if (value === undefined) return "—";
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function Panel({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <Title>{title}</Title>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Pill row used inside panels: label on the left, value on the right. */
function Lines({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <>
      {rows.map(([key, value]) => (
        <div className="detail-line" key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </>
  );
}

type Confirmation = {
  title: string;
  message: string;
  cta: string;
  action: () => Promise<unknown>;
} | null;

type Drawer =
  | { kind: "org"; details: OrgDetails; plans: PlatformPlan[] }
  | { kind: "subscription"; row: SubscriptionRow }
  | { kind: "ticket"; row: TicketRow }
  | null;

export default function SuperAdmin() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { isAdmin, role, loading: roleLoading } = usePlatformAdmin();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>("Overview");
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [orgs, setOrgs] = useState<OrgListRow[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketFilter, setTicketFilter] = useState<TicketStatus | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");

  const [drawer, setDrawer] = useState<Drawer>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [modal, setModal] = useState("");

  const [orgPlan, setOrgPlan] = useState("");
  const [orgTrialDays, setOrgTrialDays] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [ticketDraft, setTicketDraft] = useState<{ subject: string; body: string; status: TicketStatus }>({
    subject: "",
    body: "",
    status: "open",
  });

  const [gymName, setGymName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ticketOrg, setTicketOrg] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");

  const [planId, setPlanId] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planTrialDays, setPlanTrialDays] = useState("14");
  const [planInterval, setPlanInterval] = useState<BillingInterval>("monthly");
  const [planStatus, setPlanStatus] = useState<"active" | "retired">("active");
  const [planMaxMembers, setPlanMaxMembers] = useState("");

  const active = sections.find((item) => item.key === section) ?? sections[0];
  const requestKey = `${session?.user.id ?? ""}:${section}:${query}:${page}:${orgStatus}:${subStatus}:${ticketFilter}:${refresh}`;
  const loadingData = isAdmin && loadedKey !== requestKey;

  useEffect(() => {
    if (!session || !isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const offset = page * PAGE_SIZE;
        if (section === "Overview") {
          const result = await admin.getMetrics();
          if (!cancelled) setMetrics(result);
        } else if (section === "Gyms") {
          const [result, orgResult] = await Promise.all([
            admin.getMetrics(),
            admin.listOrganizations({ query, status: orgStatus, limit: PAGE_SIZE, offset }),
          ]);
          if (cancelled) return;
          setMetrics(result);
          setOrgs(orgResult.rows);
          setOrgTotal(orgResult.total);
        } else if (section === "Billing") {
          const [subResult, planResult] = await Promise.all([
            admin.listSubscriptions({ query, status: subStatus, limit: PAGE_SIZE, offset }),
            admin.listPlans(),
          ]);
          if (cancelled) return;
          setSubscriptions(subResult.rows);
          setSubTotal(subResult.total);
          setPlans(planResult);
        } else if (section === "Plans") {
          const result = await admin.listPlans();
          if (!cancelled) setPlans(result);
        } else if (section === "Support") {
          const [ticketResult, orgResult] = await Promise.all([
            admin.listTickets({ query, status: ticketFilter, limit: PAGE_SIZE, offset }),
            admin.listOrganizations({ limit: 100 }),
          ]);
          if (cancelled) return;
          setTickets(ticketResult.rows);
          setTicketTotal(ticketResult.total);
          setOrgs(orgResult.rows);
        } else {
          const result = await admin.listAudit({ query, limit: PAGE_SIZE, offset });
          if (cancelled) return;
          setAuditRows(result.rows);
          setAuditTotal(result.total);
        }
        setError("");
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load the platform workspace.",
          );
        }
      } finally {
        if (!cancelled) setLoadedKey(requestKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    session,
    isAdmin,
    section,
    query,
    page,
    orgStatus,
    subStatus,
    ticketFilter,
    refresh,
    requestKey,
  ]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Entrance choreography on every section switch — same recipe as the
  // gym workspace: heading, stat cards, panels, then table rows.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const motion = gsap.matchMedia(main);
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const heading = main.querySelector<HTMLElement>(".page-heading");
      const statCards = gsap.utils.toArray<HTMLElement>(".stats > .stat", main);
      const sections = gsap.utils.toArray<HTMLElement>(
        ".panel, .directory, .attention, .integration-note",
        main,
      );
      const rows = gsap.utils.toArray<HTMLElement>(".directory tbody tr", main);
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (heading) {
        timeline.fromTo(
          heading,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.4, clearProps: "opacity,visibility,transform" },
          0,
        );
      }
      if (statCards.length) {
        timeline.fromTo(
          statCards,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          {
            autoAlpha: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.07,
            clearProps: "opacity,visibility,transform",
          },
          0.08,
        );
      }
      if (sections.length) {
        timeline.fromTo(
          sections,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08,
            clearProps: "opacity,visibility,transform",
          },
          statCards.length ? 0.2 : 0.1,
        );
      }
      if (rows.length) {
        timeline.fromTo(
          rows,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.035,
            clearProps: "opacity,visibility,transform",
          },
          0.35,
        );
      }
    });
    return () => motion.revert();
  }, [section]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    setError("");
    setBusy(true);
    try {
      await action();
      setRefresh((value) => value + 1);
      setNotice(message);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "That change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  function ask(
    title: string,
    message: string,
    cta: string,
    action: () => Promise<unknown>,
  ) {
    setConfirmation({ title, message, cta, action });
  }

  async function confirmAction() {
    if (!confirmation) return;
    const pending = confirmation;
    setConfirmation(null);
    setModal("");
    await runAction(pending.action, pending.cta);
    setDrawer(null);
  }

  async function openOrg(orgId: string) {
    setError("");
    try {
      const [details, planList] = await Promise.all([
        admin.getOrgDetails(orgId),
        admin.listPlans(),
      ]);
      setOrgPlan("");
      setOrgTrialDays("");
      setDrawer({ kind: "org", details, plans: planList });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load that gym.",
      );
    }
  }

  function openTicket(ticket: TicketRow) {
    setTicketDraft({
      subject: ticket.subject,
      body: ticket.body ?? "",
      status: ticket.status,
    });
    setDrawer({ kind: "ticket", row: ticket });
  }

  function openSubscription(row: SubscriptionRow) {
    setPaymentRef("");
    setDrawer({ kind: "subscription", row });
  }

  async function provisionGym(event: FormEvent) {
    event.preventDefault();
    await runAction(
      () => admin.provisionOrganization({ ownerEmail, name: gymName }),
      "Gym workspace created",
    );
    setGymName("");
    setOwnerEmail("");
    setModal("");
  }

  function savePlan(event: FormEvent) {
    event.preventDefault();
    const maxMembers = planMaxMembers.trim();
    if (maxMembers && (!Number.isInteger(Number(maxMembers)) || Number(maxMembers) < 1)) {
      setError("Member limit must be a whole number of one or more, or left blank for unlimited.");
      return;
    }
    void runAction(
      () =>
        admin.upsertPlan({
          id: planId || undefined,
          code: planCode,
          name: planName,
          priceMinor: Math.round(Number(planPrice) * 100),
          billingInterval: planInterval,
          trialDays: Number(planTrialDays || 0),
          status: planStatus,
          featureLimits: maxMembers ? { max_members: Number(maxMembers) } : {},
        }),
      planId ? "Plan updated" : "Plan created",
    ).then(() => {
      resetPlanForm();
      setModal("");
    });
  }

  function resetPlanForm() {
    setPlanId("");
    setPlanCode("");
    setPlanName("");
    setPlanPrice("");
    setPlanTrialDays("14");
    setPlanInterval("monthly");
    setPlanStatus("active");
    setPlanMaxMembers("");
  }

  function editPlan(plan: PlatformPlan) {
    setPlanId(plan.id);
    setPlanCode(plan.code);
    setPlanName(plan.name);
    setPlanPrice(String(plan.price_minor / 100));
    setPlanTrialDays(String(plan.trial_days));
    setPlanInterval(plan.billing_interval);
    setPlanStatus(plan.status);
    setPlanMaxMembers(
      plan.feature_limits.max_members === undefined
        ? ""
        : String(plan.feature_limits.max_members),
    );
    setModal("Edit plan");
  }

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    if (!ticketOrg) {
      setError("Choose a gym for this support ticket.");
      return;
    }
    await runAction(
      () =>
        admin.upsertTicket({
          orgId: ticketOrg,
          subject: ticketSubject,
          body: ticketBody,
          status: "open",
        }),
      "Support ticket created",
    );
    setTicketSubject("");
    setTicketBody("");
    setModal("");
  }

  function assignPlan(event: FormEvent) {
    event.preventDefault();
    if (!drawer || drawer.kind !== "org") return;
    const trialDays = orgTrialDays.trim() === "" ? null : Number(orgTrialDays);
    if (!orgPlan) {
      setError("Choose a plan to assign.");
      return;
    }
    if (trialDays !== null && (!Number.isInteger(trialDays) || trialDays < 0)) {
      setError("Trial days must be a whole number of zero or more.");
      return;
    }
    void runAction(
      () => admin.assignSubscription(drawer.details.id, orgPlan, trialDays),
      "Subscription assigned",
    );
  }

  if (authLoading || roleLoading) {
    return (
      <div className="app">
        <div className="main-shell">
          <div className="empty">Checking administrator access…</div>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin || role !== "super_admin") return <Navigate to="/" replace />;

  const statusCount = (status: OrgStatus) => metrics?.orgs_by_status[status] ?? 0;
  const heading = active.title;

  return (
    <div className="app">
      <nav className="floating-rail compact-module-rail admin-rail" aria-label="Platform navigation">
        {sections.map((item) => (
          <button
            key={item.key}
            aria-label={item.key}
            aria-current={section === item.key ? "page" : undefined}
            className={section === item.key ? "rail-active" : ""}
            onClick={() => {
              setSection(item.key);
              setQuery("");
              setPage(0);
              setDrawer(null);
            }}
          >
            <Icon name={item.icon} size={19} />
            <span className="rail-label" aria-hidden="true">{item.title}</span>
          </button>
        ))}
      </nav>

      <button
        className="glass-brand"
        onClick={() => setSection("Overview")}
        aria-label="TwoPlus platform home"
      >
        <Icon name="activity" size={22} />
        <span>TwoPlus</span>
      </button>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="shield" size={15} />
            <span>Platform</span>
            <span className="slash">/</span>
            <strong>{section}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-label">SUPER ADMIN</span>
            <button className="platform-admin-link" onClick={() => navigate("/")}>
              Gym workspace
            </button>
            <span className="header-divider" />
            <button
              aria-label="Sign out"
              title={`${session.user.email} · sign out`}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
              onClick={() => void signOut()}
            >
              <Avatar name={session.user.email ?? "Admin"} small />
            </button>
          </div>
        </header>

        <main ref={mainRef}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                PLATFORM CONTROL <span>/</span> {section.toUpperCase()}
              </div>
              <h1>{heading}</h1>
              <p>{active.intro}</p>
            </div>
            <div className="heading-actions">
              {section === "Gyms" && (
                <Button onClick={() => setModal("Provision gym")}>
                  <Icon name="plus" size={15} />
                  Add gym
                </Button>
              )}
              {section === "Plans" && (
                <Button
                  onClick={() => {
                    resetPlanForm();
                    setModal("Create plan");
                  }}
                >
                  <Icon name="plus" size={15} />
                  New plan
                </Button>
              )}
              {section === "Support" && (
                <Button onClick={() => setModal("Create ticket")}>
                  <Icon name="plus" size={15} />
                  New ticket
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="attention" role="alert">
              <span className="attention-icon">
                <Icon name="shield" size={16} />
              </span>
              <div>
                <strong>That action was refused</strong>
                <span>{error}</span>
              </div>
              <Button secondary onClick={() => setError("")}>
                Dismiss
              </Button>
            </div>
          )}

          {section === "Overview" && (
            <>
              <Stats
                items={[
                  [
                    "Gym workspaces",
                    metrics ? String(metrics.total_orgs) : "—",
                    metrics ? `${statusCount("active")} active` : "Loading",
                  ],
                  [
                    "Active members",
                    metrics ? String(metrics.active_members) : "—",
                    metrics ? `${metrics.total_members} registered` : "Loading",
                  ],
                  [
                    "Active subscriptions",
                    metrics ? String(metrics.active_subscriptions) : "—",
                    metrics ? `${metrics.trialing_subscriptions} trialing` : "Loading",
                  ],
                  [
                    "Monthly recurring revenue",
                    metrics ? formatMoney(metrics.mrr_minor) : "—",
                    "From paid subscriptions",
                  ],
                ]}
              />
              <Stats
                items={[
                  [
                    "Trial workspaces",
                    metrics ? String(statusCount("trial")) : "—",
                    metrics ? `${metrics.trials_ending_14d} ending in 14 days` : "Loading",
                  ],
                  [
                    "Suspended",
                    metrics ? String(statusCount("suspended")) : "—",
                    "Access blocked, data kept",
                  ],
                  [
                    "Cancelled",
                    metrics ? String(statusCount("cancelled")) : "—",
                    "Closed workspaces",
                  ],
                  [
                    "Verified revenue",
                    metrics ? formatMoney(metrics.verified_revenue_minor) : "—",
                    metrics ? `${metrics.new_orgs_7d} new gyms this week` : "Loading",
                  ],
                ]}
              />

              <div className="dashboard-grid">
                <Panel title="Recent gyms" sub="Latest workspaces on the platform">
                  {metrics?.recent_orgs.length ? (
                    <Lines
                      rows={metrics.recent_orgs.map((org) => [
                        org.name,
                        <span key={org.id}>
                          <Badge>{label(org.status)}</Badge>{" "}
                          {formatDate(org.created_at)}
                        </span>,
                      ])}
                    />
                  ) : (
                    <div className="empty">
                      {loadingData ? "Loading gyms…" : "No gym workspaces yet."}
                    </div>
                  )}
                </Panel>

                <Panel title="Needs attention" sub="Billing and support signals">
                  <Lines
                    rows={[
                      [
                        "Overdue invoices",
                        count(metrics?.overdue_invoices, "invoice"),
                      ],
                      [
                        "Failed payments",
                        `${count(metrics?.failed_payments_30d, "failure")} in 30 days`,
                      ],
                      ["Renewals due", `${count(metrics?.renewals_due_14d, "renewal")} within 14 days`],
                      ["Trials ending", `${count(metrics?.trials_ending_14d, "trial")} within 14 days`],
                      ["Open support", count(metrics?.support_open, "ticket")],
                    ]}
                  />
                </Panel>
              </div>

              <div className="dashboard-grid">
                <Panel
                  title="Recent platform activity"
                  sub="Recorded in the admin audit log"
                  action={
                    <Button secondary onClick={() => setSection("Audit")}>
                      Open log
                    </Button>
                  }
                >
                  {metrics?.recent_activity.length ? (
                    <Lines
                      rows={metrics.recent_activity.map((entry, index) => [
                        entry.action,
                        <span key={`${entry.created_at}-${index}`}>
                          {entry.actor_email || "System"} · {formatDate(entry.created_at)}
                        </span>,
                      ])}
                    />
                  ) : (
                    <div className="empty">
                      {loadingData
                        ? "Loading activity…"
                        : "No administrative changes recorded yet."}
                    </div>
                  )}
                </Panel>

                <Panel title="System health" sub="Reported directly by the database">
                  {metrics ? (
                    <Lines
                      rows={[
                        ["Database", "Reachable"],
                        ["Server time", formatDate(metrics.health.server_time)],
                        ["Error monitoring", `${metrics.health.error_monitoring}`],
                      ]}
                    />
                  ) : (
                    <div className="empty">
                      {loadingData ? "Loading health…" : "Health data unavailable."}
                    </div>
                  )}
                  <p className="muted" style={{ marginTop: 14, lineHeight: 1.7 }}>
                    No error-tracking service is connected, so backend errors are
                    not aggregated here. Payments are recorded manually after
                    verification outside TwoPlus.
                  </p>
                </Panel>
              </div>
            </>
          )}

          {section === "Gyms" && (
            <section className="directory">
              <div className="tabs">
                {[
                  ["All gyms", null],
                  ["Active", "active"],
                  ["Trial", "trial"],
                  ["Suspended", "suspended"],
                  ["Cancelled", "cancelled"],
                ].map(([text, value]) => (
                  <button
                    key={String(text)}
                    className={orgStatus === value ? "selected" : ""}
                    onClick={() => {
                      setOrgStatus(value as OrgStatus | null);
                      setPage(0);
                    }}
                  >
                    {text}
                    <span>
                      {value === null
                        ? (metrics?.total_orgs ?? 0)
                        : statusCount(value as OrgStatus)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="table-toolbar">
                <div className="search-field">
                  <Icon name="search" size={16} />
                  <Input
                    aria-label="Search gyms"
                    placeholder="Search by gym name or owner email..."
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                  />
                  <kbd>⌘ K</kbd>
                </div>
                <span className="muted">
                  {orgTotal} {orgTotal === 1 ? "workspace" : "workspaces"}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Gym</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Members</th>
                      <th>Branches</th>
                      <th>Plan</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org.id}>
                        <td>
                          <button className="member-cell" onClick={() => void openOrg(org.id)}>
                            <Avatar name={org.name} />
                            <span>
                              <strong>{org.name}</strong>
                              <small>{org.phone || "No phone added"}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          {org.owner_email || org.owner_name || "—"}
                          <small className="cell-detail">
                            {formatDate(org.created_at)}
                          </small>
                        </td>
                        <td>
                          <Badge>{label(org.status)}</Badge>
                        </td>
                        <td>{org.member_count}</td>
                        <td>{org.branch_count}</td>
                        <td>
                          <span className="plan-label">
                            {org.plan_name || "Unassigned"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="row-more"
                            aria-label={`Open ${org.name}`}
                            onClick={() => void openOrg(org.id)}
                          >
                            ···
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orgs.length && (
                  <div className="empty">
                    {loadingData ? "Loading gyms…" : "No gyms match this search."}
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  Showing{" "}
                  <strong>
                    {orgTotal ? page * PAGE_SIZE + 1 : 0}–
                    {Math.min((page + 1) * PAGE_SIZE, orgTotal)}
                  </strong>{" "}
                  of <strong>{orgTotal}</strong> workspaces
                </span>
                <div>
                  <span>{PAGE_SIZE} per page</span>
                  <Button
                    secondary
                    disabled={page === 0}
                    aria-label="Previous page"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    ‹
                  </Button>
                  <Button secondary className="current-page" disabled>
                    {page + 1}
                  </Button>
                  <Button
                    secondary
                    disabled={(page + 1) * PAGE_SIZE >= orgTotal}
                    aria-label="Next page"
                    onClick={() => setPage((value) => value + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </section>
          )}

          {section === "Billing" && (
            <section className="directory">
              <div className="tabs">
                {[
                  ["All subscriptions", null],
                  ["Active", "active"],
                  ["Trialing", "trialing"],
                  ["Past due", "past_due"],
                  ["Cancelled", "cancelled"],
                ].map(([text, value]) => (
                  <button
                    key={String(text)}
                    className={subStatus === value ? "selected" : ""}
                    onClick={() => {
                      setSubStatus(value as SubStatus | null);
                      setPage(0);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <div className="table-toolbar">
                <div className="search-field">
                  <Icon name="search" size={16} />
                  <Input
                    aria-label="Search subscriptions"
                    placeholder="Search gyms or owner email..."
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <span className="muted">
                  Invoices are generated per billing period and only marked paid
                  after verification.
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Gym</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Period end</th>
                      <th>Open invoice</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <button
                            className="member-cell"
                            onClick={() => openSubscription(sub)}
                          >
                            <Avatar name={sub.org_name} />
                            <span>
                              <strong>{sub.org_name}</strong>
                              <small>{sub.owner_email || "No owner email"}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          {sub.plan_name}
                          <small className="cell-detail">
                            {formatMoney(sub.price_minor)} / {sub.billing_interval}
                          </small>
                        </td>
                        <td>
                          <Badge>{label(sub.status)}</Badge>
                        </td>
                        <td>
                          {sub.current_period_end
                            ? formatDate(sub.current_period_end)
                            : "—"}
                        </td>
                        <td className={sub.open_invoice ? "due-amount" : "muted"}>
                          {sub.open_invoice
                            ? `${formatMoney(sub.open_invoice.amount_minor)} due ${formatDate(sub.open_invoice.due_at)}`
                            : "None open"}
                        </td>
                        <td>
                          <button
                            className="row-more"
                            aria-label={`Open billing for ${sub.org_name}`}
                            onClick={() => openSubscription(sub)}
                          >
                            ···
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!subscriptions.length && (
                  <div className="empty">
                    {loadingData
                      ? "Loading subscriptions…"
                      : "No subscriptions yet. Assign a plan from a gym workspace."}
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  Showing{" "}
                  <strong>
                    {subTotal ? page * PAGE_SIZE + 1 : 0}–
                    {Math.min((page + 1) * PAGE_SIZE, subTotal)}
                  </strong>{" "}
                  of <strong>{subTotal}</strong> subscriptions
                </span>
                <div>
                  <span>{PAGE_SIZE} per page</span>
                  <Button
                    secondary
                    disabled={page === 0}
                    aria-label="Previous page"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    ‹
                  </Button>
                  <Button secondary className="current-page" disabled>
                    {page + 1}
                  </Button>
                  <Button
                    secondary
                    disabled={(page + 1) * PAGE_SIZE >= subTotal}
                    aria-label="Next page"
                    onClick={() => setPage((value) => value + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </section>
          )}

          {section === "Plans" && (
            <section className="directory">
              <div className="table-toolbar">
                <span className="muted">
                  Prices are stored in minor units of the plan currency.
                </span>
                <span className="muted">
                  {plans.length} {plans.length === 1 ? "plan" : "plans"}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Price</th>
                      <th>Interval</th>
                      <th>Trial</th>
                      <th>Member limit</th>
                      <th>Subscribers</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id}>
                        <td>
                          <span className="plan-label">
                            <strong>{plan.name}</strong>
                          </span>
                          <small className="cell-detail">{plan.code}</small>
                        </td>
                        <td>{formatMoney(plan.price_minor, plan.currency)}</td>
                        <td>{label(plan.billing_interval)}</td>
                        <td>{plan.trial_days} days</td>
                        <td>
                          {plan.feature_limits.max_members === undefined
                            ? "Unlimited"
                            : String(plan.feature_limits.max_members)}
                        </td>
                        <td>{plan.subscriber_count}</td>
                        <td>
                          <Badge>{label(plan.status)}</Badge>
                        </td>
                        <td>
                          <Button
                            secondary
                            disabled={busy}
                            onClick={() => editPlan(plan)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!plans.length && (
                  <div className="empty">
                    {loadingData
                      ? "Loading plans…"
                      : "No plans configured. Create one to start billing gyms."}
                  </div>
                )}
              </div>
            </section>
          )}

          {section === "Support" && (
            <section className="directory">
              <div className="tabs">
                {[
                  ["All tickets", null],
                  ["Open", "open"],
                  ["In progress", "in_progress"],
                  ["Resolved", "resolved"],
                ].map(([text, value]) => (
                  <button
                    key={String(text)}
                    className={ticketFilter === value ? "selected" : ""}
                    onClick={() => {
                      setTicketFilter(value as TicketStatus | null);
                      setPage(0);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <div className="table-toolbar">
                <div className="search-field">
                  <Icon name="search" size={16} />
                  <Input
                    aria-label="Search tickets"
                    placeholder="Search tickets or gyms..."
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <span className="muted">
                  {ticketTotal} {ticketTotal === 1 ? "ticket" : "tickets"}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Gym</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <button
                            className="table-name"
                            onClick={() => openTicket(ticket)}
                          >
                            {ticket.subject}
                          </button>
                          <small className="cell-detail">
                            {ticket.body || "No details"}
                          </small>
                        </td>
                        <td>{ticket.org_name}</td>
                        <td>
                          <Badge>{label(ticket.status)}</Badge>
                        </td>
                        <td>{formatDate(ticket.updated_at)}</td>
                        <td>
                          <button
                            className="row-more"
                            aria-label={`Open ticket ${ticket.subject}`}
                            onClick={() => openTicket(ticket)}
                          >
                            ···
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tickets.length && (
                  <div className="empty">
                    {loadingData ? "Loading tickets…" : "No tickets match this filter."}
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  Showing <strong>{tickets.length}</strong> of{" "}
                  <strong>{ticketTotal}</strong> tickets
                </span>
                <div>
                  <span>{PAGE_SIZE} per page</span>
                  <Button
                    secondary
                    disabled={page === 0}
                    aria-label="Previous page"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    ‹
                  </Button>
                  <Button secondary className="current-page" disabled>
                    {page + 1}
                  </Button>
                  <Button
                    secondary
                    disabled={(page + 1) * PAGE_SIZE >= ticketTotal}
                    aria-label="Next page"
                    onClick={() => setPage((value) => value + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </section>
          )}

          {section === "Audit" && (
            <section className="directory">
              <div className="table-toolbar">
                <div className="search-field">
                  <Icon name="search" size={16} />
                  <Input
                    aria-label="Search audit log"
                    placeholder="Search actions, targets, or administrators..."
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <span className="muted">
                  {auditTotal} {auditTotal === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Administrator</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.action}</strong>
                        </td>
                        <td>
                          {row.target_type}
                          <small className="cell-detail">{row.target_id || "—"}</small>
                        </td>
                        <td>{row.actor_email || "System"}</td>
                        <td>{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!auditRows.length && (
                  <div className="empty">
                    {loadingData
                      ? "Loading audit history…"
                      : "No administrative changes recorded yet."}
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  Server-side authorisation checks every action; sensitive changes
                  are recorded here.
                </span>
                <div>
                  <span>{PAGE_SIZE} per page</span>
                  <Button
                    secondary
                    disabled={page === 0}
                    aria-label="Previous page"
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    ‹
                  </Button>
                  <Button secondary className="current-page" disabled>
                    {page + 1}
                  </Button>
                  <Button
                    secondary
                    disabled={(page + 1) * PAGE_SIZE >= auditTotal}
                    aria-label="Next page"
                    onClick={() => setPage((value) => value + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </section>
          )}

          <footer className="page-footer">
            <span>TwoPlus · Platform control</span>
            <button onClick={() => setSection("Support")}>Need a hand?</button>
          </footer>
        </main>
      </div>

      {drawer?.kind === "org" && (
        <div className="modal-overlay" onMouseDown={() => setDrawer(null)}>
          <section
            className="profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${drawer.details.name} details`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-top">
              <span>ORGANIZATION</span>
              <Button secondary aria-label="Close organization details" onClick={() => setDrawer(null)}>
                <Icon name="close" size={17} />
              </Button>
            </div>
            <div className="profile-hero">
              <Avatar name={drawer.details.name} />
              <h2>{drawer.details.name}</h2>
              <p>{drawer.details.owner_email || "No owner email"}</p>
              <Badge>{label(drawer.details.status)}</Badge>
            </div>
            <div className="profile-details">
              <Title>Workspace</Title>
              <Lines
                rows={[
                  ["Owner", drawer.details.owner_name || "—"],
                  ["Phone", drawer.details.phone || "—"],
                  ["Address", drawer.details.address || "—"],
                  ["Timezone", drawer.details.timezone],
                  ["Created", formatDate(drawer.details.created_at)],
                ]}
              />

              <Title>Usage</Title>
              <Lines
                rows={[
                  [
                    "Members",
                    drawer.details.subscription?.feature_limits.max_members === undefined
                      ? String(drawer.details.member_count)
                      : `${drawer.details.member_count} of ${String(drawer.details.subscription.feature_limits.max_members)}`,
                  ],
                  ["Active members", String(drawer.details.active_member_count)],
                  ["Branches", String(drawer.details.branch_count)],
                  ["Staff", String(drawer.details.staff_count)],
                  [
                    "Gym revenue",
                    formatMoney(drawer.details.gym_revenue_minor, drawer.details.currency),
                  ],
                  ["Recorded gym payments", String(drawer.details.gym_payment_count)],
                ]}
              />

              <Title>Platform subscription</Title>
              {drawer.details.subscription ? (
                <Lines
                  rows={[
                    ["Plan", drawer.details.subscription.plan_name],
                    ["Status", <Badge key="s">{label(drawer.details.subscription.status)}</Badge>],
                    [
                      "Price",
                      `${formatMoney(
                        drawer.details.subscription.price_minor,
                        drawer.details.subscription.currency,
                      )} / ${drawer.details.subscription.billing_interval}`,
                    ],
                    [
                      "Trial ends",
                      drawer.details.subscription.trial_ends_at
                        ? formatDate(drawer.details.subscription.trial_ends_at)
                        : "—",
                    ],
                    [
                      "Period end",
                      drawer.details.subscription.current_period_end
                        ? formatDate(drawer.details.subscription.current_period_end)
                        : "—",
                    ],
                  ]}
                />
              ) : (
                <p className="muted">No platform plan assigned yet.</p>
              )}

              {!!drawer.details.invoices.length && (
                <>
                  <Title>Invoices</Title>
                  <Lines
                    rows={drawer.details.invoices.slice(0, 5).map((invoice) => [
                      `${formatMoney(invoice.amount_minor)} · due ${formatDate(invoice.due_at)}`,
                      <Badge key={invoice.id}>{label(invoice.status)}</Badge>,
                    ])}
                  />
                </>
              )}

              {!!drawer.details.branches.length && (
                <>
                  <Title>Branches</Title>
                  <Lines
                    rows={drawer.details.branches.map((branch) => [
                      branch.name,
                      branch.is_primary ? "Primary" : branch.is_archived ? "Archived" : "Active",
                    ])}
                  />
                </>
              )}

              {!!drawer.details.tickets.length && (
                <>
                  <Title>Support history</Title>
                  <Lines
                    rows={drawer.details.tickets.map((ticket) => [
                      ticket.subject,
                      <Badge key={ticket.id}>{label(ticket.status)}</Badge>,
                    ])}
                  />
                </>
              )}

              <Title>Assign a plan</Title>
              <form className="form-row" onSubmit={assignPlan}>
                <label>
                  Plan
                  <Select value={orgPlan} onChange={(event) => setOrgPlan(event.target.value)}>
                    <option value="">Choose a plan</option>
                    {drawer.plans
                      .filter((plan) => plan.status === "active")
                      .map((plan) => (
                        <option key={plan.id} value={plan.code}>
                          {plan.name} · {formatMoney(plan.price_minor, plan.currency)} /{" "}
                          {plan.billing_interval}
                        </option>
                      ))}
                  </Select>
                </label>
                <label>
                  Trial days
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Plan default"
                    value={orgTrialDays}
                    onChange={(event) => setOrgTrialDays(event.target.value)}
                  />
                </label>
                <Button type="submit" disabled={busy} className="form-submit">
                  Assign subscription
                </Button>
              </form>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                Trial days of 0 opens an invoice immediately. A blank value uses the
                plan default.
              </p>

              <div className="profile-actions">
                {drawer.details.status === "suspended" ? (
                  <Button
                    onClick={() =>
                      ask(
                        "Reactivate workspace",
                        `${drawer.details.name} will regain full write access immediately.`,
                        "Reactivated",
                        () => admin.setOrganizationStatus(drawer.details.id, "active", "Reactivated in platform control center"),
                      )
                    }
                  >
                    Reactivate
                  </Button>
                ) : (
                  <Button
                    secondary
                    onClick={() =>
                      ask(
                        "Suspend workspace",
                        `${drawer.details.name} becomes read-only. No data is deleted and every record stays visible to the gym.`,
                        "Suspended",
                        () => admin.setOrganizationStatus(drawer.details.id, "suspended", "Suspended in platform control center"),
                      )
                    }
                  >
                    Suspend access
                  </Button>
                )}
                <Button
                  secondary
                  onClick={() => {
                    setSection("Billing");
                    setDrawer(null);
                  }}
                >
                  Manage billing
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {drawer?.kind === "subscription" && (
        <div className="modal-overlay" onMouseDown={() => setDrawer(null)}>
          <section
            className="profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Billing for ${drawer.row.org_name}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-top">
              <span>PLATFORM BILLING</span>
              <Button secondary aria-label="Close billing details" onClick={() => setDrawer(null)}>
                <Icon name="close" size={17} />
              </Button>
            </div>
            <div className="profile-hero">
              <Avatar name={drawer.row.org_name} />
              <h2>{drawer.row.org_name}</h2>
              <p>{drawer.row.owner_email || "No owner email"}</p>
              <Badge>{label(drawer.row.status)}</Badge>
            </div>
            <div className="profile-details">
              <Title>Subscription</Title>
              <Lines
                rows={[
                  ["Plan", drawer.row.plan_name],
                  [
                    "Price",
                    `${formatMoney(drawer.row.price_minor)} / ${drawer.row.billing_interval}`,
                  ],
                  ["Workspace status", <Badge key="w">{label(drawer.row.org_status)}</Badge>],
                  ["Started", formatDate(drawer.row.started_at)],
                  [
                    "Trial ends",
                    drawer.row.trial_ends_at ? formatDate(drawer.row.trial_ends_at) : "—",
                  ],
                  [
                    "Period end",
                    drawer.row.current_period_end
                      ? formatDate(drawer.row.current_period_end)
                      : "—",
                  ],
                ]}
              />

              <Title>Open invoice</Title>
              {drawer.row.open_invoice ? (
                <>
                  <Lines
                    rows={[
                      ["Amount", formatMoney(drawer.row.open_invoice.amount_minor)],
                      ["Due", formatDate(drawer.row.open_invoice.due_at)],
                    ]}
                  />
                  <label style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 11, color: "#6c7c5c" }}>
                    Payment reference
                    <Input
                      placeholder="UPI / bank reference"
                      value={paymentRef}
                      onChange={(event) => setPaymentRef(event.target.value)}
                    />
                  </label>
                  <Button
                    className="form-submit"
                    disabled={busy}
                    onClick={() =>
                      ask(
                        "Record a verified payment",
                        "Only continue if this invoice has actually been paid and the payment verified outside TwoPlus. This activates the subscription and counts towards revenue.",
                        "Payment recorded",
                        () =>
                          admin.recordSubscriptionPayment(
                            drawer.row.open_invoice!.id,
                            paymentRef || undefined,
                          ),
                      )
                    }
                  >
                    Mark invoice paid
                  </Button>
                </>
              ) : (
                <p className="muted">No open invoice.</p>
              )}

              <Title>Last payment</Title>
              {drawer.row.last_payment ? (
                <Lines
                  rows={[
                    ["Amount", formatMoney(drawer.row.last_payment.amount_minor)],
                    ["Provider", drawer.row.last_payment.provider],
                    [
                      "Verified",
                      drawer.row.last_payment.verified_at
                        ? formatDate(drawer.row.last_payment.verified_at)
                        : "—",
                    ],
                  ]}
                />
              ) : (
                <p className="muted">No verified payment recorded.</p>
              )}

              <div className="profile-actions">
                <Button
                  secondary
                  disabled={busy || drawer.row.status === "cancelled"}
                  onClick={() =>
                    ask(
                      "Generate a renewal invoice",
                      `This opens an invoice for ${drawer.row.org_name} for the next ${drawer.row.billing_interval} period.`,
                      "Invoice generated",
                      () => admin.generateInvoice(drawer.row.id),
                    )
                  }
                >
                  Generate invoice
                </Button>
                <Button
                  secondary
                  disabled={busy || drawer.row.status === "cancelled"}
                  onClick={() =>
                    ask(
                      "Cancel subscription",
                      `The subscription for ${drawer.row.org_name} will be cancelled and any open invoice voided. Historical invoices and payments are kept.`,
                      "Subscription cancelled",
                      () =>
                        admin.cancelSubscription(
                          drawer.row.id,
                          "Cancelled in platform control center",
                        ),
                    )
                  }
                >
                  Cancel subscription
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {drawer?.kind === "ticket" && (
        <div className="modal-overlay" onMouseDown={() => setDrawer(null)}>
          <section
            className="profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Ticket ${drawer.row.subject}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-top">
              <span>SUPPORT TICKET</span>
              <Button secondary aria-label="Close ticket" onClick={() => setDrawer(null)}>
                <Icon name="close" size={17} />
              </Button>
            </div>
            <div className="profile-hero">
              <Avatar name={drawer.row.org_name} />
              <h2>{drawer.row.subject}</h2>
              <p>{drawer.row.org_name}</p>
              <Badge>{label(drawer.row.status)}</Badge>
            </div>
            <div className="profile-details">
              <Title>Details</Title>
              <Lines
                rows={[
                  ["Raised", formatDate(drawer.row.created_at)],
                  ["Updated", formatDate(drawer.row.updated_at)],
                  ["Reported by", drawer.row.org_name],
                ]}
              />
              <p style={{ marginTop: 16, lineHeight: 1.8 }}>
                {drawer.row.body || "No details were provided."}
              </p>
              <label style={{ display: "grid", gap: 8, marginTop: 20, fontSize: 11, color: "#6c7c5c" }}>
                Status
                <Select
                  value={ticketDraft.status}
                  onChange={(event) =>
                    setTicketDraft((draft) => ({
                      ...draft,
                      status: event.target.value as TicketStatus,
                    }))
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </Select>
              </label>
              <div className="profile-actions">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void runAction(
                      () =>
                        admin.upsertTicket({
                          id: drawer.row.id,
                          subject: drawer.row.subject,
                          body: drawer.row.body || "",
                          status: ticketDraft.status,
                        }),
                      "Ticket updated",
                    )
                  }
                >
                  Save ticket
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {modal && (
        <div className="modal-overlay modal-front" onMouseDown={() => setModal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <Title>{modal}</Title>
                <p>
                  {modal === "Provision gym"
                    ? "The owner must already have a TwoPlus account."
                    : modal === "Create plan" || modal === "Edit plan"
                      ? "Applied to new assignments and invoices."
                      : "Visible to the platform team only."}
                </p>
              </div>
              <Button secondary aria-label="Close dialog" onClick={() => setModal("")}>
                <Icon name="close" size={16} />
              </Button>
            </div>

            {modal === "Provision gym" && (
              <form className="modal-body" onSubmit={provisionGym}>
                <label>
                  Gym name
                  <Input
                    required
                    minLength={2}
                    value={gymName}
                    onChange={(event) => setGymName(event.target.value)}
                  />
                </label>
                <label>
                  Owner email
                  <Input
                    required
                    type="email"
                    value={ownerEmail}
                    onChange={(event) => setOwnerEmail(event.target.value)}
                  />
                </label>
                <div className="integration-note">
                  <Icon name="shield" size={15} />
                  The owner account must exist and be confirmed. No invitation email
                  is sent — TwoPlus has no mail service connected.
                </div>
                <Button type="submit" disabled={busy}>Create workspace</Button>
              </form>
            )}

            {(modal === "Create plan" || modal === "Edit plan") && (
              <form className="modal-body" onSubmit={savePlan}>
                <label>
                  Plan name
                  <Input
                    required
                    minLength={2}
                    value={planName}
                    onChange={(event) => {
                      setPlanName(event.target.value);
                      if (!planId && !planCode.replace(/[^a-z0-9-]/g, "")) {
                        setPlanCode(
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, ""),
                        );
                      }
                    }}
                  />
                </label>
                <label>
                  Plan code
                  <Input
                    required
                    pattern="[a-z0-9\-]+"
                    title="Lowercase letters, numbers, and hyphens"
                    value={planCode}
                    onChange={(event) => setPlanCode(event.target.value)}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Price (₹)
                    <Input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={planPrice}
                      onChange={(event) => setPlanPrice(event.target.value)}
                    />
                  </label>
                  <label>
                    Billing interval
                    <Select
                      value={planInterval}
                      onChange={(event) =>
                        setPlanInterval(event.target.value as BillingInterval)
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </Select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Trial days
                    <Input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={planTrialDays}
                      onChange={(event) => setPlanTrialDays(event.target.value)}
                    />
                  </label>
                  <label>
                    Member limit
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Unlimited"
                      value={planMaxMembers}
                      onChange={(event) => setPlanMaxMembers(event.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Status
                  <Select
                    value={planStatus}
                    onChange={(event) =>
                      setPlanStatus(event.target.value as "active" | "retired")
                    }
                  >
                    <option value="active">Active</option>
                    <option value="retired">Retired</option>
                  </Select>
                </label>
                <Button type="submit" disabled={busy}>
                  {planId ? "Save plan" : "Create plan"}
                </Button>
              </form>
            )}

            {modal === "Create ticket" && (
              <form className="modal-body" onSubmit={createTicket}>
                <label>
                  Gym
                  <Select
                    required
                    value={ticketOrg}
                    onChange={(event) => setTicketOrg(event.target.value)}
                  >
                    <option value="">Choose a gym</option>
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  Subject
                  <Input
                    required
                    minLength={3}
                    value={ticketSubject}
                    onChange={(event) => setTicketSubject(event.target.value)}
                  />
                </label>
                <label>
                  Details
                  <textarea
                    value={ticketBody}
                    onChange={(event) => setTicketBody(event.target.value)}
                    rows={4}
                  />
                </label>
                <Button type="submit" disabled={busy}>Create ticket</Button>
              </form>
            )}
          </section>
        </div>
      )}

      {confirmation && (
        <div
          className="modal-overlay modal-front"
          onMouseDown={() => setConfirmation(null)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={confirmation.title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <Title>{confirmation.title}</Title>
                <p>This is recorded in the platform audit log.</p>
              </div>
              <Button
                secondary
                aria-label="Cancel"
                onClick={() => setConfirmation(null)}
              >
                <Icon name="close" size={16} />
              </Button>
            </div>
            <div className="modal-body">
              <p>{confirmation.message}</p>
              <div className="profile-actions">
                <Button disabled={busy} onClick={() => void confirmAction()}>
                  {confirmation.cta === "Suspended" ? "Suspend workspace" : confirmation.cta === "Reactivated" ? "Reactivate workspace" : confirmation.cta === "Payment recorded" ? "Record payment" : confirmation.cta === "Subscription cancelled" ? "Cancel subscription" : confirmation.cta === "Invoice generated" ? "Generate invoice" : "Confirm"}
                </Button>
                <Button secondary onClick={() => setConfirmation(null)}>
                  Keep as is
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
