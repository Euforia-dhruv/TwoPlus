import { useState, type ReactNode } from "react"
import { Icon, type IconName } from "./icons"

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
}
const initialMembers: Member[] = []
function Button({
  children,
  secondary,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      className={`btn ${secondary ? "secondary" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="input" />
}
function Title({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props}>{children}</h2>
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${
        ["Active", "Paid", "Completed", "Resolved", "In stock"].includes(
          String(children),
        )
          ? "green"
          : ["Expired", "Overdue", "Low stock"].includes(String(children))
            ? "red"
            : ["Expiring soon", "Pending", "Due", "Open"].includes(
                  String(children),
                )
              ? "amber"
              : ""
      }`}
    >
      <i />
      {children}
    </span>
  )
}
function Avatar({ name, small }: { name: string; small?: boolean }) {
  return (
    <span
      className={`avatar tone-${name.charCodeAt(0) % 5} ${
        small ? "small" : ""
      }`}
    >
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  )
}
function Stats({ items }: { items: string[][] }) {
  return (
    <div className="stats">
      {items.map(([label, value, detail], i) => (
        <section key={label} className="stat">
          <div className="stat-label">
            {label}
            <Icon
              name={
                (["members", "check", "calendar", "wallet"] as const)[i % 4]
              }
              size={16}
            />
          </div>
          <strong>{value}</strong>
          <span>
            <span className={detail.startsWith("+") ? "positive" : ""}>
              {detail}
            </span>
          </span>
        </section>
      ))}
    </div>
  )
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

export default function App() {
  const [active, setActive] = useState("Overview")
  const [members, setMembers] = useState(initialMembers)
  const [tab, setTab] = useState("All members")
  const [query, setQuery] = useState("")
  const [plan, setPlan] = useState("All plans")
  const [selected, setSelected] = useState<string[]>([])
  const [profile, setProfile] = useState<Member | null>(null)
  const [modal, setModal] = useState("")
  const [notice, setNotice] = useState("")
  const branch = "Main branch"
  const [records, setRecords] = useState<Record<string, string[][]>>({})
  const [cart, setCart] = useState<string[]>([])
  const notify = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(""), 4000)
  }
  const go = (name: string) => {
    setActive(name)
    setQuery("")
    setSelected([])
  }
  const filtered = members.filter(
    (m) =>
      (tab === "All members" || m.status === tab) &&
      (plan === "All plans" || m.plan === plan) &&
      `${m.name} ${m.email} ${m.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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
    link.download = `heygym-${active.toLowerCase()}.csv`
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
          <button className="glass-brand" onClick={() => go("Overview")} aria-label="HeyGym home"><Icon name="activity" size={25} /><span>HeyGym</span></button>
          <div className="summary-tabs">{[["Overview", "Gym Summary"], ["Members", "Members"], ["Reports", "Revenue Analysis"], ["Classes & PT", "Class Schedule"]].map(([key, label]) => <button key={key} className={active === key ? "is-selected" : ""} onClick={() => go(key)}>{label}</button>)}</div>
          <div className="breadcrumb">
            <Icon name="shop" size={15} />
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-label">Session only</span>
            <button
              aria-label="View reminders"
              className="icon-button notification"
              onClick={() => go("Reminders")}
            >
              <Icon name="bell" size={18} />
            </button>
            <span className="header-divider" />
            <Avatar name="Your account" small />
          </div>
        </header>
        <main>
          {active === "Overview" && <><div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Gym Summary</h1><p>Your business overview will fill in as you add records.</p></div><Button onClick={() => setModal("Add member")}><Icon name="plus" size={16} />Add member</Button></div><Stats items={[["Members", String(members.length), "Added in this session"], ["Active memberships", String(members.filter(m => m.status === "Active").length), "From your member directory"], ["Recorded payments", String((records.Payments || []).length), "Added in this session"], ["Enquiries", String((records.Enquiries || []).length), "Added in this session"]]} /><section className="panel workspace-empty"><Icon name="dashboard" size={32} /><Title>No activity to report yet</Title><p>Revenue, attendance, retention, and growth charts will appear when there is enough recorded activity. No sample figures are shown.</p><Button secondary onClick={() => go("Members")}>Open member directory <Icon name="arrow" size={15} /></Button></section></>}

          <div className="page-heading" hidden={active === "Overview"}>
            <div>
              <div className="eyebrow">
                COREFIT STUDIO <span>/</span> {branch.toUpperCase()}
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
                    "Added in this session",
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
                  ["Members with dues", String(members.filter(m => m.due !== "₹0").length), "From your member directory"],
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
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd>⌘ K</kbd>
                  </div>
                  <div className="filter-group">
                    <Select
                      aria-label="Filter membership plan"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                    >
                      <option>All plans</option>
                      {(records.Memberships || []).map((r, i) => <option key={i}>{r[0]}</option>)}
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
                      onClick={() => {
                        setMembers((ms) =>
                          ms.map((m) =>
                            selected.includes(m.name)
                              ? { ...m, status: "Frozen" }
                              : m,
                          ),
                        )
                        setSelected([])
                      }}
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
                      {filtered.map((m) => (
                        <tr key={m.email}>
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
                  {!filtered.length && (
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
                      {filtered.length ? 1 : 0}–{filtered.length}
                    </strong>{" "}
                    of <strong>{filtered.length}</strong> members
                  </span>
                  <div>
                    <span>10 per page</span>
                    <Button secondary disabled>
                      ‹
                    </Button>
                    <Button secondary className="current-page">
                      1
                    </Button>
                    <Button secondary disabled>
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
                    ? "Payment gateway not connected. Manual entries do not collect or verify real payments."
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
                  <Badge>
                    {"Session only"}
                  </Badge>
                </div>
                <div className="table-toolbar">
                  <div className="search-field">
                    <Icon name="search" size={16} />
                    <Input
                      placeholder={`Search ${active.toLowerCase()}...`}
                      aria-label={`Search ${active}`}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
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
                  {!(records[active] || []).length && <div className="empty">No records yet. Use the add button to create your first entry.</div>}
                </div>
                <div className="table-footer">
                  <span>All records · {branch}</span>
                  <span>Session-only records</span>
                </div>
              </section>
            </>
          )}

          {active === "Marketplace" && <section className="panel workspace-empty"><Icon name="shop" size={32} /><Title>No products available</Title><p>A supplier catalog is not connected. Products, pricing, ratings, and ordering will appear once a real catalog is available.</p></section>}

          {active === "Member app" && <section className="panel workspace-empty"><Icon name="members" size={32} /><Title>No member app connected</Title><p>Connect member accounts to show their memberships, workouts, classes, and payments here.</p></section>}

          <footer className="page-footer">
            <span>HeyGym · A little less admin. A lot more progress.</span>
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
                ["Age", `${profile.age} years`],
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
                <Button secondary onClick={() => setModal("Send reminder")}>
                  Send reminder
                </Button>
              </div>
              <Title>Attendance history</Title>
              <p className="muted">No attendance recorded for this member.</p>
              <Button
                secondary
                onClick={() => {
                  const updated = {
                    ...profile,
                    status: profile.status === "Frozen" ? "Active" : "Frozen",
                  }
                  setMembers((ms) =>
                    ms.map((m) => (m.email === profile.email ? updated : m)),
                  )
                  setProfile(updated)
                  notify("Membership status updated in this session")
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
                    ? "Record details · Session only"
                    : "Changes stay in this session. Reloading clears them."}
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
                  notify("Reminder saved as a demo draft — no message was sent")
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
              <form
                className="modal-body"
                onSubmit={(e) => {
                  e.preventDefault()
                  setModal("")
                  notify("Online class saved as a local demo draft")
                }}
              >
                <label>
                  Class title
                  <Input required placeholder="Morning mobility" />
                </label>
                <label>
                  Meeting link
                  <Input
                    required
                    type="url"
                    placeholder="https://meet.google.com/..."
                  />
                </label>
                <label>
                  Starts at
                  <Input required type="datetime-local" />
                </label>
                <div className="integration-note">
                  Use an existing meeting link. In-app video hosting is not
                  connected.
                </div>
                <Button type="submit">Save class draft</Button>
              </form>
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
                onSubmit={(e) => {
                  e.preventDefault()
                  const data = new FormData(e.currentTarget)
                  if (modal === "Add member") {
                    setMembers([
                      ...members,
                      {
                        name: String(data.get("name")),
                        email: String(data.get("email")),
                        phone: String(data.get("phone")),
                        age: Number(data.get("age")),
                        plan: String(data.get("plan")),
                        status: "Active",
                        joined: String(data.get("joined")),
                        expires: String(data.get("expires")),
                        due: "₹0",
                        trainer: "Unassigned",
                      },
                    ])
                    setTab("All members")
                    setQuery("")
                    setPlan("All plans")
                    go("Members")
                  } else if (modal === "Renew membership" && profile) {
                    const updated = {
                      ...profile,
                      status: "Active",
                      expires: String(data.get("expires")),
                    }
                    setMembers((ms) =>
                      ms.map((m) => (m.email === profile.email ? updated : m)),
                    )
                    setProfile(updated)
                  } else if (module) {
                    setRecords({
                      ...records,
                      [active]: [
                        ...(records[active] || []),
                        module.columns.map((_, i) =>
                          String(data.get(`field${i}`) || "Pending"),
                        ),
                      ],
                    })
                  } else if (active === "Memberships") {
                    setRecords({
                      ...records,
                      Memberships: [
                        ...(records.Memberships || []),
                        [
                          String(data.get("name")),
                          String(data.get("description")),
                        ],
                      ],
                    })
                  }
                  setModal("")
                  notify(
                    modal === "Create group"
                      ? "Group draft saved — live groups require a backend"
                      : "Saved to this session",
                  )
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
                    <div className="form-row">
                      <label>
                        Age
                        <Input
                          name="age"
                          type="number"
                          min="16"
                          max="100"
                          required
                          placeholder="28"
                        />
                      </label>
                      <label>
                        Membership plan
                        <Select name="plan">
                          <option>Unassigned</option>{(records.Memberships || []).map((r, i) => <option key={i}>{r[0]}</option>)}
                        </Select>
                      </label>
                    </div>
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
                <div className="modal-footer">
                  <Button secondary type="button" onClick={() => setModal("")}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {modal === "Add member"
                      ? "Add member"
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
