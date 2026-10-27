import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Icon, type IconName } from "./icons"
import AnimatedButton from "@/components/ui/animated-button"
import AsciiGlitchRipple from "@/components/ui/ascii-glitch-ripple"
import MorphText from "@/components/ui/morph-text"
import { RadialGlowButton } from "@/components/ui/radial-glow-button"
import { Avatar, Badge, Button, Input, Select, Stats, Title } from "@/components/kit"
import { useAuth } from "@/lib/auth"
import { useOrg } from "@/lib/org"
import { usePlatformAdmin } from "@/lib/use-platform-admin"
import * as api from "@/lib/api"
import {
  ageFromDob,
  daysUntil,
  formatDate,
  formatMoney,
  type DashboardStats,
  type MembershipPlan,
  type PaymentMethod,
} from "@/lib/types"

const groups = [
  [
    "Workspace",
    "Overview",
    "Members",
    "Memberships",
    "Attendance",
    "Classes & PT",
    "Community",
  ],
  [
    "Growth & engagement",
    "Enquiries",
    "Follow-ups",
    "Reminders",
    "Offers & referrals",
    "Feedback",
  ],
  [
    "Team & operations",
    "Trainers & staff",
    "Payroll",
    "Workouts",
    "Diet & nutrition",
    "Equipment",
    "Inventory",
  ],
  [
    "Finance & business",
    "Payments",
    "Expenses",
    "Reports",
    "Marketplace",
    "Branches",
    "Access & roles",
  ],
]
const navigationIcons = {
  Overview: "dashboard",
  Members: "members",
  Memberships: "ticket",
  Attendance: "checkin",
  "Classes & PT": "calendar",
  Community: "message",
  Enquiries: "userPlus",
  "Follow-ups": "clipboard",
  Reminders: "bell",
  "Offers & referrals": "gift",
  Feedback: "sparkles",
  "Trainers & staff": "dumbbell",
  Payroll: "wallet",
  Workouts: "activity",
  "Diet & nutrition": "apple",
  Equipment: "dumbbell",
  Inventory: "package",
  Payments: "wallet",
  Expenses: "receipt",
  Reports: "chart",
  Marketplace: "shop",
  Branches: "building",
  "Access & roles": "shield",
  "Member app": "mobile",
  "Customer support": "headset",
} as const satisfies Record<string, IconName>

const descriptions: Record<string, string> = {
  Members: "A little more personal. Manage every member, all in one place.",
  Overview: "Your gym at a glance. Here’s what’s happening today.",
  Community: "Keep your members connected, in and out of the gym.",
  Memberships: "Flexible plans that grow with your members.",
  Payments: "Every payment, receipt, and outstanding balance in one place.",
  "Trainers & staff": "The people who keep your gym moving.",
  Payroll: "Stay on top of salaries, commissions, and incentives.",
  Marketplace: "Equip your next chapter. Sourced for gym owners.",
}
type Member = {
  name: string
  email: string
  phone: string
  age: number
  plan: string
  status: string
  joined: string
  expires: string
  due: string
  trainer: string
  memberId?: string
  membershipId?: string
}

type Module = {
  sub: string
  action: string
  columns: string[]
  rows: string[][]
  stats: string[][]
}
const modules: Record<string, Module> = {
  Attendance: {
    sub: "Member check-ins and floor activity",
    action: "Check in member",
    columns: ["Member", "Check-in", "Check-out", "Method", "Status"],
    rows: [],
    stats: [],
  },
  "Classes & PT": {
    sub: "Your schedule, without the scheduling headache",
    action: "Schedule class",
    columns: ["Class / session", "Trainer", "Schedule", "Bookings", "Format"],
    rows: [],
    stats: [],
  },
  Enquiries: {
    sub: "Turn a first hello into a lasting membership",
    action: "Add enquiry",
    columns: ["Lead", "Contact", "Interested in", "Source", "Status"],
    rows: [],
    stats: [],
  },
  "Follow-ups": {
    sub: "The right conversation, at the right time",
    action: "Create follow-up",
    columns: ["Member / lead", "Reason", "Assigned to", "Due", "Status"],
    rows: [],
    stats: [],
  },
  Payments: {
    sub: "Track collections, outstanding dues, and receipts",
    action: "Record payment",
    columns: ["Member", "Description", "Date", "Amount", "Status"],
    rows: [],
    stats: [],
  },
  "Trainers & staff": {
    sub: "Schedules, responsibilities, and the people behind them",
    action: "Add employee",
    columns: [
      "Employee",
      "Role",
      "Working hours",
      "Joined",
      "Assigned members",
    ],
    rows: [],
    stats: [],
  },
  Payroll: {
    sub: "Review your team’s earnings before payday",
    action: "Create payroll entry",
    columns: ["Employee", "Base salary", "Commission", "Net pay", "Status"],
    rows: [],
    stats: [],
  },
  Expenses: {
    sub: "Know where every rupee goes",
    action: "Add expense",
    columns: ["Expense", "Category", "Date", "Amount", "Status"],
    rows: [],
    stats: [],
  },
  Workouts: {
    sub: "Build purposeful training, one member at a time",
    action: "Create workout",
    columns: ["Workout plan", "Goal", "Duration", "Assigned to", "Trainer"],
    rows: [],
    stats: [],
  },
  "Diet & nutrition": {
    sub: "Practical nutrition plans for real progress",
    action: "Create diet plan",
    columns: ["Plan", "Daily calories", "Protein", "Assigned to", "Preference"],
    rows: [],
    stats: [],
  },
  Equipment: {
    sub: "Keep your floor running safely and smoothly",
    action: "Add equipment",
    columns: [
      "Equipment",
      "Location",
      "Last serviced",
      "Next service",
      "Status",
    ],
    rows: [],
    stats: [],
  },
  Inventory: {
    sub: "Retail products, supplies, and stock levels",
    action: "Add product",
    columns: ["Product", "SKU", "Stock", "Selling price", "Status"],
    rows: [],
    stats: [],
  },
  Reminders: {
    sub: "Thoughtful nudges, fewer missed renewals",
    action: "Create reminder",
    columns: ["Reminder", "Audience", "Channel", "Schedule", "Status"],
    rows: [],
    stats: [],
  },
  "Offers & referrals": {
    sub: "Give your members another reason to stay",
    action: "Create offer",
    columns: ["Offer", "Code", "Benefit", "Valid until", "Status"],
    rows: [],
    stats: [],
  },
  Feedback: {
    sub: "Listen, respond, and make your gym better",
    action: "Add feedback",
    columns: ["Member", "Feedback", "Category", "Received", "Status"],
    rows: [],
    stats: [],
  },
  Branches: {
    sub: "One business. Every location in view.",
    action: "Add branch",
    columns: [
      "Branch",
      "Manager",
      "Active members",
      "Monthly revenue",
      "Status",
    ],
    rows: [],
    stats: [],
  },
  "Access & roles": {
    sub: "The right access for every role",
    action: "Add role",
    columns: ["Role", "People", "Permissions", "Scope", "Status"],
    rows: [],
    stats: [],
  },
  "Customer support": {
    sub: "A helping hand, whenever you need it",
    action: "Create ticket",
    columns: ["Ticket", "Subject", "Category", "Updated", "Status"],
    rows: [],
    stats: [],
  },
}

