import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Icon } from "./icons"
import { Avatar, Badge, Button, Input, Select, Stats, Title } from "@/components/kit"
import { SummaryBoard } from "@/components/SummaryBoard"
import { MemberCard, MemberCardSkeleton } from "@/components/MemberCard"
import { HoldButton } from "@/components/HoldButton"
import { useNavigate, useParams } from "react-router-dom"
import { FloatingDock } from "@/components/ui/floating-dock"
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar"
import RubberSegment from "@/components/ui/RubberSegment"
import BellToggle from "@/components/ui/BellToggle"
import Manual from "@/pages/Manual"
import ShareSheet from "@/components/ui/share-sheet"
import SlideCommit from "@/components/ui/SlideCommit"
import SocialFlipButton from "@/components/ui/social-flip-button"
import {
  DEFAULT_CATEGORY,
  DEFAULT_ITEM,
  NAV_CATEGORIES,
  categoryOfLabel,
  itemById,
  itemByLabel,
  pathFor,
} from "@/lib/navigation"
import { useAuth } from "@/lib/auth"
import { useOrg } from "@/lib/org"
import { usePlatformAdmin } from "@/lib/use-platform-admin"
import {
  DEFAULT_THEME,
  applyTheme,
  themeFromOrg,
  type ThemeMode,
  type WorkspaceTheme,
} from "@/lib/theme"
import * as api from "@/lib/api"
import {
  ageFromDob,
  daysUntil,
  formatDate,
  formatMoney,
  type AppNotification,
  type AttendanceRecord,
  type ClassBookingRow,
  type DashboardStats,
  type DietPlanListRow,
  type Enquiry,
  type FitnessMeasurement,
  type GymClass,
  type InvoiceListRow,
  type MembershipPlan,
  type MembershipRenewal,
  type MemberInternalNote,
  type MemberMembership,
  type OrgMemberRow,
  type OrgRole,
  type Payment,
  type PaymentMethod,
  type ReportMonth,
  type StaffMember,
  type WorkoutPlanListRow,
} from "@/lib/types"

const descriptions: Record<string, string> = {
  "Workspace manual":
    "Setup, the daily modules, and the limits worth knowing before you rely on them.",
  Members: "A little more personal. Manage every member, all in one place.",
  Overview: "Your gym at a glance. Here’s what’s happening today.",
  Reports: "Every month side by side, straight from your records.",
  Community: "Keep your members connected, in and out of the gym.",
  Memberships: "Flexible plans that grow with your members.",
  Payments: "Every payment, receipt, and outstanding balance in one place.",
  "Trainers & staff": "The people who keep your gym moving.",
  Payroll: "Stay on top of salaries, commissions, and incentives.",
  Marketplace: "Equip your next chapter. Sourced for gym owners.",
  Settings: "Make this workspace feel like your gym, not a template.",
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
  photo?: string
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
    action: "Log follow-up",
    columns: ["Lead", "Phone", "Interested in", "Follow-up date", "Status"],
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
  Invoices: {
    sub: "Bill members, track what is owed, settle against payments",
    action: "Raise invoice",
    columns: ["Invoice", "Member", "Issued", "Due", "Total", "Status"],
    rows: [],
    stats: [],
  },
  "Trainers & staff": {
    sub: "Schedules, responsibilities, and the people behind them",
    action: "Add employee",
    columns: ["Employee", "Role", "Contact", "Joined", "Status"],
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
    columns: ["Workout plan", "Goal", "Exercises", "Assigned to", "Status"],
    rows: [],
    stats: [],
  },
  "Diet & nutrition": {
    sub: "Practical nutrition plans for real progress",
    action: "Create diet plan",
    columns: ["Plan", "Daily calories", "Protein", "Assigned to", "Status"],
    rows: [],
    stats: [],
  },
  Reminders: {
    sub: "Thoughtful nudges, fewer missed renewals",
    action: "Create reminder",
    columns: ["Reminder", "Detail", "Type", "Created", "Status"],
    rows: [],
    stats: [],
  },
  Branches: {
    sub: "One business. Every location in view.",
    action: "Add branch",
    columns: ["Branch", "Address", "Scope", "Status"],
    rows: [],
    stats: [],
  },
  "Access & roles": {
    sub: "The right access for every role",
    action: "Change role",
    columns: ["Role", "People", "Permissions", "Scope", "Status"],
    rows: [],
    stats: [],
  },
}