// Modules whose tables exist in the database. Everything else is UI-only
// until a migration adds storage for it.
const dbModules = [
  "Attendance",
  "Classes & PT",
  "Enquiries",
  "Payments",
  "Trainers & staff",
  "Expenses",
] as const
const hasDbStorage = (name: string) =>
  (dbModules as readonly string[]).includes(name)

export default function App() {
  const mainRef = useRef<HTMLElement>(null)
  const { signOut } = useAuth()
  const { org } = useOrg()
  const { role: platformRole } = usePlatformAdmin()
  const [active, setActive] = useState("Overview")
  const [members, setMembers] = useState<Member[]>([])
  const [tab, setTab] = useState("All members")
  const [query, setQuery] = useState("")
  const [plan, setPlan] = useState("All plans")
  const [selected, setSelected] = useState<string[]>([])
  const [profile, setProfile] = useState<Member | null>(null)
  const [modal, setModal] = useState("")
  const [modalError, setModalError] = useState("")
  const [modalBusy, setModalBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [moduleTick, setModuleTick] = useState(0)
  const [openCheckins, setOpenCheckins] = useState<{ id: string; name: string }[]>([])
  const [convertible, setConvertible] = useState<{ id: string; name: string; phone: string }[]>([])
  const [notice, setNotice] = useState("")
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [staffNames, setStaffNames] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dbError, setDbError] = useState("")
  const branch = org?.branch?.name ?? "Main branch"
  const [records, setRecords] = useState<Record<string, string[][]>>({})
  const [cart, setCart] = useState<string[]>([])
  const notify = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(""), 4000)
  }
  useEffect(() => {
    setModalError("")
  }, [modal])
  const go = (name: string) => {
    setActive(name)
    setQuery("")
    setSelected([])
    setPage(1)
    // Re-run the module loader so tables show fresh rows after same-page writes
    setModuleTick((t) => t + 1)
  }

  // ---- Real data loading (org-scoped; RLS enforces the same scope) ----
  const reload = async () => {
    if (!org) return
    const orgId = org.organization.id
    try {
      setDbError("")
      const [dbMembers, dbMemberships, dbPlans, pending, dbStats, staff] =
        await Promise.all([
          // shortcut: loads up to 500 members and paginates client-side;
          // switch to server-side offset paging when a gym exceeds that
          api.listMembers(orgId, { limit: 500 }),
          api.listMemberships(orgId),
          api.listPlans(orgId),
          api.listPayments(orgId, { status: "pending" }),
          api.loadDashboardStats(org),
          api.listStaff(orgId),
        ])

      // Latest membership per member (greatest end date wins)
      const membershipByMember = new Map<
        string,
        { plan_name: string; status: string; end_date: string; id: string }
      >()
      for (const m of dbMemberships) {
        const prev = membershipByMember.get(m.member_id)
        if (!prev || m.end_date > prev.end_date) {
          membershipByMember.set(m.member_id, {
            plan_name: m.plan_name,
            status: m.status,
            end_date: m.end_date,
            id: m.id,
          })
        }
      }
      const dueByMember = new Map<string, number>()
      for (const p of pending) {
        dueByMember.set(p.member_id, (dueByMember.get(p.member_id) ?? 0) + p.amount_minor)
      }
      const staffMap: Record<string, string> = {}
      for (const s of staff) staffMap[s.id] = s.name
      setStaffNames(staffMap)

      const rows: Member[] = dbMembers.map((row) => {
        const ms = membershipByMember.get(row.id)
        const days = ms ? daysUntil(ms.end_date) : null
        const status =
          row.status === "suspended" || ms?.status === "frozen"
            ? "Frozen"
            : row.status === "archived"
              ? "Archived"
              : ms && ms.status === "expired" || (days !== null && days < 0)
                ? "Expired"
                : days !== null && days <= 7
                  ? "Expiring soon"
                  : "Active"
        const due = dueByMember.get(row.id) ?? 0
        return {
          name: `${row.first_name} ${row.last_name}`.trim(),
          email: row.email ?? "—",
          phone: row.phone,
          age: ageFromDob(row.date_of_birth) ?? 0,
          plan: ms?.plan_name ?? "Unassigned",
          status,
          joined: formatDate(row.joined_on),
          expires: ms ? formatDate(ms.end_date) : "—",
          due: due > 0 ? formatMoney(due) : "₹0",
          trainer: row.trainer_id ? (staffMap[row.trainer_id] ?? "Unassigned") : "Unassigned",
          memberId: row.id,
          membershipId: ms?.id,
        }
      })
      setMembers(rows)
      setPlans(dbPlans)
      setStats(dbStats)
      // Seed the Memberships view rows from real plans (name · price·duration)
      setRecords((prev) => ({
        ...prev,
        Memberships: dbPlans.map((p) => [
          p.name,
          `${p.duration_days} days · ${formatMoney(p.price_minor, org.organization.currency)}`,
        ]),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load data"
      setDbError(message)
      notify(message)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (org) {
      setLoadingData(true)
      reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

  // Module tables backed by the database load their rows when opened.
  useEffect(() => {
    if (!org) return
    const orgId = org.organization.id
    const loadModule = async () => {
      try {
        if (active === "Attendance") {
          const rows = await api.listAttendance(orgId, { limit: 100 })
          const nameOf = new Map(members.map((m) => [m.memberId, m.name]))
          setOpenCheckins(
            rows
              .filter((r) => !r.check_out)
              .map((r) => ({ id: r.id, name: nameOf.get(r.member_id) ?? "Member" })),
          )
          const fmt = (iso: string) =>
            new Date(iso).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          setRecords((prev) => ({
            ...prev,
            Attendance: rows.map((r) => [
              nameOf.get(r.member_id) ?? "Member",
              fmt(r.check_in),
              r.check_out ? fmt(r.check_out) : "—",
              r.method === "manual" ? "Front desk" : r.method,
              r.check_out ? "Completed" : "Open",
            ]),
          }))
        } else if (active === "Classes & PT") {
          const rows = await api.listClasses(orgId)
          const fmt = (iso: string) =>
            new Date(iso).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          setRecords((prev) => ({
            ...prev,
            "Classes & PT": rows.map((r) => [
              r.name,
              r.trainer_id ? (staffNames[r.trainer_id] ?? "Unassigned") : "Unassigned",
              fmt(r.starts_at),
              `${r.capacity} seats`,
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
            ]),
          }))
        } else if (active === "Enquiries") {
          const rows = await api.listEnquiries(orgId)
          setConvertible(
            rows
              .filter((r) => r.status !== "converted" && r.status !== "lost")
              .map((r) => ({ id: r.id, name: r.name, phone: r.phone })),
          )
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")
          setRecords((prev) => ({
            ...prev,
            Enquiries: rows.map((r) => [
              r.name,
              r.phone,
              r.interest || "—",
              cap(r.source),
              cap(r.status),
            ]),
          }))
        } else if (active === "Payments") {
          const rows = await api.listPayments(orgId, { limit: 100 })
          const nameOf = new Map(members.map((m) => [m.memberId, m.name]))
          setRecords((prev) => ({
            ...prev,
            Payments: rows.map((r) => [
              nameOf.get(r.member_id) ?? "Member",
              r.description || "Membership payment",
              formatDate(r.paid_on),
              formatMoney(r.amount_minor, r.currency),
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
            ]),
          }))
        } else if (active === "Trainers & staff") {
          const rows = await api.listStaff(orgId)
          setRecords((prev) => ({
            ...prev,
            "Trainers & staff": rows.map((r) => [
              r.name,
              r.job_role,
              "—",
              formatDate(r.joined_on),
              "—",
            ]),
          }))
        } else if (active === "Expenses") {
          const rows = await api.listExpenses(orgId)
          setRecords((prev) => ({
            ...prev,
            Expenses: rows.map((r) => [
              r.description || r.category,
              r.category,
              formatDate(r.expense_date),
              formatMoney(r.amount_minor),
              "Recorded",
            ]),
          }))
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : `Could not load ${active}`)
      }
    }
    loadModule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, org, members.length, moduleTick])
  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    const motion = gsap.matchMedia(main)
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const heading = main.querySelector<HTMLElement>(
        ".page-heading:not([hidden])",
      )
      const statCards = gsap.utils.toArray<HTMLElement>(
        ".stats > .stat",
        main,
      )
      const sections = gsap.utils.toArray<HTMLElement>(
        ".panel, .directory, .attention, .integration-note",
        main,
      )
      const rows = gsap.utils.toArray<HTMLElement>(
        ".directory tbody tr",
        main,
      )
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      })

      if (heading) {
        timeline.fromTo(
          heading,
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            clearProps: "opacity,visibility,transform",
          },
          0,
        )
      }

      if (statCards.length) {
        timeline.fromTo(
          statCards,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
            stagger: 0.07,
            clearProps: "opacity,visibility,transform",
          },
          0.08,
        )
      }

      if (sections.length) {
        timeline.fromTo(
          sections,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.08,
            clearProps: "opacity,visibility,transform",
          },
          statCards.length ? 0.2 : 0.1,
        )
      }

      if (rows.length) {
        timeline.fromTo(
          rows,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.035,
            clearProps: "opacity,visibility,transform",
          },
          0.35,
        )
      }
    })

    return () => motion.revert()
  }, [active])
  const filtered = members.filter(
    (m) =>
      (tab === "All members" || m.status === tab) &&
      (plan === "All plans" || m.plan === plan) &&
      `${m.name} ${m.email} ${m.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  const exportData = () => {
    const rows =
      active === "Members"
        ? [
            ["Name", "Email", "Phone", "Plan", "Status"],
            ...filtered.map((m) => [
              m.name,
              m.email,
              m.phone,
              m.plan,
              m.status,
            ]),
          ]
        : [
            modules[active]?.columns || ["Name"],
            ...(modules[active]?.rows || []),
          ]
    const url = URL.createObjectURL(
      new Blob(
        [
          rows
            .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
            .join("\n"),
        ],
        { type: "text/csv" },
      ),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `twoplus-${active.toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify("CSV exported")
  }
  const module = modules[active]
  return (
    <div className={`app ${active === "Overview" ? "summary-view" : ""}`}>
      <nav className="floating-rail compact-module-rail" aria-label="Main navigation">
        {[...groups.flatMap(([, ...items]) => items), "Member app", "Customer support"].map((item) => (
          <button key={item} title={item} aria-label={item} aria-current={active === item ? "page" : undefined} className={active === item ? "rail-active" : ""} onClick={() => go(item)}>
            <Icon name={navigationIcons[item as keyof typeof navigationIcons]} size={19} />
          </button>
        ))}
      </nav>
      <div className="main-shell">
        <header className="topbar">
          <button className="glass-brand" onClick={() => go("Overview")} aria-label="TwoPlus home"><Icon name="activity" size={25} /><AsciiGlitchRipple as="span" className="brand-glitch">TwoPlus</AsciiGlitchRipple></button>
          <div className="summary-tabs">{[["Overview", "Gym Summary"], ["Members", "Members"], ["Reports", "Revenue Analysis"], ["Classes & PT", "Class Schedule"]].map(([key, label]) => <button key={key} className={active === key ? "is-selected" : ""} onClick={() => go(key)}>{label}</button>)}</div>
          <div className="breadcrumb">
            <Icon name="shop" size={15} />
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-label">{org?.role ?? "Owner"}</span>
            {platformRole === "super_admin" && <a className="platform-admin-link" href="/super-admin">Platform admin</a>}
            <button
              aria-label="View reminders"
              className="icon-button notification"
              onClick={() => go("Reminders")}
            >
              <Icon name="bell" size={18} />
            </button>
            <span className="header-divider" />
            <button
              aria-label="Sign out"
              title="Sign out"
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
              onClick={() => signOut()}
            >
              <Avatar name="Your account" small />
            </button>
          </div>
        </header>
        {org?.organization.status &&
          org.organization.status !== "active" &&
          org.organization.status !== "trial" && (
            <div className="workspace-locked" role="status">
              <Icon name="shield" size={15} />
              <div>
                <strong>
                  {org.organization.status === "suspended"
                    ? "This workspace is suspended"
                    : "This workspace is closed"}
                </strong>
                <span>
                  Your records are safe and remain viewable, but changes are
                  disabled. Contact TwoPlus support to restore access.
                </span>
              </div>
            </div>
          )}
        <main ref={mainRef}>
          {active === "Overview" && <><div className="page-heading"><div><MorphText words={["YOUR WORKSPACE", "GYM SUMMARY", "BUSINESS OVERVIEW"]} interval={4200} fontSize="9px" className="summary-morph" textClassName="summary-morph-text" /><h1>Gym Summary</h1><p>{stats ? "Live figures from your workspace." : loadingData ? "Loading your workspace…" : "Your business overview will fill in as you add records."}</p></div><RadialGlowButton className="overview-radial-cta" onClick={() => setModal("Add member")}><Icon name="plus" size={15} />Add member</RadialGlowButton></div><Stats items={[["Members", stats ? String(stats.totalMembers) : "—", stats ? `${stats.activeMembers} active` : "Loading"], ["Active memberships", stats ? String(stats.activeMemberships) : "—", stats ? `${stats.expiringSoon} expiring within 7 days` : "Loading"], ["Recorded payments", stats ? formatMoney(stats.monthCollectionsMinor, org?.organization.currency) : "—", "Collected this month"], ["Enquiries", stats ? String(stats.newEnquiries) : "—", "Received this month"]]} /><section className="panel workspace-empty"><Icon name="dashboard" size={32} /><Title>No activity to report yet</Title><p>Revenue, attendance, retention, and growth charts will appear when there is enough recorded activity. No sample figures are shown.</p><AnimatedButton className="animated-glass-button" onClick={() => go("Members")}>Open member directory <Icon name="arrow" size={15} /></AnimatedButton></section></>}

          <div className="page-heading" hidden={active === "Overview"}>
            <div>
              <div className="eyebrow">
                {(org?.organization.name ?? "YOUR GYM").toUpperCase()} <span>/</span> {branch.toUpperCase()}
              </div>
              <h1>{active === "Members" ? "Your members" : active}</h1>
              <p>
                {descriptions[active] ||
                  module?.sub ||
                  "One connected workspace for your gym."}
              </p>
            </div>
            <div className="heading-actions">
              {!["Community", "Marketplace", "Member app"].includes(active) && (
                <Button secondary onClick={exportData}>
                  <Icon name="arrow" size={15} />
                  Export
                </Button>
              )}
              <Button
                disabled={!!module && !hasDbStorage(active)}
                title={
                  !!module && !hasDbStorage(active)
                    ? "This module has no database storage yet"
                    : undefined
                }
                onClick={() =>
                  active === "Community"
                    ? setModal("Create group")
                    : active === "Marketplace"
                      ? setModal("Review order")
                      : setModal(
                          active === "Members"
                            ? "Add member"
                            : active === "Overview"
                              ? "Add member"
                              : active === "Memberships"
                                ? "Create plan"
                                : module?.action || "Add record",
                        )
                }
              >
                <Icon name="plus" size={16} />
                {active === "Members" || active === "Overview"
                  ? "Add member"
                  : active === "Community"
                    ? "Create group"
                    : active === "Marketplace"
                      ? `Cart (${cart.length})`
                      : active === "Memberships"
                        ? "Create plan"
                        : module?.action || "Add record"}
              </Button>
            </div>
          </div>

          {active === "Members" && (
            <>
              <Stats
                items={[
                  [
                    "Total members",
                    String(members.length),
                    "In your directory",
                  ],
                  [
                    "Active members",
                    String(members.filter((m) => m.status === "Active").length),
                    "Ready for their next workout",
                  ],
                  [
                    "Expiring soon",
                    String(
                      members.filter((m) => m.status === "Expiring soon")
                        .length,
                    ),
                    "Within the next 7 days",
                  ],
                  ["Members with dues", String(members.filter(m => m.due !== "₹0").length), "Pending payments"],
                ]}
              />
              <section className="directory">
                <div className="tabs">
                  {[
                    "All members",
                    "Active",
                    "Expiring soon",
                    "Expired",
                    "Frozen",
                  ].map((t) => (
                    <button
                      className={tab === t ? "selected" : ""}
                      key={t}
                      onClick={() => {
                        setTab(t)
                        setSelected([])
                        setPage(1)
                      }}
                    >
                      {t}
                      <span>
                        {t === "All members"
                          ? members.length
                          : members.filter((m) => m.status === t).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="table-toolbar">
                  <div className="search-field">
                    <Icon name="search" size={17} />
                    <Input
                      aria-label="Search members"
                      placeholder="Search by name, phone, or email..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setPage(1)
                      }}
                    />
                    <kbd>⌘ K</kbd>
                  </div>
                  <div className="filter-group">
                    <Select
                      aria-label="Filter membership plan"
                      value={plan}
                      onChange={(e) => {
                        setPlan(e.target.value)
                        setPage(1)
                      }}
                    >
                      <option>All plans</option>
                      {plans.map((p) => (
                        <option key={p.id}>{p.name}</option>
                      ))}
                    </Select>
                    <Button
                      secondary
                      onClick={() => setModal("Member filters")}
                    >
                      <Icon name="settings" size={14} />
                      Filters
                    </Button>
                  </div>
                </div>
                {selected.length > 0 && (
                  <div className="selection-bar">
                    {selected.length} selected
                    <Button secondary onClick={() => setModal("Send reminder")}>
                      Send reminder
                    </Button>
                    <Button
                      secondary
                      onClick={() => setModal("Freeze memberships")}
                    >
                      Freeze memberships
                    </Button>
                  </div>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Select all members"
                            checked={
                              filtered.length > 0 &&
                              filtered.every((m) => selected.includes(m.name))
                            }
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? filtered.map((m) => m.name)
                                  : [],
                              )
                            }
                          />
                        </th>
                        <th>
                          Member <span className="sort">↓</span>
                        </th>
                        <th>Membership</th>
                        <th>Status</th>
                        <th>Expiry date</th>
                        <th>Pending dues</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((m) => (
                        <tr key={m.memberId ?? m.email}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${m.name}`}
                              checked={selected.includes(m.name)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, m.name]
                                    : selected.filter((n) => n !== m.name),
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="member-cell"
                              onClick={() => setProfile(m)}
                            >
                              <Avatar name={m.name} />
                              <span>
                                <strong>{m.name}</strong>
                                <small>{m.email}</small>
                              </span>
                            </button>
                          </td>
                          <td>
                            <span className="plan-label">
                              {m.plan}
                            </span>

                          </td>
                          <td>
                            <Badge>{m.status}</Badge>
                          </td>
                          <td
                            className={
                              m.status === "Expired" ? "expired-date" : ""
                            }
                          >
                            {m.expires}
                            <small className="cell-detail">
                              {m.status === "Expiring soon"
                                ? "Renewal coming up"
                                : m.status === "Expired"
                                  ? "Renewal overdue"
                                  : ""}
                            </small>
                          </td>
                          <td
                            className={m.due !== "₹0" ? "due-amount" : "muted"}
                          >
                            {m.due}
                          </td>
                          <td>
                            <button
                              className="row-more"
                              aria-label={`Open ${m.name} details`}
                              onClick={() => setProfile(m)}
                            >
                              ···
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {loadingData ? (
                    <div className="empty">Loading members…</div>
                  ) : dbError ? (
                    <div className="empty">
                      {dbError}
                      <Button secondary onClick={() => reload()}>
                        Retry
                      </Button>
                    </div>
                  ) : !filtered.length && (
                    <div className="empty">
                      {members.length ? "No members match your filters." : "No members yet. Add your first member to get started."}
                      <Button
                        secondary
                        onClick={() => {
                          setQuery("")
                          setPlan("All plans")
                          setTab("All members")
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing{" "}
                    <strong>
                      {filtered.length
                        ? (currentPage - 1) * PAGE_SIZE + 1
                        : 0}
                      –{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                    </strong>{" "}
                    of <strong>{filtered.length}</strong> members
                  </span>
                  <div>
                    <span>{PAGE_SIZE} per page</span>
                    <Button
                      secondary
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      onClick={() => setPage(currentPage - 1)}
                    >
                      ‹
                    </Button>
                    <Button secondary className="current-page" disabled>
                      {currentPage}
                    </Button>
                    <Button
                      secondary
                      disabled={currentPage >= pageCount}
                      aria-label="Next page"
                      onClick={() => setPage(currentPage + 1)}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </section>
              <div className="bottom-note">
                <Icon name="check" size={14} />
                <span>
                  A stronger community starts with knowing your members.
                </span>
                <button onClick={() => go("Member app")}>
                  Explore the member app <Icon name="arrow" size={13} />
                </button>
              </div>
            </>
          )}

          {active === "Reports" && <section className="panel workspace-empty"><Icon name="activity" size={32} /><Title>No reports yet</Title><p>Reports need connected payment and attendance data. No trends or performance figures are available.</p></section>}

          {active === "Memberships" && <section className="panel">{records.Memberships?.length ? records.Memberships.map((r, i) => <div className="summary-line" key={i}><strong>{r[0]}</strong><span>{r[1]}</span></div>) : <div className="workspace-empty"><Icon name="calendar" size={32} /><Title>No membership plans yet</Title><p>Create your first plan to get started.</p><Button onClick={() => setModal("Create plan")}>Create plan</Button></div>}</section>}

          {active === "Community" && <section className="panel workspace-empty"><Icon name="members" size={32} /><Title>No community conversations yet</Title><p>No groups, members, or messages have been added. Live chat, calls, and encrypted delivery require a connected service.</p><Button secondary onClick={() => setModal("Create group")}>Draft a group</Button></section>}

          {module && active !== "Reports" && (
            <>
              <Stats items={[["Records", String((records[active] || []).length), "Added in this session"]]} />
              {["Payments", "Reminders", "Access & roles"].includes(active) && (
                <div className="integration-note">
                  <Icon name="settings" size={15} />
                  {active === "Payments"
                    ? "Payments are saved to your workspace. Online gateway collection is not connected — record only payments you have actually received."
                    : active === "Reminders"
                      ? "Configure an SMS provider and member app delivery before enabling live reminders."
                      : "Role settings and device access are visual previews. Server-side authorization is not connected."}
                </div>
              )}
              <section className="directory">
                <div className="module-table-heading">
                  <div>
                    <Title>
                      {active === "Payroll"
                        ? "Employee payroll"
                        : `${active} directory`}
                    </Title>
                    <p>{module.sub}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge>
                      {["Attendance", "Classes & PT", "Enquiries", "Payments", "Trainers & staff", "Expenses"].includes(active)
                        ? "Saved"
                        : "Session only"}
                    </Badge>
                    {active === "Attendance" && (
                      <Button
                        secondary
                        disabled={!openCheckins.length}
                        onClick={() => setModal("Check out member")}
                      >
                        Check out member
                      </Button>
                    )}
                    {active === "Enquiries" && (
                      <Button
                        secondary
                        disabled={!convertible.length}
                        onClick={() => setModal("Convert enquiry")}
                      >
                        Convert to member
                      </Button>
                    )}
                  </div>
                </div>
                <div className="table-toolbar">
                  <div className="search-field">
                    <Icon name="search" size={16} />
                    <Input
                      placeholder={`Search ${active.toLowerCase()}...`}
                      aria-label={`Search ${active}`}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setPage(1)
                      }}
                    />
                  </div>
                  <span className="muted">
                    {[...module.rows, ...(records[active] || [])].length}{" "}
                    records
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {module.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {[...module.rows, ...(records[active] || [])]
                        .filter((r) =>
                          r.join(" ")
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((r, i) => (
                          <tr key={i}>
                            {r.map((c, j) => (
                              <td key={j}>
                                {j === 0 ? (
                                  <button
                                    className="table-name"
                                    onClick={() => setModal(`Details: ${r[0]}`)}
                                  >
                                    {c}
                                  </button>
                                ) : j === r.length - 1 &&
                                  ["Status", "Format"].includes(
                                    module.columns[j],
                                  ) ? (
                                  <Badge>{c}</Badge>
                                ) : (
                                  c
                                )}
                              </td>
                            ))}
                            <td>
                              <button
                                className="row-more"
                                aria-label={`View ${r[0]}`}
                                onClick={() => setModal(`Details: ${r[0]}`)}
                              >
                                ···
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!(records[active] || []).length && <div className="empty">{["Attendance", "Classes & PT", "Enquiries", "Payments", "Trainers & staff", "Expenses"].includes(active) ? "No records yet. Use the add button to create your first entry." : "This module is not connected to the database yet, so no records can be stored here."}</div>}
                </div>
                <div className="table-footer">
                  <span>All records · {branch}</span>
                  <span>
                    {["Attendance", "Classes & PT", "Enquiries", "Payments", "Trainers & staff", "Expenses"].includes(active)
                      ? "Saved to your workspace"
                      : "Not available — no database storage yet"}
                  </span>
                </div>
              </section>
            </>
          )}

          {active === "Marketplace" && <section className="panel workspace-empty"><Icon name="shop" size={32} /><Title>No products available</Title><p>A supplier catalog is not connected. Products, pricing, ratings, and ordering will appear once a real catalog is available.</p></section>}

          {active === "Member app" && <section className="panel workspace-empty"><Icon name="members" size={32} /><Title>No member app connected</Title><p>Connect member accounts to show their memberships, workouts, classes, and payments here.</p></section>}

          <footer className="page-footer">
            <span>TwoPlus · A little less admin. A lot more progress.</span>
            <button onClick={() => go("Customer support")}>Need a hand?</button>
          </footer>
        </main>
      </div>
      {profile && (
        <div className="modal-overlay" onMouseDown={() => setProfile(null)}>
          <section
            className="profile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Member details"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-top">
              <span>MEMBER PROFILE</span>
              <Button
                secondary
                aria-label="Close member profile"
                onClick={() => setProfile(null)}
              >
                <Icon name="close" size={17} />
              </Button>
            </div>
            <div className="profile-hero">
              <Avatar name={profile.name} />
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              <Badge>{profile.status}</Badge>
            </div>
            <div className="profile-details">
              <Title>Personal details</Title>
              {[
                ["Phone number", profile.phone],
                ["Age", profile.age ? `${profile.age} years` : "—"],
                ["Member since", profile.joined],
                ["Assigned trainer", profile.trainer],
              ].map(([k, v]) => (
                <div className="detail-line" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <Title>Membership & payments</Title>
              {[
                ["Current plan", profile.plan],
                ["Valid until", profile.expires],
                ["Outstanding balance", profile.due],
              ].map(([k, v]) => (
                <div className="detail-line" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <div className="profile-actions">
                <Button onClick={() => setModal("Renew membership")}>
                  Renew membership
                </Button>
                <Button secondary onClick={() => setModal("Edit member")}>
                  Edit details
                </Button>
                <Button secondary onClick={() => setModal("Send reminder")}>
                  Send reminder
                </Button>
                <Button
                  secondary
                  onClick={() =>
                    setModal(
                      profile.status === "Archived"
                        ? "Restore member"
                        : "Archive member",
                    )
                  }
                >
                  {profile.status === "Archived"
                    ? "Restore member"
                    : "Archive member"}
                </Button>
              </div>
              <Title>Attendance history</Title>
              <p className="muted">No attendance recorded for this member.</p>
              <Button
                secondary
                onClick={async () => {
                  if (!profile?.membershipId) return
                  try {
                    await api.setMembershipStatus(
                      profile.membershipId,
                      profile.status === "Frozen" ? "active" : "frozen",
                    )
                    notify("Membership status updated")
                    reload()
                  } catch (err) {
                    notify(
                      err instanceof Error ? err.message : "Could not update membership",
                    )
                  }
                }}
              >
                {profile.status === "Frozen" ? "Unfreeze" : "Freeze"} membership
              </Button>
            </div>
          </section>
        </div>
      )}
      {modal && (
        <div
          className="modal-overlay modal-front"
          onMouseDown={() => setModal("")}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <Title>{modal}</Title>
                <p>
                  {modal.startsWith("Details:")
                    ? "Record details"
                    : modal === "Member filters" || modal === "Review order"
                      ? "Changes stay in this session. Reloading clears them."
                      : "Saved securely to your gym workspace."}
                </p>
              </div>
              <Button
                secondary
                aria-label="Close dialog"
                onClick={() => setModal("")}
              >
                <Icon name="close" size={16} />
              </Button>
            </div>
            {modal === "Member filters" ? (
              <div className="modal-body">
                <label>
                  Membership plan
                  <Select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    <option>All plans</option>
                    {(records.Memberships || []).map((r, i) => <option key={i}>{r[0]}</option>)}
                  </Select>
                </label>
                <label>
                  Status
                  <Select value={tab} onChange={(e) => setTab(e.target.value)}>
                    {[
                      "All members",
                      "Active",
                      "Expiring soon",
                      "Expired",
                      "Frozen",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </label>
                <Button onClick={() => setModal("")}>Apply filters</Button>
              </div>
            ) : modal === "Review order" ? (
              <div className="modal-body">
                {cart.length ? (
                  cart.map((p, i) => (
                    <div className="summary-line" key={i}>
                      {p}
                      <button
                        className="text-button"
                        onClick={() => setCart(cart.filter((_, j) => i !== j))}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p>Your cart is empty. Add equipment to start a quote.</p>
                )}
                <div className="integration-note">
                  This is a sample cart. Supplier quotes, shipping, and checkout
                  are not connected. No order will be placed.
                </div>
                <Button secondary onClick={() => setModal("")}>
                  Continue browsing
                </Button>
              </div>
            ) : modal === "Send reminder" ? (
              <form
                className="modal-body"
                onSubmit={(e) => {
                  e.preventDefault()
                  setModal("")
                  notify("Delivery provider not connected — nothing was sent or saved")
                }}
              >
                <label>
                  Recipient
                  <Input
                    value={
                      profile?.name ||
                      `${selected.length || 1} selected member(s)`
                    }
                    readOnly
                  />
                </label>
                <label>
                  Channel
                  <Select>
                    <option>Member app + SMS</option>
                    <option>Member app</option>
                    <option>SMS</option>
                  </Select>
                </label>
                <label>
                  Message
                  <textarea
                    required
                    defaultValue="Hi! A friendly reminder that your CoreFit membership is due for renewal. We’d love to keep you moving with us."
                  />
                </label>
                <div className="integration-note">
                  Delivery provider not connected. Save a draft to preview this
                  workflow.
                </div>
                <Button type="submit">Save reminder draft</Button>
              </form>
            ) : modal === "Online class" ? (
              <div className="modal-body">
                <p>
                  Online classes need a video provider to create and host the
                  meeting. None is connected, so nothing can be scheduled here
                  yet. Use <strong>Schedule class</strong> to create an in-person
                  session.
                </p>
                <div className="modal-footer">
                  <Button type="button" onClick={() => setModal("")}>
                    Close
                  </Button>
                </div>
              </div>
            ) : modal.startsWith("Details:") ? (
              <div className="modal-body">
                {[...(module?.rows || []), ...(records[active] || [])]
                  .filter((r) => r[0] === modal.slice(9))
                  .map((r, i) => (
                    <div key={i}>
                      {r.map((v, j) => (
                        <div className="detail-line" key={j}>
                          <span>{module?.columns[j]}</span>
                          <strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                  ))}
                <p className="muted">
                  This record is stored in this session only. Reloading clears it.
                </p>
                <Button secondary onClick={() => setModal("")}>
                  Done
                </Button>
              </div>
            ) : (
              <form
                className="modal-body"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!org) return
                  const data = new FormData(e.currentTarget)
                  const orgId = org.organization.id
                  setModalError("")
                  setModalBusy(true)
                  try {
                    if (modal === "Add member") {
                      const rawName = String(data.get("name") || "").trim()
                      const [first, ...rest] = rawName.split(/\s+/)
                      const planName = String(data.get("plan") || "Unassigned")
                      const chosen = plans.find((p) => p.name === planName)
                      const created = await api.createMember(orgId, {
                        first_name: first || rawName,
                        last_name: rest.join(" "),
                        email: String(data.get("email") || "") || undefined,
                        phone: String(data.get("phone") || ""),
                        date_of_birth: String(data.get("dob") || "") || undefined,
                        joined_on: String(data.get("joined") || "") || undefined,
                      })
                      if (chosen) {
                        const start = String(data.get("joined") || "") ||
                          new Date().toISOString().slice(0, 10)
                        const end = String(data.get("expires") || "") || start
                        await api.assignMembership(orgId, {
                          member_id: created.id,
                          plan_id: chosen.id,
                          plan_name: chosen.name,
                          price_minor: chosen.price_minor,
                          start_date: start,
                          end_date: end,
                        })
                      }
                      setModal("")
                      notify("Member saved to your workspace")
                      reload()
                    } else if (modal === "Renew membership" && profile?.membershipId) {
                      await api.updateMembershipExpiry(
                        profile.membershipId,
                        String(data.get("expires") || ""),
                      )
                      setModal("")
                      notify("Membership renewed")
                      reload()
                    } else if (modal === "Freeze memberships") {
                      const ids = members
                        .filter((m) => selected.includes(m.name) && m.membershipId)
                        .map((m) => m.membershipId as string)
                      await Promise.all(
                        ids.map((id) =>
                          api.setMembershipStatus(
                            id,
                            profile?.status === "Frozen" ? "active" : "frozen",
                          ),
                        ),
                      )
                      setModal("")
                      setSelected([])
                      notify(`${ids.length} membership(s) updated`)
                      reload()
                    } else if (modal === "Record payment") {
                      const name = String(data.get("member") || "")
                      const target = members.find((m) => m.name === name)
                      if (!target?.memberId) throw new Error("Select a member")
                      const rupees = Number(String(data.get("amount") || "0"))
                      if (!(rupees > 0)) throw new Error("Enter a valid amount")
                      await api.recordPayment(orgId, {
                        member_id: target.memberId,
                        membership_id: target.membershipId ?? null,
                        amount_minor: Math.round(rupees * 100),
                        method: String(data.get("method") || "cash") as PaymentMethod,
                        status: String(data.get("status") || "paid") as "paid" | "pending",
                        description: String(data.get("description") || "") || undefined,
                      })
                      setModal("")
                      notify("Payment recorded")
                      setModuleTick((t) => t + 1)
                      reload()
                    } else if (modal === "Check in member") {
                      const name = String(data.get("member") || "")
                      const target = members.find((m) => m.name === name)
                      if (!target?.memberId) throw new Error("Select a member")
                      await api.checkInMember(orgId, target.memberId, org.branch?.id)
                      setModal("")
                      notify("Check-in recorded")
                      go("Attendance")
                    } else if (modal === "Add enquiry") {
                      await api.createEnquiry(orgId, {
                        name: String(data.get("name") || ""),
                        phone: String(data.get("phone") || ""),
                        interest: String(data.get("interest") || "") || undefined,
                        source: String(data.get("source") || "walk_in") as
                          | "walk_in"
                          | "referral"
                          | "social"
                          | "website"
                          | "phone"
                          | "other",
                      })
                      setModal("")
                      notify("Enquiry added")
                      go("Enquiries")
                    } else if (modal === "Add employee") {
                      await api.createStaffMember(orgId, {
                        name: String(data.get("name") || ""),
                        phone: String(data.get("phone") || ""),
                        email: String(data.get("email") || "") || undefined,
                        job_role: String(data.get("role") || "Trainer"),
                      })
                      setModal("")
                      notify("Team member added")
                      go("Trainers & staff")
                    } else if (modal === "Add expense") {
                      const rupees = Number(String(data.get("amount") || "0"))
                      if (!(rupees > 0)) throw new Error("Enter a valid amount")
                      await api.createExpense(orgId, {
                        category: String(data.get("category") || ""),
                        amount_minor: Math.round(rupees * 100),
                        expense_date: String(data.get("date") || "") || undefined,
                        description: String(data.get("description") || "") || undefined,
                      })
                      setModal("")
                      notify("Expense recorded")
                      go("Expenses")
                    } else if (modal === "Schedule class") {
                      const startsAt = String(data.get("starts") || "")
                      if (!startsAt) throw new Error("Pick a start time")
                      await api.createClass(orgId, {
                        name: String(data.get("name") || ""),
                        starts_at: new Date(startsAt).toISOString(),
                        capacity: Number(String(data.get("capacity") || "20")) || 20,
                        duration_minutes:
                          Number(String(data.get("duration") || "60")) || 60,
                      })
                      setModal("")
                      notify("Class scheduled")
                      go("Classes & PT")
                    } else if (modal === "Create plan") {
                      const priceRupees = Number(String(data.get("price") || "0"))
                      const duration = Number(String(data.get("duration") || "0"))
                      if (!(priceRupees >= 0)) throw new Error("Enter a valid price")
                      if (!(duration > 0)) throw new Error("Enter a valid duration")
                      await api.createPlan(orgId, {
                        name: String(data.get("name") || ""),
                        description: String(data.get("description") || "") || undefined,
                        duration_days: duration,
                        price_minor: Math.round(priceRupees * 100),
                      })
                      setModal("")
                      notify("Plan created")
                      reload()
                    } else if (modal === "Edit member" && profile?.memberId) {
                      const rawName = String(data.get("name") || "").trim()
                      const [first, ...rest] = rawName.split(/\s+/)
                      await api.updateMember(profile.memberId, {
                        first_name: first || rawName,
                        last_name: rest.join(" "),
                        email: String(data.get("email") || "") || null,
                        phone: String(data.get("phone") || ""),
                        date_of_birth: String(data.get("dob") || "") || null,
                      })
                      setModal("")
                      setProfile(null)
                      notify("Member details updated")
                      reload()
                    } else if (
                      (modal === "Archive member" || modal === "Restore member") &&
                      profile?.memberId
                    ) {
                      await api.updateMember(profile.memberId, {
                        status: modal === "Archive member" ? "archived" : "active",
                      })
                      setModal("")
                      setProfile(null)
                      notify(
                        modal === "Archive member"
                          ? "Member archived"
                          : "Member restored",
                      )
                      reload()
                    } else if (modal === "Check out member") {
                      const attendanceId = String(data.get("attendance") || "")
                      if (!attendanceId) throw new Error("Select a member to check out")
                      await api.checkOutMember(attendanceId)
                      setModal("")
                      notify("Check-out recorded")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Convert enquiry") {
                      const enquiryId = String(data.get("enquiry") || "")
                      const enquiry = convertible.find((e) => e.id === enquiryId)
                      if (!enquiry) throw new Error("Select an enquiry to convert")
                      const [first, ...rest] = enquiry.name.trim().split(/\s+/)
                      const created = await api.createMember(orgId, {
                        first_name: first || enquiry.name,
                        last_name: rest.join(" "),
                        phone: enquiry.phone,
                      })
                      const chosen = plans.find(
                        (p) => p.name === String(data.get("plan") || "Unassigned"),
                      )
                      if (chosen) {
                        const start =
                          String(data.get("joined") || "") ||
                          new Date().toISOString().slice(0, 10)
                        const end = String(data.get("expires") || "") || start
                        await api.assignMembership(orgId, {
                          member_id: created.id,
                          plan_id: chosen.id,
                          plan_name: chosen.name,
                          price_minor: chosen.price_minor,
                          start_date: start,
                          end_date: end,
                        })
                      }
                      await api.updateEnquiry(enquiryId, {
                        status: "converted",
                        converted_member_id: created.id,
                      })
                      setModal("")
                      notify("Enquiry converted to a member")
                      setModuleTick((t) => t + 1)
                      reload()
                    } else if (modal === "Create group") {
                      setModal("")
                      notify(
                        "Community groups need a messaging service — nothing was created",
                      )
                    } else if (module) {
                      setModal("")
                      notify(
                        "This module has no database storage yet — the entry was not saved",
                      )
                    } else {
                      setModal("")
                    }
                  } catch (err) {
                    setModalError(
                      err instanceof Error ? err.message : "Could not save. Try again.",
                    )
                  } finally {
                    setModalBusy(false)
                  }
                }}
              >
                {modal === "Add member" ? (
                  <>
                    <label>
                      Full name
                      <Input
                        name="name"
                        required
                        placeholder="Full name"
                        autoFocus
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Email address
                        <Input
                          name="email"
                          type="email"
                          required
                          placeholder="member@email.com"
                        />
                      </label>
                      <label>
                        Phone number
                        <Input
                          name="phone"
                          type="tel"
                          required
                          placeholder="+91"
                        />
                      </label>
                    </div>
                    <label>
                      Date of birth
                      <Input type="date" name="dob" />
                    </label>
                    <label>
                      Membership plan
                      <Select name="plan">
                        <option>Unassigned</option>
                        {plans.map((p) => (
                          <option key={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </label>
                    <div className="form-row"><label>Start date<Input type="date" name="joined" required defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Expiry date<Input type="date" name="expires" required /></label></div>
                  </>
                ) : modal === "Renew membership" ? (
                  <>
                    <div className="detail-line">
                      <span>Member</span>
                      <strong>{profile?.name}</strong>
                    </div>
                    <div className="detail-line">
                      <span>Plan</span>
                      <strong>{profile?.plan}</strong>
                    </div>
                    <label>New expiry date<Input name="expires" type="date" required /></label><p>This updates the membership date only. No payment will be collected and outstanding dues are unchanged.</p>
                  </>
                ) : modal === "Record payment" ? (
                  <>
                    <label>
                      Member
                      <Select name="member" required>
                        <option value="">Select a member…</option>
                        {members.map((m) => (
                          <option key={m.memberId} value={m.name}>{m.name}</option>
                        ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Amount (₹)
                        <Input name="amount" type="number" min="1" step="1" required placeholder="1500" />
                      </label>
                      <label>
                        Method
                        <Select name="method" defaultValue="cash">
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="other">Other</option>
                        </Select>
                      </label>
                    </div>
                    <label>
                      Status
                      <Select name="status" defaultValue="paid">
                        <option value="paid">Paid — collected and verified</option>
                        <option value="pending">Pending — not yet received</option>
                      </Select>
                    </label>
                    <label>
                      Description
                      <Input name="description" placeholder="e.g. Monthly membership fee" />
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      Online payment gateway is not connected. Record only payments
                      you have actually collected. Card details are never stored.
                    </div>
                  </>
                ) : modal === "Check in member" ? (
                  <label>
                    Member
                    <Select name="member" required>
                      <option value="">Select a member…</option>
                      {members.map((m) => (
                        <option key={m.memberId} value={m.name}>{m.name}</option>
                      ))}
                    </Select>
                  </label>
                ) : modal === "Add enquiry" ? (
                  <>
                    <div className="form-row">
                      <label>
                        Lead name
                        <Input name="name" required placeholder="Full name" autoFocus />
                      </label>
                      <label>
                        Phone
                        <Input name="phone" type="tel" required placeholder="+91" />
                      </label>
                    </div>
                    <label>
                      Interested in
                      <Select name="interest">
                        <option>Not sure yet</option>
                        {plans.map((p) => (
                          <option key={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      Source
                      <Select name="source" defaultValue="walk_in">
                        <option value="walk_in">Walk-in</option>
                        <option value="referral">Referral</option>
                        <option value="social">Social media</option>
                        <option value="website">Website</option>
                        <option value="phone">Phone</option>
                        <option value="other">Other</option>
                      </Select>
                    </label>
                  </>
                ) : modal === "Add employee" ? (
                  <>
                    <label>
                      Name
                      <Input name="name" required placeholder="Full name" autoFocus />
                    </label>
                    <div className="form-row">
                      <label>
                        Phone
                        <Input name="phone" type="tel" required placeholder="+91" />
                      </label>
                      <label>
                        Email
                        <Input name="email" type="email" placeholder="Optional" />
                      </label>
                    </div>
                    <label>
                      Role
                      <Select name="role" defaultValue="Trainer">
                        <option>Trainer</option>
                        <option>Front desk</option>
                        <option>Manager</option>
                        <option>Cleaner</option>
                        <option>Other</option>
                      </Select>
                    </label>
                  </>
                ) : modal === "Add expense" ? (
                  <>
                    <div className="form-row">
                      <label>
                        Category
                        <Select name="category" defaultValue="Rent">
                          <option>Rent</option>
                          <option>Utilities</option>
                          <option>Equipment</option>
                          <option>Salaries</option>
                          <option>Marketing</option>
                          <option>Maintenance</option>
                          <option>Other</option>
                        </Select>
                      </label>
                      <label>
                        Amount (₹)
                        <Input name="amount" type="number" min="1" step="1" required placeholder="5000" />
                      </label>
                    </div>
                    <label>
                      Date
                      <Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                    </label>
                    <label>
                      Description
                      <Input name="description" placeholder="e.g. Treadmill belt replacement" />
                    </label>
                  </>
                ) : modal === "Schedule class" ? (
                  <>
                    <label>
                      Class title
                      <Input name="name" required placeholder="Morning yoga" autoFocus />
                    </label>
                    <div className="form-row">
                      <label>
                        Starts at
                        <Input name="starts" type="datetime-local" required />
                      </label>
                      <label>
                        Capacity
                        <Input name="capacity" type="number" min="1" required defaultValue={20} />
                      </label>
                    </div>
                    <label>
                      Duration (minutes)
                      <Input name="duration" type="number" min="15" step="15" required defaultValue={60} />
                    </label>
                  </>
                ) : modal === "Create plan" ? (
                  <>
                    <label>
                      Plan name
                      <Input name="name" required placeholder="e.g. Annual Unlimited" autoFocus />
                    </label>
                    <div className="form-row">
                      <label>
                        Duration (days)
                        <Input name="duration" type="number" min="1" required placeholder="365" />
                      </label>
                      <label>
                        Price (₹)
                        <Input name="price" type="number" min="0" step="1" required placeholder="12000" />
                      </label>
                    </div>
                    <label>
                      Description
                      <textarea name="description" placeholder="What does this plan include?" />
                    </label>
                  </>
                ) : modal === "Freeze memberships" ? (
                  <p>
                    Freeze {selected.length} selected membership(s)? Frozen
                    members keep their remaining days and can be unfrozen any
                    time.
                  </p>
                ) : modal === "Edit member" ? (
                  <>
                    <label>
                      Full name
                      <Input
                        name="name"
                        required
                        defaultValue={profile?.name}
                        autoFocus
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Email address
                        <Input
                          name="email"
                          type="email"
                          defaultValue={profile?.email === "—" ? "" : profile?.email}
                          placeholder="member@email.com"
                        />
                      </label>
                      <label>
                        Phone number
                        <Input
                          name="phone"
                          type="tel"
                          required
                          defaultValue={profile?.phone}
                        />
                      </label>
                    </div>
                    <label>
                      Date of birth
                      <Input type="date" name="dob" />
                    </label>
                    <p>
                      Plan changes are handled through renewals. This edits
                      contact details only.
                    </p>
                  </>
                ) : modal === "Archive member" ? (
                  <p>
                    Archive {profile?.name}? They leave your active list, but
                    their history, payments and attendance stay intact. You can
                    restore them any time.
                  </p>
                ) : modal === "Restore member" ? (
                  <p>
                    Restore {profile?.name} to your active member list?
                  </p>
                ) : modal === "Check out member" ? (
                  <label>
                    Member with an open check-in
                    <Select name="attendance" required>
                      <option value="">Select a member…</option>
                      {openCheckins.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : modal === "Convert enquiry" ? (
                  <>
                    <label>
                      Enquiry
                      <Select name="enquiry" required>
                        <option value="">Select an enquiry…</option>
                        {convertible.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} · {e.phone}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      Membership plan
                      <Select name="plan">
                        <option>Unassigned</option>
                        {plans.map((p) => (
                          <option key={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Start date
                        <Input
                          type="date"
                          name="joined"
                          required
                          defaultValue={new Date().toISOString().slice(0, 10)}
                        />
                      </label>
                      <label>
                        Expiry date
                        <Input type="date" name="expires" required />
                      </label>
                    </div>
                    <div className="integration-note">
                      <Icon name="check" size={15} />
                      The enquiry stays in your history, marked as converted.
                    </div>
                  </>
                ) : module ? (
                  module.columns.map((c, i) => (
                    <label key={c}>
                      {c}
                      <Input
                        required
                        name={`field${i}`}
                        placeholder={`Enter ${c.toLowerCase()}`}
                      />
                    </label>
                  ))
                ) : (
                  <>
                    <label>
                      {modal === "Create group" ? "Group name" : "Name"}
                      <Input
                        name="name"
                        required
                        placeholder={
                          modal === "Create group"
                            ? "e.g. Weekend runners"
                            : "Enter a name"
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        required
                        placeholder="Add details..."
                      />
                    </label>
                  </>
                )}
                {modalError && (
                  <div className="auth-alert" role="alert" style={{ margin: 0 }}>
                    {modalError}
                  </div>
                )}
                <div className="modal-footer">
                  <Button secondary type="button" onClick={() => setModal("")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={modalBusy}>
                    {modalBusy
                      ? "Saving…"
                      : modal === "Add member"
                        ? "Add member"
                        : modal === "Create plan"
                          ? "Create plan"
                          : modal === "Freeze memberships"
                            ? "Freeze memberships"
                            : modal === "Archive member"
                              ? "Archive member"
                              : modal === "Restore member"
                                ? "Restore member"
                                : modal === "Check out member"
                                  ? "Check out"
                                  : modal === "Convert enquiry"
                                    ? "Convert to member"
                                    : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