export default function App() {
  const mainRef = useRef<HTMLElement>(null)
  const { session, signOut } = useAuth()
  const { org, reload: reloadOrg } = useOrg()
  const { role: platformRole } = usePlatformAdmin()
  // The active module and its category derive from the URL (/app/:category/:module),
  // so direct links, refresh and back/forward all keep the same selection.
  const navigate = useNavigate()
  const { module: moduleSlug } = useParams()
  const activeItem = moduleSlug ? itemById(moduleSlug) : undefined
  const active = activeItem?.label ?? DEFAULT_ITEM.label
  const activeCat = activeItem
    ? (categoryOfLabel(activeItem.label) ?? DEFAULT_CATEGORY)
    : DEFAULT_CATEGORY
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
  const [allPlans, setAllPlans] = useState<MembershipPlan[]>([])
  const [editPlan, setEditPlan] = useState<MembershipPlan | null>(null)
  const [staffNames, setStaffNames] = useState<Record<string, string>>({})
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [enquiryList, setEnquiryList] = useState<Enquiry[]>([])
  const [roster, setRoster] = useState<OrgMemberRow[]>([])
  const [reminders, setReminders] = useState<AppNotification[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanListRow[]>([])
  const [dietPlans, setDietPlans] = useState<DietPlanListRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([])
  const [classes, setClasses] = useState<GymClass[]>([])
  const [classBookings, setClassBookings] = useState<ClassBookingRow[]>([])
  // Contents of the plan whose Details modal is open. Keyed by plan name so a
  // slow fetch for one plan can never render under another plan's heading.
  const [planDetail, setPlanDetail] = useState<{ name: string; lines: string[] } | null>(null)
  const [removingWorkspace, setRemovingWorkspace] = useState(false)
  const [reports, setReports] = useState<ReportMonth[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [pendingTarget, setPendingTarget] = useState("")
  const [profileVisits, setProfileVisits] = useState<AttendanceRecord[]>([])
  const [profilePayments, setProfilePayments] = useState<Payment[]>([])
  const [profileMemberships, setProfileMemberships] = useState<MemberMembership[]>([])
  const [profileRenewals, setProfileRenewals] = useState<MembershipRenewal[]>([])
  const [profileNotes, setProfileNotes] = useState<MemberInternalNote[]>([])
  const [profileMeasurements, setProfileMeasurements] = useState<FitnessMeasurement[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dbError, setDbError] = useState("")
  const branch = org?.branch?.name ?? "Main branch"
  const [accountOpen, setAccountOpen] = useState(false)
  // Signup stores full_name in user metadata; fall back to the email local part.
  const accountMeta = session?.user?.user_metadata as
    | { full_name?: string }
    | undefined
  const accountName =
    accountMeta?.full_name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Your account"
  useEffect(() => {
    if (!accountOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [accountOpen])
  const [bellOpen, setBellOpen] = useState(false)
  useEffect(() => {
    if (!bellOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [bellOpen])
  // Marking read only touches read_at, so patch the row locally instead of
  // reloading every table in the workspace.
  const unreadCount = reminders.filter((r) => !r.read_at).length
  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, read_at: new Date().toISOString() } : r,
        ),
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not mark it read")
    }
  }
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
    const target = itemByLabel(name)
    navigate(target ? pathFor(target) : pathFor(DEFAULT_ITEM))
    setQuery("")
    setSelected([])
    setPage(1)
    // Re-run the module loader so tables show fresh rows after same-page writes
    setModuleTick((t) => t + 1)
  }
  // Booking status changes happen inside the Details modal, which has no form.
  // Refetch rather than patching local state, so the class count and the
  // attendee list can never drift apart.
  const updateBooking = async (
    bookingId: string,
    status: "booked" | "attended" | "cancelled",
  ) => {
    try {
      await api.setClassBookingStatus(bookingId, status)
      notify(
        status === "cancelled"
          ? "Seat released"
          : status === "attended"
            ? "Marked attended"
            : "Marked booked",
      )
      setModuleTick((t) => t + 1)
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not update that booking")
    }
  }

  // ---- Real data loading (org-scoped; RLS enforces the same scope) ----
  const reload = async () => {
    if (!org) return
    const orgId = org.organization.id
    try {
      setDbError("")
      const [
        dbMembers,
        dbMemberships,
        dbPlans,
        allDbPlans,
        pending,
        dbStats,
        staff,
        dbEnquiries,
        dbRoster,
        dbReminders,
        dbReports,
      ] = await Promise.all([
        // shortcut: loads up to 500 members and paginates client-side;
        // switch to server-side offset paging when a gym exceeds that
        api.listMembers(orgId, { limit: 500 }),
        api.listMemberships(orgId),
        api.listPlans(orgId),
        api.listPlans(orgId, { includeInactive: true }),
        api.listPayments(orgId, { status: "pending" }),
        api.loadDashboardStats(org),
        api.listStaff(orgId),
        api.listEnquiries(orgId),
        api.listOrgMembers(orgId).catch(() => []),
        api.listNotifications(orgId).catch(() => []),
        api.loadMonthlyReports(orgId, 6),
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
          photo: row.photo_url ?? undefined,
        }
      })
      setMembers(rows)
      setPlans(dbPlans)
      setAllPlans(allDbPlans)
      setStaffList(staff)
      setEnquiryList(dbEnquiries)
      setRoster(dbRoster)
      setReminders(dbReminders)
      setReports(dbReports)
      setPendingPayments(pending)
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

  // Visits, payments and memberships for whoever's drawer is open; cleared so
  // one member's history never shows while another's is loading.
  useEffect(() => {
    const memberId = profile?.memberId
    if (!org || !memberId) {
      setProfileVisits([])
      setProfilePayments([])
      setProfileMemberships([])
      setProfileRenewals([])
      setProfileNotes([])
      setProfileMeasurements([])
      return
    }
    const orgId = org.organization.id
    let cancelled = false
    api
      .listMemberAttendance(orgId, memberId, 10)
      .then((visits) => { if (!cancelled) setProfileVisits(visits) })
      .catch(() => { if (!cancelled) setProfileVisits([]) })
    api
      .listPayments(orgId, { memberId, limit: 20 })
      .then((rows) => { if (!cancelled) setProfilePayments(rows) })
      .catch(() => { if (!cancelled) setProfilePayments([]) })
    api
      .listMembershipsForMember(orgId, memberId)
      .then((rows) => { if (!cancelled) setProfileMemberships(rows) })
      .catch(() => { if (!cancelled) setProfileMemberships([]) })
    api
      .listRenewals(orgId, memberId, 10)
      .then((rows) => { if (!cancelled) setProfileRenewals(rows) })
      .catch(() => { if (!cancelled) setProfileRenewals([]) })
    api
      .listInternalNotes(orgId, memberId, 20)
      .then((rows) => { if (!cancelled) setProfileNotes(rows) })
      .catch(() => { if (!cancelled) setProfileNotes([]) })
    api
      .listMeasurements(orgId, memberId, 10)
      .then((rows) => { if (!cancelled) setProfileMeasurements(rows) })
      .catch(() => { if (!cancelled) setProfileMeasurements([]) })
    return () => { cancelled = true }
  }, [org, profile?.memberId, moduleTick])

  // A training plan's contents live in child tables, so the Details modal
  // fetches them on open instead of carrying them in every directory row.
  useEffect(() => {
    if (!modal.startsWith("Details:")) {
      setPlanDetail(null)
      return
    }
    const name = modal.slice(9)
    let cancelled = false
    setPlanDetail(null)
    if (active === "Workouts") {
      const plan = workoutPlans.find((p) => p.name === name)
      if (!plan) return
      api
        .listWorkoutExercises(plan.id)
        .then((rows) => {
          if (cancelled) return
          setPlanDetail({
            name,
            lines: rows.map((e) =>
              [
                e.day_label,
                e.exercise_name,
                e.sets && e.reps ? `${e.sets} × ${e.reps}` : null,
                e.rest_seconds ? `${e.rest_seconds}s rest` : null,
              ]
                .filter(Boolean)
                .join(" · "),
            ),
          })
        })
        .catch(() => { if (!cancelled) setPlanDetail(null) })
    } else if (active === "Diet & nutrition") {
      const plan = dietPlans.find((p) => p.name === name)
      if (!plan) return
      api
        .listDietMeals(plan.id)
        .then((rows) => {
          if (cancelled) return
          setPlanDetail({
            name,
            lines: rows.flatMap((m) => [
              [m.name, m.timing].filter(Boolean).join(" · "),
              ...m.items.map((it) =>
                `   ${it.food_item}${it.portion ? ` (${it.portion})` : ""}`,
              ),
            ]),
          })
        })
        .catch(() => { if (!cancelled) setPlanDetail(null) })
    }
    return () => { cancelled = true }
  }, [modal, active, workoutPlans, dietPlans])

  // The workspace appearance lives on the organization row, so every member of
  // the gym sees the owner's choice. Applied on the document root.
  const [theme, setTheme] = useState<WorkspaceTheme>(DEFAULT_THEME)
  // Client-side guard for the controls only: the write itself is enforced by the
  // "org update owner" RLS policy, so staff edits still fail server-side.
  const isOwner = org?.role === "owner"
  // The employee record linked to the signed-in login. Only a trainer's view is
  // scoped by it, but resolving it here keeps one lookup as the single source.
  const myStaff = session
    ? staffList.find((s) => s.user_id === session.user.id)
    : undefined
  useEffect(() => {
    const next = org ? themeFromOrg(org.organization) : DEFAULT_THEME
    setTheme(next)
    applyTheme(next)
  }, [org])

  // Applies instantly; saving persists the mode for the whole gym.
  const updateTheme = (patch: Partial<WorkspaceTheme>) => {
    setTheme((current) => {
      const next = { ...current, ...patch }
      applyTheme(next)
      return next
    })
  }
  const saveTheme = async (next: WorkspaceTheme = theme) => {
    if (!org) return
    try {
      await api.saveOrganizationTheme(org.organization.id, {
        mode: next.mode,
      })
      reloadOrg()
      notify("Appearance saved")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not save the appearance",
      )
    }
  }

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
          const [allRows, bookings] = await Promise.all([
            api.listClasses(orgId),
            api.listClassBookings(orgId),
          ])
          // A trainer sees the classes they are assigned to, matched through
          // staff.user_id. Owners, managers and front desk still see everything.
          // An unlinked trainer gets an empty list, never the whole org's.
          // shortcut: classes with no trainer stay invisible to trainers; give
          // them a claim action if unassigned shifts ever pile up.
          const rows =
            org.role !== "trainer"
              ? allRows
              : myStaff
                ? allRows.filter((r) => r.trainer_id === myStaff.id)
                : []
          setClasses(rows)
          setClassBookings(bookings)
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
              `${
                bookings.filter(
                  (b) => b.class_id === r.id && b.status !== "cancelled",
                ).length
              } / ${r.capacity}`,
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
            ]),
          }))
        } else if (active === "Branches") {
          const rows = await api.listBranches(orgId)
          setRecords((prev) => ({
            ...prev,
            Branches: rows.map((r) => [
              r.name,
              r.address || "—",
              r.is_primary ? "Primary" : "Branch",
              r.is_archived ? "Archived" : "Active",
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
        } else if (active === "Follow-ups") {
          const rows = enquiryList.filter(
            (r) => r.status === "follow_up" || r.status === "contacted",
          )
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")
          setRecords((prev) => ({
            ...prev,
            "Follow-ups": rows.map((r) => [
              r.name,
              r.phone,
              r.interest || "—",
              r.follow_up_date ? formatDate(r.follow_up_date) : "—",
              cap(r.status),
            ]),
          }))
        } else if (active === "Reminders") {
          setRecords((prev) => ({
            ...prev,
            Reminders: reminders.map((r) => [
              r.title,
              r.body || "—",
              r.type.charAt(0).toUpperCase() + r.type.slice(1),
              formatDate(r.created_at),
              r.read_at ? "Read" : "Unread",
            ]),
          }))
        } else if (active === "Access & roles") {
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
          setRecords((prev) => ({
            ...prev,
            "Access & roles": roster.map((r) => [
              cap(r.role),
              r.full_name,
              r.email || "—",
              "Workspace",
              "Active",
            ]),
          }))
        } else if (active === "Payments") {
          const rows = await api.listPayments(orgId, { limit: 100 })
          // Open invoices, so a receipt can be applied to one.
          setInvoices(await api.listInvoices(orgId))
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
              r.email || r.phone || "—",
              formatDate(r.joined_on),
              r.employment_status === "inactive" ? "Inactive" : "Active",
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
        } else if (active === "Workouts") {
          const plans = await api.listWorkoutPlans(orgId, { includeArchived: true })
          setWorkoutPlans(plans)
          const assignees = (
            rows: { status: string; member: { first_name: string; last_name: string } | null }[],
          ) => {
            const names = rows
              .filter((a) => a.status === "active")
              .map((a) => `${a.member?.first_name ?? ""} ${a.member?.last_name ?? ""}`.trim())
              .filter(Boolean)
            if (!names.length) return "Unassigned"
            return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]
          }
          setRecords((prev) => ({
            ...prev,
            Workouts: plans.map((r) => [
              r.name,
              r.goal || "—",
              String(r.exercises[0]?.count ?? 0),
              assignees(r.assignments),
              r.is_archived ? "Archived" : "Active",
            ]),
          }))
        } else if (active === "Diet & nutrition") {
          const plans = await api.listDietPlans(orgId, { includeArchived: true })
          setDietPlans(plans)
          const assignees = (
            rows: { status: string; member: { first_name: string; last_name: string } | null }[],
          ) => {
            const names = rows
              .filter((a) => a.status === "active")
              .map((a) => `${a.member?.first_name ?? ""} ${a.member?.last_name ?? ""}`.trim())
              .filter(Boolean)
            if (!names.length) return "Unassigned"
            return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]
          }
          setRecords((prev) => ({
            ...prev,
            "Diet & nutrition": plans.map((r) => [
              r.name,
              r.target_calories ? String(r.target_calories) : "—",
              r.target_protein_g ? `${r.target_protein_g} g` : "—",
              assignees(r.assignments),
              r.is_archived ? "Archived" : "Active",
            ]),
          }))
        } else if (active === "Invoices") {
          const rows = await api.listInvoices(orgId)
          setInvoices(rows)
          const statusOf = (r: InvoiceListRow) => {
            if (r.status === "void") return "Void"
            const paid = r.payments
              .filter((p) => p.status === "paid")
              .reduce((sum, p) => sum + p.amount_minor, 0)
            if (paid >= r.total_minor) return "Paid"
            return paid > 0 ? "Partial" : "Issued"
          }
          setRecords((prev) => ({
            ...prev,
            Invoices: rows.map((r) => [
              r.invoice_number,
              r.member
                ? `${r.member.first_name} ${r.member.last_name}`.trim()
                : "Member",
              formatDate(r.issued_on),
              r.due_on ? formatDate(r.due_on) : "—",
              formatMoney(r.total_minor, org.organization.currency),
              statusOf(r),
            ]),
          }))
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : `Could not load ${active}`)
      }
    }
    loadModule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, org, members.length, moduleTick, enquiryList, reminders, roster, staffList.length])
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
  // Overview's one-line answer: the fact in today's data that needs a human.
  // Derived from the same stats the board prints, so the two never disagree.
  const summary = !stats
    ? "Loading today's figures."
    : stats.totalMembers === 0
      ? "No members yet. Add the first one and these figures start counting."
      : stats.expiringSoon > 0
        ? `${stats.expiringSoon} ${stats.expiringSoon === 1 ? "membership ends" : "memberships end"} in the next 7 days.`
        : stats.pendingPaymentsMinor > 0
          ? `${formatMoney(stats.pendingPaymentsMinor, org?.organization.currency)} in dues is still outstanding.`
          : "Every membership is current and nothing is due this week."
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
        : active === "Reports"
          ? [
              ["Month", "Collected", "Pending", "Expenses", "Visits", "New members"],
              ...reports.map((r) => [
                r.label,
                formatMoney(r.collectedMinor, org?.organization.currency),
                formatMoney(r.pendingMinor, org?.organization.currency),
                formatMoney(r.expensesMinor, org?.organization.currency),
                String(r.visits),
                String(r.newMembers),
              ]),
            ]
          : [
              modules[active]?.columns || ["Name"],
              ...(modules[active]?.rows || []),
              ...(records[active] || []),
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
  // Mirrors the RLS write roles in 0001_init.sql so the UI explains a refusal
  // before the request fails. The database stays the real boundary.
  const writeRoles: Record<string, OrgRole[]> = {
    Overview: ["owner", "manager", "receptionist"],
    Members: ["owner", "manager", "receptionist"],
    Memberships: ["owner", "manager"],
    Attendance: ["owner", "manager", "receptionist", "trainer"],
    "Classes & PT": ["owner", "manager", "trainer"],
    Enquiries: ["owner", "manager", "receptionist"],
    "Follow-ups": ["owner", "manager", "receptionist"],
    Payments: ["owner", "manager", "receptionist", "finance"],
    // Mirrors 0006: invoice insert = owner/manager/finance/receptionist,
    // update (void) = owner/manager/finance.
    Invoices: ["owner", "manager", "finance", "receptionist"],
    "Trainers & staff": ["owner", "manager"],
    Expenses: ["owner", "manager", "finance"],
    // Mirrors 0001: branches are written by owner and manager.
    Branches: ["owner", "manager"],
    // Mirrors 0006: plan write = owner/manager/trainer, measurements = those
    // plus receptionist.
    Workouts: ["owner", "manager", "trainer"],
    "Diet & nutrition": ["owner", "manager", "trainer"],
    // Every role may file their own in-app reminder (migration 0004).
    Reminders: ["owner", "manager", "trainer", "receptionist", "finance"],
    "Access & roles": ["owner"],
  }
  const canWrite = !!org && (writeRoles[active]?.includes(org.role) ?? false)
  return (
    <div className={`app ${active === "Overview" ? "summary-view" : ""}`}>
      <nav className="app-side-nav" aria-label="Main navigation">
        <FloatingDock
          vertical
          activeTitle={activeCat.label}
          desktopClassName="app-side-floating-dock"
          mobileClassName="app-side-mobile"
          items={NAV_CATEGORIES.map((c) => ({
            title: c.label,
            icon: <Icon name={c.icon} size={22} />,
            href: pathFor(c.items[0]),
          }))}
        />
      </nav>
      <header className="unified-header">
        <div className="uh-nav" role="navigation" aria-label={`${activeCat.label} sections`}>
          {(() => {
            // Overview lives in the left sidebar only; don't duplicate it here.
            const items = activeCat.items.filter((it) => it.id !== "overview");
            if (!items.length) return null;
            const index = Math.max(0, items.findIndex((it) => it.label === active));
            return (
              <SpotlightNavbar
                key={`${activeCat.id}:${active}`}
                items={items.map((it) => ({ label: it.label, href: pathFor(it) }))}
                onItemClick={(it) => go(it.label)}
                defaultActiveIndex={index}
              />
            );
          })()}
        </div>
        <div className="top-actions">
            <div className="bell-menu">
              <BellToggle
                label="Notifications"
                offLabel=""
                onLabel=""
                size="sm"
                radius={18}
                color="var(--text-2)"
                background="transparent"
                onColor="var(--text)"
                onBackground="transparent"
                badgeColor="var(--err)"
                count={unreadCount}
                waves={false}
                defaultPressed={unreadCount > 0}
                onChange={() => {
                  setAccountOpen(false)
                  setBellOpen((open) => !open)
                }}
              />
              {bellOpen && (
                <>
                  <div
                    className="account-backdrop"
                    onClick={() => setBellOpen(false)}
                  />
                  <div
                    id="reminders-panel"
                    className="account-panel bell-panel"
                    role="region"
                    aria-label="Reminders"
                  >
                    <div className="bell-head">
                      <strong>Reminders</strong>
                      <span>{unreadCount ? `${unreadCount} unread` : "All read"}</span>
                    </div>
                    {reminders.length ? (
                      <div className="bell-list">
                        {reminders.slice(0, 8).map((r) => (
                          <div
                            className={r.read_at ? "bell-item read" : "bell-item"}
                            key={r.id}
                          >
                            <strong>{r.title}</strong>
                            {r.body && <p>{r.body}</p>}
                            <div className="bell-meta">
                              <span>
                                {r.type.charAt(0).toUpperCase() + r.type.slice(1)} ·{" "}
                                {formatDate(r.created_at)}
                              </span>
                              {r.read_at ? (
                                <span>Read</span>
                              ) : (
                                <button onClick={() => markRead(r.id)}>
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="bell-empty">
                        No reminders yet. Reminders you create are in-app only;
                        nothing is sent by SMS, email or push.
                      </p>
                    )}
                    <button
                      className="bell-all"
                      onClick={() => {
                        setBellOpen(false)
                        go("Reminders")
                      }}
                    >
                      Open the reminders table
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="account-menu">
              <button
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                className="account-trigger"
                onClick={() => {
                  setBellOpen(false)
                  setAccountOpen((open) => !open)
                }}
              >
                <Avatar name={accountName} small />
                <span className="account-name" title={accountName}>
                  {accountName}
                </span>
              </button>
              {accountOpen && (
                <>
                  <div
                    className="account-backdrop"
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="account-panel" role="menu">
                    <div className="account-panel-head">
                      <Avatar name={accountName} small />
                      <div>
                        <strong>{accountName}</strong>
                        <span className="account-role-text">{org?.role ?? "owner"}</span>
                      </div>
                    </div>
                    {platformRole === "super_admin" && (
                      <a
                        className="account-link"
                        role="menuitem"
                        href="/super-admin"
                        onClick={() => setAccountOpen(false)}
                      >
                        <Icon name="shield" size={14} />
                        Platform admin
                      </a>
                    )}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false)
                        go("Settings")
                      }}
                    >
                      <Icon name="settings" size={15} />
                      Workspace settings
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false)
                        go("Access & roles")
                      }}
                    >
                      <Icon name="shield" size={15} />
                      Access & roles
                    </button>
                    <button
                      role="menuitem"
                      className="account-signout"
                      onClick={() => {
                        setAccountOpen(false)
                        void signOut()
                      }}
                    >
                      <Icon name="arrow" size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="main-shell">
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
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {(org?.organization.name ?? "YOUR GYM").toUpperCase()} <span>/</span> {branch.toUpperCase()}
              </div>
              <h1>{active === "Members" ? "Members" : active}</h1>
              <p>
                {active === "Overview" && summary
                  ? summary
                  : descriptions[active] ||
                    module?.sub ||
                    "One connected workspace for your gym."}
              </p>
            </div>
            <div className="heading-actions">
              {![
                "Community",
                "Marketplace",
                "Member app",
                "Settings",
                "Workspace manual",
              ].includes(active) && (
                <Button secondary onClick={exportData}>
                  <Icon name="arrow" size={15} />
                  Export
                </Button>
              )}
              {!["Settings", "Reports", "Workspace manual"].includes(active) && (
                <Button
                disabled={!canWrite}
                title={canWrite ? undefined : "Your role cannot add records here"}
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
              )}
            </div>
          </div>

          {active === "Workspace manual" && <Manual />}

          {active === "Overview" && <SummaryBoard
            stats={stats}
            reports={reports}
            currency={org?.organization.currency ?? "INR"}
            members={members}
            loading={loadingData}
            onAddMember={() => setModal("Add member")}
            onOpenMembers={() => go("Members")}
            onOpenPayments={() => go("Payments")}
          />}

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
                <RubberSegment
                  className="directory-tabs"
                  items={[
                    "All members",
                    "Active",
                    "Expiring soon",
                    "Expired",
                    "Frozen",
                  ].map((t: string) => ({
                    value: t,
                    label: (
                      <>
                        {t}
                        <span className="segment-count">
                          {t === "All members"
                            ? members.length
                            : members.filter((m) => m.status === t).length}
                        </span>
                      </>
                    ),
                  }))}
                  value={tab}
                  onChange={(t: string) => {
                    setTab(t);
                    setSelected([]);
                    setPage(1);
                  }}
                  size="sm"
                  radius={999}
                  trackColor="transparent"
                  thumbColor="color-mix(in srgb, var(--card-solid) 62%, transparent)"
                  textColor="var(--text-3)"
                  activeTextColor="var(--text)"
                />
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
                {!loadingData && !dbError && paged.length > 0 && (
                  <div className="grid-bar">
                    <label className="grid-select-all">
                      <input
                        type="checkbox"
                        checked={
                          paged.length > 0 &&
                          paged.every((m) => selected.includes(m.name))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? Array.from(
                                  new Set([...selected, ...paged.map((m) => m.name)]),
                                )
                              : selected.filter(
                                  (n) => !paged.some((m) => m.name === n),
                                ),
                          )
                        }
                      />
                      Select this page
                    </label>
                    <span className="grid-count">
                      {paged.length} member{paged.length === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                {loadingData ? (
                  <div className="member-grid" aria-busy="true">
                    {Array.from({ length: 8 }, (_, i) => (
                      <MemberCardSkeleton key={i} />
                    ))}
                  </div>
                ) : dbError ? (
                  <div className="empty member-grid-empty">
                    <p>{dbError}</p>
                    <Button secondary onClick={() => reload()}>
                      Retry
                    </Button>
                  </div>
                ) : !filtered.length ? (
                  <div className="empty member-grid-empty">
                    <span className="empty-mark" aria-hidden="true">
                      {members.length ? "∅" : "+"}
                    </span>
                    <p>
                      {members.length
                        ? "No members match your filters."
                        : "No members yet. Add your first member to get started."}
                    </p>
                    {members.length ? (
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
                    ) : (
                      <Button onClick={() => setModal("Add member")}>
                        Add your first member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="member-grid">
                    {paged.map((m) => (
                      <MemberCard
                        key={m.memberId ?? m.email}
                        member={m}
                        selected={selected.includes(m.name)}
                        onSelect={(name) =>
                          setSelected((prev) =>
                            prev.includes(name)
                              ? prev.filter((n) => n !== name)
                              : [...prev, name],
                          )
                        }
                        onOpen={() => setProfile(m)}
                        onEdit={() => {
                          setProfile(m)
                          setModal("Edit member")
                        }}
                        onArchive={() => {
                          setProfile(m)
                          setModal(
                            m.status === "Archived"
                              ? "Restore member"
                              : "Archive member",
                          )
                        }}
                      />
                    ))}
                  </div>
                )}
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

          {active === "Reports" && (
            <section className="directory">
              <div className="module-table-heading">
                <div>
                  <Title>Monthly performance</Title>
                  <p>
                    Last {reports.length} months, from payments, expenses,
                    attendance and new joiners.
                  </p>
                </div>
                <Badge>{reports.some((r) => r.visits + r.collectedMinor) ? "Saved" : "No data"}</Badge>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Collected</th>
                      <th>Pending</th>
                      <th>Expenses</th>
                      <th>Visits</th>
                      <th>New members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.month}>
                        <td>{r.label}</td>
                        <td>{formatMoney(r.collectedMinor, org?.organization.currency)}</td>
                        <td>{formatMoney(r.pendingMinor, org?.organization.currency)}</td>
                        <td>{formatMoney(r.expensesMinor, org?.organization.currency)}</td>
                        <td>{r.visits}</td>
                        <td>{r.newMembers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="empty">
                    No payments, expenses, attendance or joins recorded yet.
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>All records · {branch}</span>
                <span>Counts every payment, expense and check-in on record</span>
              </div>
            </section>
          )}

          {active === "Memberships" && <section className="panel">{allPlans.length ? allPlans.map((p) => <div className="summary-line" key={p.id}><strong>{p.name}</strong><span>{p.duration_days} days · {formatMoney(p.price_minor, org?.organization.currency)}{p.is_active ? "" : " · Archived"}</span><Button secondary disabled={!canWrite} title={canWrite ? undefined : "Your role cannot edit plans"} onClick={() => { setEditPlan(p); setModal("Edit plan") }}>Edit</Button></div>) : <div className="workspace-empty"><Icon name="calendar" size={32} /><Title>No membership plans yet</Title><p>Create your first plan to get started.</p><Button onClick={() => setModal("Create plan")}>Create plan</Button></div>}</section>}

          {active === "Community" && <section className="panel workspace-empty"><Icon name="members" size={32} /><Title>No community conversations yet</Title><p>No groups, members, or messages have been added. Live chat, calls, and encrypted delivery require a connected service.</p><Button secondary onClick={() => setModal("Create group")}>Draft a group</Button></section>}

          {module && active !== "Reports" && (
            <>
              {["Payments", "Reminders", "Access & roles"].includes(active) && (
                <div className="integration-note">
                  <Icon name="settings" size={15} />
                  {active === "Payments"
                    ? "Payments are saved to your workspace. Online gateway collection is not connected — record only payments you have actually received."
                    : active === "Reminders"
                      ? "Reminders are in-app notifications, visible to whoever they are assigned to. Nothing is sent by SMS, email or push."
                      : "Roles are enforced by the database. Changing a role takes effect for that person on their next sign-in."}
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
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {active === "Attendance" && (
                      <Button
                        secondary
                        disabled={!openCheckins.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot change attendance"
                            : openCheckins.length
                              ? undefined
                              : "No member is currently checked in"
                        }
                        onClick={() => setModal("Check out member")}
                      >
                        Check out member
                      </Button>
                    )}
                    {active === "Enquiries" && (
                      <Button
                        secondary
                        disabled={!enquiryList.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot update enquiries"
                            : enquiryList.length
                              ? undefined
                              : "No enquiries to update"
                        }
                        onClick={() => setModal("Update enquiry")}
                      >
                        Update status
                      </Button>
                    )}
                    {active === "Enquiries" && (
                      <Button
                        secondary
                        disabled={!convertible.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot convert enquiries"
                            : convertible.length
                              ? undefined
                              : "No open enquiry to convert"
                        }
                        onClick={() => setModal("Convert enquiry")}
                      >
                        Convert to member
                      </Button>
                    )}
                    {active === "Trainers & staff" && (
                      <Button
                        secondary
                        disabled={!staffList.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot edit staff"
                            : staffList.length
                              ? undefined
                              : "No staff records to edit"
                        }
                        onClick={() => setModal("Edit employee")}
                      >
                        Edit employee
                      </Button>
                    )}
                    {active === "Payments" && (
                      <Button
                        secondary
                        disabled={!pendingPayments.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot settle payments"
                            : pendingPayments.length
                              ? undefined
                              : "No pending payments to settle"
                        }
                        onClick={() => setModal("Settle payment")}
                      >
                        Settle payment
                      </Button>
                    )}
                    {active === "Invoices" && (
                      <Button
                        secondary
                        disabled={!invoices.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot void invoices"
                            : invoices.length
                              ? undefined
                              : "Raise an invoice first"
                        }
                        onClick={() => setModal("Void invoice")}
                      >
                        Void invoice
                      </Button>
                    )}
                    {active === "Workouts" && (
                      <Button
                        secondary
                        disabled={!workoutPlans.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot assign workout plans"
                            : workoutPlans.length
                              ? undefined
                              : "Create a workout plan first"
                        }
                        onClick={() => setModal("Assign workout plan")}
                      >
                        Assign to member
                      </Button>
                    )}
                    {active === "Diet & nutrition" && (
                      <Button
                        secondary
                        disabled={!dietPlans.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot assign diet plans"
                            : dietPlans.length
                              ? undefined
                              : "Create a diet plan first"
                        }
                        onClick={() => setModal("Assign diet plan")}
                      >
                        Assign to member
                      </Button>
                    )}
                    {active === "Classes & PT" && (
                      <Button
                        secondary
                        disabled={!classes.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot manage class bookings"
                            : classes.length
                              ? undefined
                              : "Schedule a class first"
                        }
                        onClick={() => setModal("Book member")}
                      >
                        Book member
                      </Button>
                    )}
                    {active === "Workouts" && (
                      <Button
                        secondary
                        disabled={!workoutPlans.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot edit workout plans"
                            : workoutPlans.length
                              ? undefined
                              : "Create a workout plan first"
                        }
                        onClick={() => setModal("Add exercise")}
                      >
                        Add exercise
                      </Button>
                    )}
                    {active === "Diet & nutrition" && (
                      <Button
                        secondary
                        disabled={!dietPlans.length || !canWrite}
                        title={
                          !canWrite
                            ? "Your role cannot edit diet plans"
                            : dietPlans.length
                              ? undefined
                              : "Create a diet plan first"
                        }
                        onClick={() => setModal("Add meal")}
                      >
                        Add meal
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
                  {!(records[active] || []).length && (
                    <div className="empty">
                      {active === "Classes & PT" && org?.role === "trainer"
                        ? myStaff
                          ? "No classes are assigned to you yet."
                          : "Your login is not linked to an employee record, so no schedule can be shown. Ask the owner to link it under Trainers & staff."
                        : "No records yet. Use the add button to create your first entry."}
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>All records · {branch}</span>
                </div>
              </section>
            </>
          )}

          {active === "Marketplace" && <section className="panel workspace-empty"><Icon name="shop" size={32} /><Title>No products available</Title><p>A supplier catalog is not connected. Products, pricing, ratings, and ordering will appear once a real catalog is available.</p></section>}

          {active === "Member app" && (
            <>
              <section className="panel workspace-empty"><Icon name="members" size={32} /><Title>No member app connected</Title><p>Connect member accounts to show their memberships, workouts, classes, and payments here.</p></section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <Title>Share this workspace</Title>
                    <p className="muted">
                      Members open the same sign-in page. Send the link or let
                      them scan the code.
                    </p>
                  </div>
                </div>
                <ShareSheet
                  url={typeof window !== "undefined" ? `${window.location.origin}/login` : ""}
                  title="TwoPlus sign-in"
                />
              </section>
            </>
          )}

          {active === "Settings" && (
            <>
                            <section className="panel">
                <div className="panel-heading">
                  <div>
                    <Title>Appearance</Title>
                    <p className="muted">
                      Light or dark. The gym photograph is the backdrop either
                      way.
                    </p>
                  </div>
                  {org && (
                    <Badge>{org.role === "owner" ? "Owner" : "View only"}</Badge>
                  )}
                </div>

                <div className="theme-actions">
                  {(["light", "dark"] as ThemeMode[]).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      disabled={!isOwner}
                      title={
                        isOwner
                          ? undefined
                          : "Only the workspace owner can change the appearance"
                      }
                      secondary={theme.mode !== mode}
                      aria-pressed={theme.mode === mode}
                      onClick={() => {
                        updateTheme({ mode })
                        saveTheme({ ...theme, mode })
                      }}
                    >
                      <Icon name={mode === "dark" ? "sparkles" : "dashboard"} size={15} />
                      {mode === "dark" ? "Dark mode" : "Light mode"}
                    </Button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <Title>Remove this workspace</Title>
                    <p className="muted">
                      {org?.organization.name ?? "This workspace"} and every
                      member, payment, invoice, class and attendance record in
                      it. There is no undo and no export once it is gone.
                    </p>
                  </div>
                  <Badge>{isOwner ? "Owner only" : "View only"}</Badge>
                </div>
                {isOwner ? (
                  <SlideCommit
                    label={
                      removingWorkspace
                        ? "Removing workspace…"
                        : "Slide to remove this workspace"
                    }
                    doneLabel="Workspace removed"
                    errorLabel="That did not work"
                    disabled={removingWorkspace}
                    height={46}
                    radius={999}
                    trackColor="color-mix(in srgb, var(--err) 16%, transparent)"
                    handleColor="var(--err)"
                    successColor="var(--err)"
                    onConfirm={async () => {
                      if (!org) throw new Error("No workspace is loaded");
                      setRemovingWorkspace(true)
                      try {
                        await api.removeWorkspace(org.organization.id)
                      } finally {
                        setRemovingWorkspace(false)
                      }
                    }}
                    onDone={() => {
                      signOut()
                    }}
                    onError={(reason) => {
                      notify(
                        reason instanceof Error
                          ? reason.message
                          : "Could not remove the workspace",
                      )
                    }}
                  />
                ) : (
                  <p className="muted">
                    Only the workspace owner can remove it.
                  </p>
                )}
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <Title>Workspace contact</Title>
                    <p className="muted">
                      What this workspace publishes. The phone number and
                      address are the ones saved on the workspace.
                    </p>
                  </div>
                </div>
                <div className="workspace-contact">
                  <div>
                    <span className="muted">Name</span>
                    <strong>{org?.organization.name ?? "—"}</strong>
                  </div>
                  <div>
                    <span className="muted">Phone</span>
                    <strong>{org?.organization.phone || "Not set"}</strong>
                  </div>
                  <div>
                    <span className="muted">Address</span>
                    <strong>{org?.organization.address || "Not set"}</strong>
                  </div>
                  <div>
                    <span className="muted">Currency</span>
                    <strong>{org?.organization.currency ?? "—"}</strong>
                  </div>
                </div>
                <div className="workspace-contact-actions">
                  {/* Real destinations only: the phone and address the owner
                      saved, and the sign-in link the workspace shares. */}
                  <SocialFlipButton
                    items={[
                      ...(org?.organization.phone
                        ? [
                            {
                              letter: "C",
                              icon: <Icon name="mobile" size={16} />,
                              label: "Call",
                              href: `tel:${org.organization.phone.replace(/[^\d+]/g, "")}`,
                            },
                          ]
                        : []),
                      ...(org?.organization.address
                        ? [
                            {
                              letter: "M",
                              icon: <Icon name="building" size={16} />,
                              label: "Map",
                              href: `https://maps.google.com/?q=${encodeURIComponent(org.organization.address)}`,
                            },
                          ]
                        : []),
                      {
                        letter: "S",
                        icon: <Icon name="arrow" size={16} />,
                        label: "Sign-in link",
                        href:
                          typeof window !== "undefined"
                            ? `${window.location.origin}/login`
                            : "#",
                      },
                    ]}
                  />
                </div>
              </section>
            </>
          )}

          <footer className="page-footer">
            <span>TwoPlus · A little less admin. A lot more progress.</span>
            <button onClick={() => go("Workspace manual")}>Need a hand?</button>
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
              <Title>Outstanding payments</Title>
              {[
                ...pendingPayments.filter((p) => p.member_id === profile.memberId),
              ].length ? (
                pendingPayments
                  .filter((p) => p.member_id === profile.memberId)
                  .map((p) => (
                    <div className="detail-line" key={p.id}>
                      <span>
                        {formatMoney(p.amount_minor, p.currency)} ·{" "}
                        {formatDate(p.paid_on)}
                      </span>
                      <Button
                        secondary
                        onClick={() => {
                          setPendingTarget(p.id)
                          setModal("Settle payment")
                        }}
                      >
                        Settle
                      </Button>
                    </div>
                  ))
              ) : (
                <p className="muted">Nothing outstanding for this member.</p>
              )}
              <Title>Membership history</Title>
              {profileMemberships.length ? (
                profileMemberships.map((m) => (
                  <div className="detail-line" key={m.id}>
                    <span>
                      {m.plan_name}
                      <br />
                      {formatDate(m.start_date)} – {formatDate(m.end_date)}
                    </span>
                    <Badge>{m.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="muted">No membership has been issued yet.</p>
              )}
              <Title>Renewals</Title>
              {profileRenewals.length ? (
                profileRenewals.map((r) => (
                  <div className="detail-line" key={r.id}>
                    <span>
                      {formatDate(r.previous_end_date)} → {formatDate(r.new_end_date)}
                      <br />
                      +{r.extended_days} days
                      {r.amount_minor
                        ? ` · ${formatMoney(r.amount_minor, org?.organization.currency)}`
                        : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </span>
                    <Badge>{formatDate(r.created_at)}</Badge>
                  </div>
                ))
              ) : (
                <p className="muted">This member has never renewed.</p>
              )}
              <Title>Payment history</Title>
              {profilePayments.length ? (
                profilePayments.map((p) => (
                  <div className="detail-line" key={p.id}>
                    <span>
                      {formatMoney(p.amount_minor, p.currency)} · {p.method}
                      <br />
                      {formatDate(p.paid_on)}
                    </span>
                    <Badge>{p.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="muted">No payment has been recorded for this member.</p>
              )}
              <div className="profile-actions">
                <Button
                  disabled={!profile.membershipId}
                  title={
                    profile.membershipId
                      ? undefined
                      : "This member has no membership to renew"
                  }
                  onClick={() => setModal("Renew membership")}
                >
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
              <Title>Body measurements</Title>
              {profileMeasurements.length ? (
                profileMeasurements.map((m) => (
                  <div className="detail-line" key={m.id}>
                    <span>{formatDate(m.measured_on)}</span>
                    <strong>
                      {[
                        m.weight_kg ? `${m.weight_kg} kg` : null,
                        m.body_fat_pct ? `${m.body_fat_pct}% fat` : null,
                        m.waist_cm ? `${m.waist_cm} cm waist` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="muted">No measurements recorded yet.</p>
              )}
              <Button
                secondary
                onClick={() => setModal("Record measurement")}
              >
                Record measurement
              </Button>
              {/* Notes are read and written only by owner and manager (RLS in
                  0006), so other roles never see this section at all. */}
              {(org?.role === "owner" || org?.role === "manager") && (
                <>
                  <Title>Internal notes</Title>
                  <p className="muted">
                    Staff only. Members never see these.
                  </p>
                  {profileNotes.length ? (
                    profileNotes.map((n) => (
                      <div className="detail-line" key={n.id}>
                        <span>{formatDate(n.created_at)}</span>
                        <strong>{n.body}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No internal notes yet.</p>
                  )}
                  <Button secondary onClick={() => setModal("Add note")}>
                    Add internal note
                  </Button>
                </>
              )}
              <Title>Attendance history</Title>
              {profileVisits.length ? (
                profileVisits.map((v) => (
                  <div className="detail-line" key={v.id}>
                    <span>{formatDate(v.check_in)}</span>
                    <strong>
                      {new Date(v.check_in).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {v.check_out
                        ? ` – ${new Date(v.check_out).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : " · still in"}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="muted">No attendance recorded for this member.</p>
              )}
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
                {planDetail && planDetail.name === modal.slice(9) && (
                  <>
                    <Title>
                      {active === "Workouts" ? "Exercises" : "Meals"}
                    </Title>
                    {planDetail.lines.length ? (
                      planDetail.lines.map((line, i) => (
                        <div className="detail-line" key={i}>
                          <strong>{line}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        {active === "Workouts"
                          ? "No exercises added to this plan yet."
                          : "No meals added to this plan yet."}
                      </p>
                    )}
                  </>
                )}
                {active === "Classes & PT" && (
                  <>
                    <Title>Booked members</Title>
                    {(() => {
                      // The modal is keyed by name, so a repeated class name
                      // (e.g. a weekly 6am yoga) cannot be narrowed to one
                      // session. Say so instead of showing another day's list.
                      const matches = classes.filter(
                        (c) => c.name === modal.slice(9),
                      )
                      if (matches.length !== 1)
                        return (
                          <p className="muted">
                            {matches.length > 1
                              ? `${matches.length} sessions share this name. Bookings are listed per session once class names are unique.`
                              : "No bookings for this class."}
                          </p>
                        )
                      const booked = classBookings.filter(
                        (b) =>
                          b.class_id === matches[0].id &&
                          b.status !== "cancelled",
                      )
                      if (!booked.length)
                        return (
                          <p className="muted">
                            Nobody is booked into this class yet.
                          </p>
                        )
                      return booked.map((b) => (
                        <div className="detail-line" key={b.id}>
                          <span>
                            {b.member
                              ? `${b.member.first_name} ${b.member.last_name}`.trim()
                              : "Member"}
                          </span>
                          <span className="detail-actions">
                            <Badge>
                              {b.status === "attended" ? "Attended" : "Booked"}
                            </Badge>
                            {canWrite && (
                              <>
                                <Button
                                  secondary
                                  type="button"
                                  onClick={() =>
                                    void updateBooking(
                                      b.id,
                                      b.status === "attended"
                                        ? "booked"
                                        : "attended",
                                    )
                                  }
                                >
                                  {b.status === "attended"
                                    ? "Mark booked"
                                    : "Mark attended"}
                                </Button>
                                <Button
                                  secondary
                                  type="button"
                                  onClick={() => void updateBooking(b.id, "cancelled")}
                                >
                                  Cancel seat
                                </Button>
                              </>
                            )}
                          </span>
                        </div>
                      ))
                    })()}
                  </>
                )}
                <p className="muted">Saved to your workspace.</p>
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
                        photo_url: String(data.get("photo") || "").trim() || undefined,
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
                      const rupees = Number(String(data.get("amount") || "0"))
                      if (!(rupees >= 0)) throw new Error("Enter a valid amount")
                      await api.updateMembershipExpiry(
                        profile.membershipId,
                        String(data.get("expires") || ""),
                        {
                          amount_minor: Math.round(rupees * 100),
                          note: String(data.get("note") || "") || undefined,
                        },
                      )
                      setModal("")
                      notify("Membership renewed")
                      reload()
                    } else if (modal === "Add note" && profile?.memberId) {
                      const body = String(data.get("body") || "").trim()
                      if (!body) throw new Error("Write the note first")
                      await api.addInternalNote(orgId, profile.memberId, body)
                      setModal("")
                      notify("Note saved")
                      setModuleTick((t) => t + 1)
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
                      const invoiceId = String(data.get("invoice") || "")
                      if (invoiceId) {
                        const invoice = invoices.find((i) => i.id === invoiceId)
                        if (invoice && invoice.member_id !== target.memberId)
                          throw new Error("That invoice belongs to a different member")
                      }
                      await api.recordPayment(orgId, {
                        member_id: target.memberId,
                        membership_id: target.membershipId ?? null,
                        invoice_id: invoiceId || null,
                        amount_minor: Math.round(rupees * 100),
                        method: String(data.get("method") || "cash") as PaymentMethod,
                        status: String(data.get("status") || "paid") as "paid" | "pending",
                        description: String(data.get("description") || "") || undefined,
                      })
                      setModal("")
                      notify("Payment recorded")
                      setModuleTick((t) => t + 1)
                      reload()
                    } else if (modal === "Raise invoice") {
                      const memberId = String(data.get("member") || "")
                      if (!memberId) throw new Error("Select a member")
                      const rupees = Number(String(data.get("total") || "0"))
                      if (!(rupees > 0)) throw new Error("Enter a total above zero")
                      await api.createInvoice(orgId, {
                        member_id: memberId,
                        total_minor: Math.round(rupees * 100),
                        issued_on: String(data.get("issued") || "") || undefined,
                        due_on: String(data.get("due") || "") || undefined,
                        notes: String(data.get("notes") || "") || undefined,
                      })
                      setModal("")
                      notify("Invoice raised")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Void invoice") {
                      const invoiceId = String(data.get("invoice") || "")
                      if (!invoiceId) throw new Error("Select an invoice")
                      await api.voidInvoice(invoiceId)
                      setModal("")
                      notify("Invoice voided")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Check in member") {
                      const name = String(data.get("member") || "")
                      const target = members.find((m) => m.name === name)
                      if (!target?.memberId) throw new Error("Select a member")
                      await api.checkInMember(orgId, target.memberId, org.branch?.id)
                      setModal("")
                      notify("Check-in recorded")
                      go("Attendance")
                    } else if (modal === "Settle payment") {
                      const paymentId = String(data.get("payment") || "")
                      if (!paymentId) throw new Error("Select a pending payment")
                      await api.settlePayment(paymentId, {
                        method: String(data.get("method") || "cash") as PaymentMethod,
                      })
                      setModal("")
                      setPendingTarget("")
                      notify("Payment marked as received")
                      setModuleTick((t) => t + 1)
                      reload()
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
                    } else if (modal === "Book member") {
                      const classId = String(data.get("class") || "")
                      const memberId = String(data.get("member") || "")
                      if (!classId || !memberId)
                        throw new Error("Pick a class and a member")
                      const target = classes.find((c) => c.id === classId)
                      const alreadyOn = classBookings.some(
                        (b) =>
                          b.class_id === classId &&
                          b.member_id === memberId &&
                          b.status !== "cancelled",
                      )
                      const taken = classBookings.filter(
                        (b) => b.class_id === classId && b.status !== "cancelled",
                      ).length
                      // shortcut: capacity is checked in the browser, so two
                      // simultaneous bookings can both pass; a DB trigger is the
                      // real fix if overbooking ever happens.
                      if (!alreadyOn && target && taken >= target.capacity)
                        throw new Error(
                          `${target.name} is full (${taken} of ${target.capacity} seats)`,
                        )
                      await api.bookMemberIntoClass(orgId, classId, memberId)
                      setModal("")
                      notify("Member booked into the class")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Add branch") {
                      await api.createBranch(orgId, {
                        name: String(data.get("name") || ""),
                        address: String(data.get("address") || "") || undefined,
                      })
                      setModal("")
                      notify("Branch added")
                      go("Branches")
                    } else if (modal === "Schedule class") {
                      const startsAt = String(data.get("starts") || "")
                      if (!startsAt) throw new Error("Pick a start time")
                      await api.createClass(orgId, {
                        name: String(data.get("name") || ""),
                        starts_at: new Date(startsAt).toISOString(),
                        capacity: Number(String(data.get("capacity") || "20")) || 20,
                        duration_minutes:
                          Number(String(data.get("duration") || "60")) || 60,
                        trainer_id:
                          String(data.get("trainer") || "") ||
                          // A trainer scheduling a class must not create one they
                          // then cannot see, so an unassigned shift defaults to
                          // whoever is booking it.
                          (org?.role === "trainer" ? (myStaff?.id ?? null) : null),
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
                        photo_url: String(data.get("photo") || "").trim() || null,
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
                    } else if (modal === "Update enquiry") {
                      const enquiryId = String(data.get("enquiry") || "")
                      const target = enquiryList.find((e) => e.id === enquiryId)
                      if (!target) throw new Error("Select an enquiry to update")
                      await api.updateEnquiry(enquiryId, {
                        status: String(data.get("status") || "new") as Enquiry["status"],
                      })
                      setModal("")
                      notify("Enquiry status updated")
                      setModuleTick((t) => t + 1)
                      reload()
                    } else if (modal === "Log follow-up") {
                      const enquiryId = String(data.get("enquiry") || "")
                      const target = enquiryList.find((e) => e.id === enquiryId)
                      if (!target) throw new Error("Select an enquiry to follow up")
                      const date = String(data.get("date") || "")
                      if (!date) throw new Error("Pick a follow-up date")
                      await api.updateEnquiry(enquiryId, {
                        status: "follow_up",
                        follow_up_date: date,
                        notes: String(data.get("notes") || "") || target.notes,
                      })
                      setModal("")
                      notify("Follow-up saved to the enquiry")
                      setModuleTick((t) => t + 1)
                      reload()
                    } else if (modal === "Edit plan") {
                      if (!editPlan) throw new Error("Pick a plan to edit")
                      const price = Number(String(data.get("price") || "0"))
                      const duration = Number(String(data.get("duration") || "0"))
                      if (!(price >= 0)) throw new Error("Enter a valid price")
                      if (!(duration > 0)) throw new Error("Enter a valid duration")
                      await api.updatePlan(editPlan.id, {
                        name: String(data.get("name") || "").trim(),
                        description: String(data.get("description") || "") || null,
                        duration_days: duration,
                        price_minor: Math.round(price * 100),
                        is_active: String(data.get("active") || "yes") === "yes",
                      })
                      setModal("")
                      setEditPlan(null)
                      notify("Plan updated")
                      reload()
                    } else if (modal === "Edit employee") {
                      const target = staffList.find(
                        (s) => s.id === String(data.get("staff") || ""),
                      )
                      if (!target) throw new Error("Select an employee")
                      // Blank fields mean "leave unchanged" rather than "clear".
                      const patch: Partial<
                        Pick<
                          StaffMember,
                          | "name"
                          | "phone"
                          | "email"
                          | "job_role"
                          | "employment_status"
                          | "user_id"
                        >
                      > = {}
                      for (const key of ["name", "phone", "email", "job_role"] as const) {
                        const value = String(data.get(key) || "").trim()
                        if (value) patch[key] = value
                      }
                      const nextStatus = String(data.get("status") || "")
                      if (nextStatus === "active" || nextStatus === "inactive") {
                        patch.employment_status = nextStatus
                      }
                      const nextLogin = String(data.get("login") || "")
                      if (nextLogin) {
                        patch.user_id = nextLogin === "none" ? null : nextLogin
                      }
                      if (!Object.keys(patch).length) {
                        throw new Error("Change at least one field")
                      }
                      await api.updateStaffMember(target.id, patch)
                      setModal("")
                      notify("Employee updated")
                      go("Trainers & staff")
                    } else if (modal === "Change role") {
                      const target = roster.find(
                        (r) => r.user_id === String(data.get("member") || ""),
                      )
                      if (!target) throw new Error("Select a team member")
                      await api.updateOrgMemberRole(
                        orgId,
                        target.user_id,
                        String(data.get("role") || "trainer") as OrgRole,
                      )
                      setModal("")
                      notify("Role updated")
                      reload()
                    } else if (modal === "Create reminder") {
                      const userId = session?.user.id
                      if (!userId) throw new Error("Sign in again to create a reminder")
                      await api.createNotification(orgId, {
                        user_id: userId,
                        title: String(data.get("title") || ""),
                        body: String(data.get("body") || "") || undefined,
                        type: String(data.get("type") || "task") as AppNotification["type"],
                      })
                      setModal("")
                      notify("Reminder saved to your notifications")
                      reload()
                    } else if (modal === "Create group") {
                      setModal("")
                      notify(
                        "Community groups need a messaging service — nothing was created",
                      )
                    } else if (modal === "Create workout") {
                      await api.createWorkoutPlan(orgId, {
                        name: String(data.get("name") || ""),
                        goal: String(data.get("goal") || "") || undefined,
                        description: String(data.get("description") || "") || undefined,
                      })
                      setModal("")
                      notify("Workout plan created")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Create diet plan") {
                      const num = (key: string) => {
                        const raw = String(data.get(key) || "").trim()
                        if (!raw) return null
                        const n = Number(raw)
                        if (!(n >= 0)) throw new Error("Numbers must be zero or more")
                        return n
                      }
                      await api.createDietPlan(orgId, {
                        name: String(data.get("name") || ""),
                        description: String(data.get("description") || "") || undefined,
                        target_calories: num("calories"),
                        target_protein_g: num("protein"),
                        target_carbs_g: num("carbs"),
                        target_fat_g: num("fat"),
                      })
                      setModal("")
                      notify("Diet plan created")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Assign workout plan") {
                      const target = members.find(
                        (m) => m.memberId === String(data.get("member") || ""),
                      )
                      if (!target?.memberId) throw new Error("Select a member")
                      const planId = String(data.get("plan") || "")
                      if (!planId) throw new Error("Select a workout plan")
                      await api.assignWorkoutPlan(orgId, {
                        member_id: target.memberId,
                        plan_id: planId,
                        effective_from: String(data.get("from") || "") || undefined,
                      })
                      setModal("")
                      notify(`Workout plan assigned to ${target.name}`)
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Assign diet plan") {
                      const target = members.find(
                        (m) => m.memberId === String(data.get("member") || ""),
                      )
                      if (!target?.memberId) throw new Error("Select a member")
                      const planId = String(data.get("plan") || "")
                      if (!planId) throw new Error("Select a diet plan")
                      await api.assignDietPlan(orgId, {
                        member_id: target.memberId,
                        plan_id: planId,
                        effective_from: String(data.get("from") || "") || undefined,
                      })
                      setModal("")
                      notify(`Diet plan assigned to ${target.name}`)
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Add exercise") {
                      const planId = String(data.get("plan") || "")
                      if (!planId) throw new Error("Select a workout plan")
                      const intOrNull = (key: string) => {
                        const raw = String(data.get(key) || "").trim()
                        if (!raw) return null
                        const n = Number(raw)
                        if (!Number.isInteger(n) || n <= 0)
                          throw new Error("Sets and rest must be whole numbers above zero")
                        return n
                      }
                      await api.addWorkoutExercise(planId, {
                        day_label: String(data.get("day") || "") || undefined,
                        exercise_name: String(data.get("exercise") || ""),
                        sets: intOrNull("sets"),
                        reps: String(data.get("reps") || "") || undefined,
                        rest_seconds: intOrNull("rest"),
                        instructions: String(data.get("instructions") || "") || undefined,
                      })
                      setModal("")
                      notify("Exercise added to the plan")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Add meal") {
                      const planId = String(data.get("plan") || "")
                      if (!planId) throw new Error("Select a diet plan")
                      // One food per line, so a whole meal is typed in one go.
                      const items = String(data.get("items") || "")
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [food, ...portion] = line.split("·")
                          return {
                            food_item: food.trim(),
                            portion: portion.join("·").trim() || undefined,
                          }
                        })
                      await api.addDietMeal(planId, {
                        name: String(data.get("name") || ""),
                        timing: String(data.get("timing") || "") || undefined,
                        coach_notes: String(data.get("notes") || "") || undefined,
                        items,
                      })
                      setModal("")
                      notify("Meal added to the plan")
                      setModuleTick((t) => t + 1)
                    } else if (modal === "Record measurement") {
                      const target = members.find(
                        (m) => m.memberId === String(data.get("member") || ""),
                      )
                      if (!target?.memberId) throw new Error("Select a member")
                      const num = (key: string) => {
                        const raw = String(data.get(key) || "").trim()
                        if (!raw) return null
                        const n = Number(raw)
                        if (!(n > 0)) throw new Error("Measurements must be above zero")
                        return n
                      }
                      const weight = num("weight")
                      if (weight === null) throw new Error("Enter the member's weight")
                      await api.recordMeasurement(orgId, {
                        member_id: target.memberId,
                        measured_on: String(data.get("date") || "") || undefined,
                        weight_kg: weight,
                        height_cm: num("height"),
                        body_fat_pct: num("bodyfat"),
                        chest_cm: num("chest"),
                        waist_cm: num("waist"),
                        hips_cm: num("hips"),
                        arms_cm: num("arms"),
                        thighs_cm: num("thighs"),
                        notes: String(data.get("notes") || "") || undefined,
                      })
                      setModal("")
                      notify(`Measurement recorded for ${target.name}`)
                      setModuleTick((t) => t + 1)
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
                    <label>
                      Profile photo URL (optional)
                      <Input
                        name="photo"
                        type="url"
                        placeholder="https://…"
                      />
                    </label>
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
                    <label>New expiry date<Input name="expires" type="date" required /></label>
                    <div className="form-row">
                      <label>
                        Amount collected (₹)
                        <Input name="amount" type="number" min="0" step="1" defaultValue={0} />
                      </label>
                      <label>
                        Note
                        <Input name="note" placeholder="e.g. 3-month extension" />
                      </label>
                    </div>
                    <p>This updates the membership date and logs the renewal. Recording the money here is optional; use Record payment to collect it properly.</p>
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
                    <label>
                      Apply to invoice (optional)
                      <Select name="invoice" defaultValue="">
                        <option value="">Not linked to an invoice</option>
                        {invoices
                          .filter((i) => i.status !== "void")
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.invoice_number} ·{" "}
                              {i.member
                                ? `${i.member.first_name} ${i.member.last_name}`.trim()
                                : "Member"}{" "}
                              ·{" "}
                              {formatMoney(i.total_minor, org?.organization.currency)}
                            </option>
                          ))}
                      </Select>
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
                ) : modal === "Settle payment" ? (
                  <>
                    <label>
                      Pending payment
                      <Select name="payment" required defaultValue={pendingTarget}>
                        <option value="">Select a payment…</option>
                        {pendingPayments.map((p) => {
                          const who =
                            members.find((m) => m.memberId === p.member_id)?.name ??
                            "Member"
                          return (
                            <option key={p.id} value={p.id}>
                              {who} · {formatMoney(p.amount_minor, p.currency)} ·{" "}
                              {formatDate(p.paid_on)}
                            </option>
                          )
                        })}
                      </Select>
                    </label>
                    <label>
                      Received by
                      <Select name="method" defaultValue="cash">
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="other">Other</option>
                      </Select>
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      No payment gateway is connected. Only mark this once the money
                      has actually reached you.
                    </div>
                  </>
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
                ) : modal === "Book member" ? (
                  <>
                    <label>
                      Class
                      <Select name="class" required autoFocus>
                        <option value="">Select a class…</option>
                        {classes
                          .filter((c) => c.status === "scheduled")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} · {formatDate(c.starts_at)}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Member
                      <Select name="member" required>
                        <option value="">Select a member…</option>
                        {members.map((m) => (
                          <option key={m.memberId} value={m.memberId}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <p>
                      Booking a member who is already on the list reactivates
                      their seat instead of creating a duplicate.
                    </p>
                  </>
                ) : modal === "Add note" ? (
                  <>
                    <div className="detail-line">
                      <span>Member</span>
                      <strong>{profile?.name}</strong>
                    </div>
                    <label>
                      Note
                      <textarea
                        name="body"
                        required
                        autoFocus
                        placeholder="e.g. Asked to pause for a month after surgery"
                      />
                    </label>
                    <p>Only owners and managers can read these notes.</p>
                  </>
                ) : modal === "Add branch" ? (
                  <>
                    <label>
                      Branch name
                      <Input name="name" required placeholder="Koramangala" autoFocus />
                    </label>
                    <label>
                      Address
                      <textarea name="address" placeholder="Street, area, city" />
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
                    <label>
                      Trainer
                      <Select name="trainer" defaultValue="">
                        <option value="">Unassigned</option>
                        {staffList
                          .filter((s) => s.job_role === "Trainer")
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </Select>
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
                    <label>
                      Profile photo URL (optional)
                      <Input
                        name="photo"
                        type="url"
                        defaultValue={profile?.photo}
                        placeholder="https://…"
                      />
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
                ) : modal === "Update enquiry" ? (
                  <>
                    <label>
                      Enquiry
                      <Select name="enquiry" required>
                        <option value="">Select an enquiry…</option>
                        {enquiryList.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} · {e.phone} ·{" "}
                            {e.status.charAt(0).toUpperCase() + e.status.slice(1).replace("_", " ")}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      New status
                      <Select name="status" defaultValue="contacted" required>
                        <option value="new">New — not contacted yet</option>
                        <option value="contacted">Contacted — waiting on a decision</option>
                        <option value="follow_up">Follow up — needs another call</option>
                        <option value="lost">Lost — not joining</option>
                      </Select>
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      This only changes the lead's status in your workspace. No
                      message is sent to them. Converting a lead into a paying
                      member is done with Convert to member.
                    </div>
                  </>
                ) : modal === "Log follow-up" ? (
                  <>
                    <label>
                      Enquiry
                      <Select name="enquiry" required>
                        <option value="">Select an enquiry…</option>
                        {enquiryList
                          .filter((e) => e.status !== "converted")
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} · {e.phone}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Follow-up date
                      <Input type="date" name="date" required />
                    </label>
                    <label>
                      Notes
                      <textarea name="notes" placeholder="What was discussed, and the next step" />
                    </label>
                    <div className="integration-note">
                      <Icon name="check" size={15} />
                      Saved against the enquiry and marked as follow-up. No
                      message is sent to the lead.
                    </div>
                  </>
                ) : modal === "Edit plan" ? (
                  <>
                    <label>
                      Plan name
                      <Input
                        name="name"
                        required
                        defaultValue={editPlan?.name}
                        autoFocus
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Duration (days)
                        <Input
                          name="duration"
                          type="number"
                          min="1"
                          required
                          defaultValue={editPlan?.duration_days}
                        />
                      </label>
                      <label>
                        Price (₹)
                        <Input
                          name="price"
                          type="number"
                          min="0"
                          step="1"
                          required
                          defaultValue={
                            editPlan ? editPlan.price_minor / 100 : undefined
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Availability
                      <Select
                        name="active"
                        defaultValue={editPlan?.is_active ? "yes" : "no"}
                      >
                        <option value="yes">Active — can be sold</option>
                        <option value="no">Archived — hidden from new sales</option>
                      </Select>
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        defaultValue={editPlan?.description ?? ""}
                        placeholder="What does this plan include?"
                      />
                    </label>
                    <p>
                      Existing memberships keep their terms. Archiving only stops
                      new assignments.
                    </p>
                  </>
                ) : modal === "Edit employee" ? (
                  <>
                    <label>
                      Employee
                      <Select name="staff" required>
                        <option value="">Select an employee…</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.job_role}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Name
                        <Input name="name" placeholder="Leave blank to keep" />
                      </label>
                      <label>
                        Phone
                        <Input name="phone" type="tel" placeholder="Leave blank to keep" />
                      </label>
                    </div>
                    <label>
                      Email
                      <Input name="email" type="email" placeholder="Leave blank to keep" />
                    </label>
                    <div className="form-row">
                      <label>
                        Role
                        <Select name="job_role" defaultValue="">
                          <option value="">Keep current role</option>
                          <option>Trainer</option>
                          <option>Front desk</option>
                          <option>Manager</option>
                          <option>Cleaner</option>
                          <option>Other</option>
                        </Select>
                      </label>
                      <label>
                        Employment
                        <Select name="status" defaultValue="">
                          <option value="">Keep current status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Select>
                      </label>
                    </div>
                    <label>
                      Linked login
                      <Select name="login" defaultValue="">
                        <option value="">Keep current login</option>
                        <option value="none">Not linked</option>
                        {roster.map((r) => (
                          <option key={r.user_id} value={r.user_id}>
                            {r.full_name || r.email} · {r.role}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      Linking an employee to their login is what shows a trainer
                      only the classes assigned to them.
                    </div>
                  </>
                ) : modal === "Change role" ? (
                  <>
                    <label>
                      Team member
                      <Select name="member" required>
                        <option value="">Select a team member…</option>
                        {roster.map((r) => (
                          <option key={r.user_id} value={r.user_id}>
                            {r.full_name} · {r.role}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      Role
                      <Select name="role" defaultValue="trainer" required>
                        <option value="manager">Manager</option>
                        <option value="trainer">Trainer</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="finance">Finance</option>
                        <option value="owner">Owner</option>
                      </Select>
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      Only the workspace owner can change roles. The change takes
                      effect the next time that person signs in.
                    </div>
                  </>
                ) : modal === "Create reminder" ? (
                  <>
                    <label>
                      Title
                      <Input
                        name="title"
                        required
                        placeholder="e.g. Call Priya about her renewal"
                        autoFocus
                      />
                    </label>
                    <label>
                      Detail
                      <textarea name="body" placeholder="Optional context" />
                    </label>
                    <label>
                      Type
                      <Select name="type" defaultValue="task">
                        <option value="task">Task</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                      </Select>
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      Saved to your own in-app notifications. No SMS or email is
                      sent.
                    </div>
                  </>
                ) : modal === "Create workout" ? (
                  <>
                    <label>
                      Plan name
                      <Input
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="e.g. 12-week strength base"
                        autoFocus
                      />
                    </label>
                    <label>
                      Goal
                      <Select name="goal" defaultValue="">
                        <option value="">No specific goal</option>
                        <option>Strength</option>
                        <option>Muscle gain</option>
                        <option>Fat loss</option>
                        <option>Endurance</option>
                        <option>Mobility</option>
                        <option>General fitness</option>
                      </Select>
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        placeholder="How the plan is meant to be run"
                      />
                    </label>
                    <p>
                      Exercises are added to the plan afterwards. Assign it to a
                      member from the Workouts directory.
                    </p>
                  </>
                ) : modal === "Create diet plan" ? (
                  <>
                    <label>
                      Plan name
                      <Input
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="e.g. Lean bulk, 2,600 kcal"
                        autoFocus
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        placeholder="Approach, restrictions, meal timing"
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Daily calories
                        <Input name="calories" type="number" min="0" placeholder="2600" />
                      </label>
                      <label>
                        Protein (g)
                        <Input name="protein" type="number" min="0" placeholder="160" />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Carbs (g)
                        <Input name="carbs" type="number" min="0" placeholder="280" />
                      </label>
                      <label>
                        Fat (g)
                        <Input name="fat" type="number" min="0" placeholder="70" />
                      </label>
                    </div>
                    <p>Targets are optional. Meals are added to the plan afterwards.</p>
                  </>
                ) : modal === "Assign workout plan" ? (
                  <>
                    <label>
                      Member
                      <Select name="member" required>
                        <option value="">Select a member…</option>
                        {members
                          .filter((m) => m.memberId)
                          .map((m) => (
                            <option key={m.memberId} value={m.memberId}>
                              {m.name} · {m.plan}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Workout plan
                      <Select name="plan" required>
                        <option value="">Select a plan…</option>
                        {workoutPlans
                          .filter((p) => !p.is_archived)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.goal ? ` · ${p.goal}` : ""}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Start date
                      <Input name="from" type="date" />
                    </label>
                    <div className="integration-note">
                      <Icon name="settings" size={15} />
                      Any existing active plan ends today, so the member always
                      has one current plan.
                    </div>
                  </>
                ) : modal === "Assign diet plan" ? (
                  <>
                    <label>
                      Member
                      <Select name="member" required>
                        <option value="">Select a member…</option>
                        {members
                          .filter((m) => m.memberId)
                          .map((m) => (
                            <option key={m.memberId} value={m.memberId}>
                              {m.name} · {m.plan}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Diet plan
                      <Select name="plan" required>
                        <option value="">Select a plan…</option>
                        {dietPlans
                          .filter((p) => !p.is_archived)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.target_calories ? ` · ${p.target_calories} kcal` : ""}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Start date
                      <Input name="from" type="date" />
                    </label>
                  </>
                ) : modal === "Record measurement" ? (
                  <>
                    <label>
                      Member
                      <Select name="member" required>
                        <option value="">Select a member…</option>
                        {members
                          .filter((m) => m.memberId)
                          .map((m) => (
                            <option key={m.memberId} value={m.memberId}>
                              {m.name}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Date
                        <Input name="date" type="date" />
                      </label>
                      <label>
                        Weight (kg)
                        <Input
                          name="weight"
                          type="number"
                          min="1"
                          step="0.1"
                          required
                          placeholder="72.5"
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Height (cm)
                        <Input name="height" type="number" min="1" step="0.1" />
                      </label>
                      <label>
                        Body fat (%)
                        <Input name="bodyfat" type="number" min="1" step="0.1" />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Chest (cm)
                        <Input name="chest" type="number" min="1" step="0.1" />
                      </label>
                      <label>
                        Waist (cm)
                        <Input name="waist" type="number" min="1" step="0.1" />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Hips (cm)
                        <Input name="hips" type="number" min="1" step="0.1" />
                      </label>
                      <label>
                        Arms (cm)
                        <Input name="arms" type="number" min="1" step="0.1" />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Thighs (cm)
                        <Input name="thighs" type="number" min="1" step="0.1" />
                      </label>
                    </div>
                    <label>
                      Notes
                      <textarea name="notes" placeholder="Optional context" />
                    </label>
                    <p>
                      Only weight is required. Saving the same member and date
                      twice updates that record instead of adding a duplicate.
                    </p>
                  </>
                ) : modal === "Add exercise" ? (
                  <>
                    <label>
                      Workout plan
                      <Select name="plan" required autoFocus>
                        <option value="">Select a plan…</option>
                        {workoutPlans
                          .filter((p) => !p.is_archived)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label>
                      Exercise
                      <Input
                        name="exercise"
                        required
                        maxLength={80}
                        placeholder="e.g. Back squat"
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Day
                        <Input name="day" placeholder="e.g. Day A" />
                      </label>
                      <label>
                        Sets
                        <Input name="sets" type="number" min="1" step="1" placeholder="4" />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Reps
                        <Input name="reps" placeholder="e.g. 8-10" />
                      </label>
                      <label>
                        Rest (seconds)
                        <Input name="rest" type="number" min="1" step="1" placeholder="90" />
                      </label>
                    </div>
                    <label>
                      Instructions
                      <textarea
                        name="instructions"
                        placeholder="Form cues, tempo, substitutions"
                      />
                    </label>
                    <p>Exercises appear in the order they are added.</p>
                  </>
                ) : modal === "Add meal" ? (
                  <>
                    <label>
                      Diet plan
                      <Select name="plan" required autoFocus>
                        <option value="">Select a plan…</option>
                        {dietPlans
                          .filter((p) => !p.is_archived)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Meal
                        <Input
                          name="name"
                          required
                          maxLength={80}
                          placeholder="e.g. Breakfast"
                        />
                      </label>
                      <label>
                        Timing
                        <Input name="timing" placeholder="e.g. 7:30 am" />
                      </label>
                    </div>
                    <label>
                      Foods
                      <textarea
                        name="items"
                        placeholder={"Oats · 60 g\nGreek yoghurt · 150 g"}
                      />
                    </label>
                    <label>
                      Coach notes
                      <textarea name="notes" placeholder="Swaps, prep notes" />
                    </label>
                    <p>
                      One food per line. Add a portion after a middle dot, like
                      &quot;Oats · 60 g&quot;.
                    </p>
                  </>
                ) : modal === "Raise invoice" ? (
                  <>
                    <label>
                      Member
                      <Select name="member" required autoFocus>
                        <option value="">Select a member…</option>
                        {members.map((m) => (
                          <option key={m.memberId} value={m.memberId}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <div className="form-row">
                      <label>
                        Total (₹)
                        <Input
                          name="total"
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="2500"
                        />
                      </label>
                      <label>
                        Due date
                        <Input name="due" type="date" />
                      </label>
                    </div>
                    <label>
                      Issued on
                      <Input name="issued" type="date" />
                    </label>
                    <label>
                      Notes
                      <textarea name="notes" placeholder="What this bill covers" />
                    </label>
                    <p>
                      The invoice number is assigned automatically. Record a
                      payment against it to settle it.
                    </p>
                  </>
                ) : modal === "Void invoice" ? (
                  <>
                    <label>
                      Invoice
                      <Select name="invoice" required autoFocus>
                        <option value="">Select an invoice…</option>
                        {invoices
                          .filter((i) => i.status !== "void")
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.invoice_number} ·{" "}
                              {i.member
                                ? `${i.member.first_name} ${i.member.last_name}`.trim()
                                : "Member"}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <p>
                      Voiding keeps the row and its number for your records. It
                      cannot be undone.
                    </p>
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
                  {modal === "Archive member" ? (
                    <HoldButton disabled={modalBusy}>
                      {modalBusy ? "Saving…" : "Hold to archive"}
                    </HoldButton>
                  ) : (
                  <Button type="submit" disabled={modalBusy}>
                    {modalBusy
                      ? "Saving…"
                      : modal === "Add member"
                        ? "Add member"
                        : modal === "Create plan"
                          ? "Create plan"
                          : modal === "Add branch"
                            ? "Add branch"
                            : modal === "Book member"
                              ? "Book member"
                              : modal === "Freeze memberships"
                            ? "Freeze memberships"
                            : modal === "Restore member"
                                ? "Restore member"
                                : modal === "Check out member"
                                  ? "Check out"
                                  : modal === "Convert enquiry"
                                    ? "Convert to member"
                                    : modal === "Update enquiry"
                                      ? "Update status"
                                      : modal === "Log follow-up"
                                        ? "Save follow-up"
                                        : modal === "Edit plan"
                                          ? "Save plan"
                                          : modal === "Edit employee"
                                            ? "Save employee"
                                            : modal === "Change role"
                                              ? "Change role"
                                              : modal === "Create reminder"
                                                ? "Create reminder"
                                                : modal === "Create workout" ||
                                                    modal === "Create diet plan"
                                                  ? modal
                                                  : modal === "Add exercise"
                                                    ? "Add exercise"
                                                    : modal === "Add meal"
                                                      ? "Add meal"
                                                      : modal === "Assign workout plan" ||
                                                          modal === "Assign diet plan"
                                                        ? "Assign plan"
                                                        : modal === "Record measurement"
                                                          ? "Save measurement"
                                                          : modal === "Raise invoice"
                                                            ? "Raise invoice"
                                                            : modal === "Void invoice"
                                                              ? "Void invoice"
                                                              : modal === "Add note"
                                                                ? "Save note"
                                                                : "Save changes"}
                  </Button>
                  )}
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
