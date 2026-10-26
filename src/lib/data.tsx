import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/* ---------- Domain types (PRD modules 3–8, 10, 13, 14, 16) ---------- */

export type MemberStatus = "active" | "expiring" | "expired" | "frozen";

export type Member = {
  id: string;
  name: string;
  phone: string;
  planId: string;
  joined: string; // ISO date
  ends: string; // ISO date
  status: MemberStatus;
  trainerId: string | null;
  balance: number; // outstanding, minor-INR whole rupees
  visitsThisMonth: number;
  lastVisit: string | null; // ISO date
  notes?: string;
};

export type Plan = {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  joiningFee: number;
  openForNew: boolean;
  members: number;
};

export type Payment = {
  id: string;
  receipt: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: "UPI" | "Cash" | "Card" | "Bank transfer";
  date: string; // ISO
  status: "paid" | "pending" | "partial";
};

export type Attendance = {
  id: string;
  memberId: string;
  name: string;
  date: string; // ISO
  time: string; // HH:MM
};

export type LeadStage = "New" | "Contacted" | "Trial" | "Converted" | "Lost";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  source: "Walk-in" | "Instagram" | "Referral" | "Local ad" | "Google";
  interest: string;
  stage: LeadStage;
  ownerId: string;
  created: string;
  nextFollowUp: string | null;
  note?: string;
};

export type FollowUp = {
  id: string;
  about: string;
  kind: "Enquiry" | "Renewal" | "Overdue payment" | "Inactive member" | "Trial";
  due: string;
  assigneeId: string;
  done: boolean;
};

export type Employee = {
  id: string;
  name: string;
  role: "Owner" | "Manager" | "Receptionist" | "Trainer" | "Finance";
  phone: string;
  shift: string;
  salary: number;
  clients?: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  goal: string;
  weeks: number;
  memberId: string | null;
  memberName: string;
  trainerId: string;
  sessions: string[];
};

export type ClassSession = {
  id: string;
  name: string;
  trainerId: string;
  day: string;
  time: string;
  capacity: number;
  booked: number;
};

export type Expense = {
  id: string;
  category: string;
  note: string;
  amount: number;
  date: string;
  method: "UPI" | "Cash" | "Card" | "Bank transfer";
};

export type Ticket = {
  id: string;
  from: string;
  subject: string;
  category: string;
  status: "Open" | "In progress" | "Resolved";
  created: string;
};

/* ---------- Helpers ---------- */

const DAY = 86_400_000;

export function iso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

export function fmtINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function fmtDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function daysUntil(isoDate: string): number {
  return Math.round((new Date(isoDate + "T00:00:00").getTime() - Date.now()) / DAY);
}

export function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/* ---------- Seed data ---------- */

let seq = 100;
const uid = (prefix: string) => `${prefix}-${++seq}`;

const seedMembers: Member[] = [
  { id: "GYM-0001", name: "Arjun Mehta", phone: "98200 11223", planId: "p-annual", joined: iso(-320), ends: iso(45), status: "active", trainerId: "e-3", balance: 0, visitsThisMonth: 21, lastVisit: iso(-1) },
  { id: "GYM-0002", name: "Priya Sharma", phone: "98330 44556", planId: "p-quarter", joined: iso(-80), ends: iso(9), status: "expiring", trainerId: "e-4", balance: 0, visitsThisMonth: 14, lastVisit: iso(0) },
  { id: "GYM-0003", name: "Rahul Verma", phone: "98110 77889", planId: "p-monthly", joined: iso(-25), ends: iso(5), status: "expiring", trainerId: null, balance: 1500, visitsThisMonth: 8, lastVisit: iso(-3) },
  { id: "GYM-0004", name: "Sneha Iyer", phone: "99200 33445", planId: "p-annual", joined: iso(-200), ends: iso(165), status: "active", trainerId: "e-4", balance: 0, visitsThisMonth: 18, lastVisit: iso(-1) },
  { id: "GYM-0005", name: "Vikram Singh", phone: "98770 12345", planId: "p-monthly", joined: iso(-55), ends: iso(-25), status: "expired", trainerId: null, balance: 2500, visitsThisMonth: 0, lastVisit: iso(-31) },
  { id: "GYM-0006", name: "Ananya Rao", phone: "99000 55667", planId: "p-quarter", joined: iso(-60), ends: iso(30), status: "active", trainerId: "e-3", balance: 0, visitsThisMonth: 12, lastVisit: iso(0) },
  { id: "GYM-0007", name: "Karan Patel", phone: "97690 88990", planId: "p-monthly", joined: iso(-90), ends: iso(-1), status: "expired", trainerId: null, balance: 1000, visitsThisMonth: 2, lastVisit: iso(-12) },
  { id: "GYM-0008", name: "Meera Nair", phone: "98450 66778", planId: "p-annual", joined: iso(-150), ends: iso(215), status: "frozen", trainerId: "e-4", balance: 0, visitsThisMonth: 0, lastVisit: iso(-20) },
  { id: "GYM-0009", name: "Rohit Desai", phone: "98980 22110", planId: "p-pt", joined: iso(-40), ends: iso(50), status: "active", trainerId: "e-3", balance: 0, visitsThisMonth: 16, lastVisit: iso(0) },
  { id: "GYM-0010", name: "Divya Kapoor", phone: "99110 99001", planId: "p-quarter", joined: iso(-15), ends: iso(75), status: "active", trainerId: null, balance: 0, visitsThisMonth: 6, lastVisit: iso(-2) },
];

const seedPlans: Plan[] = [
  { id: "p-monthly", name: "Monthly", durationMonths: 1, price: 1800, joiningFee: 500, openForNew: true, members: 42 },
  { id: "p-quarter", name: "Quarterly", durationMonths: 3, price: 4800, joiningFee: 0, openForNew: true, members: 65 },
  { id: "p-annual", name: "Annual", durationMonths: 12, price: 15000, joiningFee: 0, openForNew: true, members: 96 },
  { id: "p-pt", name: "Personal Training", durationMonths: 3, price: 12000, joiningFee: 1000, openForNew: true, members: 18 },
];

const seedPayments: Payment[] = [
  { id: uid("pay"), receipt: "RCP-1041", memberId: "GYM-0002", memberName: "Priya Sharma", amount: 4800, method: "UPI", date: iso(-2), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1042", memberId: "GYM-0009", memberName: "Rohit Desai", amount: 12000, method: "Card", date: iso(-3), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1043", memberId: "GYM-0006", memberName: "Ananya Rao", amount: 4800, method: "Cash", date: iso(-4), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1044", memberId: "GYM-0010", memberName: "Divya Kapoor", amount: 4800, method: "UPI", date: iso(-5), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1045", memberId: "GYM-0003", memberName: "Rahul Verma", amount: 900, method: "Cash", date: iso(-6), status: "partial" },
  { id: uid("pay"), receipt: "RCP-1046", memberId: "GYM-0001", memberName: "Arjun Mehta", amount: 15000, method: "UPI", date: iso(-9), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1047", memberId: "GYM-0007", memberName: "Karan Patel", amount: 1800, method: "UPI", date: iso(-11), status: "pending" },
  { id: uid("pay"), receipt: "RCP-1048", memberId: "GYM-0005", memberName: "Vikram Singh", amount: 1800, method: "Cash", date: iso(-14), status: "pending" },
  { id: uid("pay"), receipt: "RCP-1036", memberId: "GYM-0004", memberName: "Sneha Iyer", amount: 15000, method: "UPI", date: iso(-17), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1035", memberId: "GYM-0009", memberName: "Rohit Desai", amount: 6000, method: "Cash", date: iso(-19), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1034", memberId: "GYM-0006", memberName: "Ananya Rao", amount: 1800, method: "UPI", date: iso(-21), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1033", memberId: "GYM-0001", memberName: "Arjun Mehta", amount: 6000, method: "Card", date: iso(-24), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1032", memberId: "GYM-0002", memberName: "Priya Sharma", amount: 4800, method: "UPI", date: iso(-27), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1031", memberId: "GYM-0010", memberName: "Divya Kapoor", amount: 1800, method: "Cash", date: iso(-29), status: "paid" },
  { id: uid("pay"), receipt: "RCP-1030", memberId: "GYM-0004", memberName: "Sneha Iyer", amount: 4800, method: "UPI", date: iso(-31), status: "paid" },
];

const seedAttendance: Attendance[] = [
  { id: uid("att"), memberId: "GYM-0002", name: "Priya Sharma", date: iso(0), time: "07:10" },
  { id: uid("att"), memberId: "GYM-0006", name: "Ananya Rao", date: iso(0), time: "07:25" },
  { id: uid("att"), memberId: "GYM-0009", name: "Rohit Desai", date: iso(0), time: "08:00" },
  { id: uid("att"), memberId: "GYM-0001", name: "Arjun Mehta", date: iso(-1), time: "06:45" },
  { id: uid("att"), memberId: "GYM-0004", name: "Sneha Iyer", date: iso(-1), time: "07:30" },
  { id: uid("att"), memberId: "GYM-0002", name: "Priya Sharma", date: iso(-1), time: "18:20" },
  { id: uid("att"), memberId: "GYM-0010", name: "Divya Kapoor", date: iso(-2), time: "19:05" },
  { id: uid("att"), memberId: "GYM-0001", name: "Arjun Mehta", date: iso(-2), time: "07:00" },
];

const seedLeads: Lead[] = [
  { id: uid("ld"), name: "Sameer Joshi", phone: "98220 10203", source: "Walk-in", interest: "Annual", stage: "New", ownerId: "e-2", created: iso(0), nextFollowUp: iso(1) },
  { id: uid("ld"), name: "Neha Gupta", phone: "98220 30405", source: "Instagram", interest: "Quarterly", stage: "Contacted", ownerId: "e-2", created: iso(-1), nextFollowUp: iso(2) },
  { id: uid("ld"), name: "Amit Kumar", phone: "98220 50607", source: "Referral", interest: "Personal Training", stage: "Trial", ownerId: "e-3", created: iso(-4), nextFollowUp: iso(0), note: "Trial session booked for today evening" },
  { id: uid("ld"), name: "Pooja Bhatt", phone: "98220 70809", source: "Local ad", interest: "Monthly", stage: "Converted", ownerId: "e-2", created: iso(-8), nextFollowUp: null },
  { id: uid("ld"), name: "Rakesh Yadav", phone: "98220 90102", source: "Google", interest: "Monthly", stage: "Lost", ownerId: "e-2", created: iso(-12), nextFollowUp: null, note: "Joined a gym closer to home" },
  { id: uid("ld"), name: "Tanvi Shah", phone: "98220 30406", source: "Instagram", interest: "Quarterly", stage: "New", ownerId: "e-2", created: iso(-1), nextFollowUp: iso(1) },
];

const seedFollowUps: FollowUp[] = [
  { id: uid("fu"), about: "Rahul Verma — plan ends in 5 days", kind: "Renewal", due: iso(0), assigneeId: "e-2", done: false },
  { id: uid("fu"), about: "Vikram Singh — ₹2,500 overdue", kind: "Overdue payment", due: iso(-1), assigneeId: "e-5", done: false },
  { id: uid("fu"), about: "Karan Patel — expired, win-back call", kind: "Inactive member", due: iso(0), assigneeId: "e-2", done: false },
  { id: uid("fu"), about: "Amit Kumar — post-trial conversion", kind: "Trial", due: iso(1), assigneeId: "e-3", done: false },
  { id: uid("fu"), about: "Sameer Joshi — first contact", kind: "Enquiry", due: iso(1), assigneeId: "e-2", done: true },
  { id: uid("fu"), about: "Meera Nair — freeze review", kind: "Inactive member", due: iso(2), assigneeId: "e-2", done: false },
];

const seedEmployees: Employee[] = [
  { id: "e-1", name: "Dhruv Malhotra", role: "Owner", phone: "98100 00001", shift: "Flexible", salary: 0 },
  { id: "e-2", name: "Sana Khan", role: "Manager", phone: "98100 00002", shift: "Morning", salary: 32000 },
  { id: "e-3", name: "Vivek Chauhan", role: "Trainer", phone: "98100 00003", shift: "Morning", salary: 26000, clients: 14 },
  { id: "e-4", name: "Riya Sethi", role: "Trainer", phone: "98100 00004", shift: "Evening", salary: 26000, clients: 11 },
  { id: "e-5", name: "Manoj Tiwari", role: "Receptionist", phone: "98100 00005", shift: "Morning", salary: 18000 },
  { id: "e-6", name: "Farah Ali", role: "Finance", phone: "98100 00006", shift: "Evening", salary: 24000 },
];

const seedWorkouts: WorkoutPlan[] = [
  { id: uid("wp"), name: "Foundation Strength", goal: "Build base strength", weeks: 8, memberId: "GYM-0010", memberName: "Divya Kapoor", trainerId: "e-3", sessions: ["Day A — Squat, Row, Press 4×8", "Day B — Deadlift, Pull-up, Bench 4×6", "Day C — Hypertrophy circuit"] },
  { id: uid("wp"), name: "Fat Loss Express", goal: "Conditioning", weeks: 6, memberId: "GYM-0006", memberName: "Ananya Rao", trainerId: "e-3", sessions: ["Mon — HIIT 30 min", "Wed — Full-body DB circuit", "Fri — Incline walk + core"] },
  { id: uid("wp"), name: "PT Block — Hypertrophy", goal: "Muscle gain", weeks: 12, memberId: "GYM-0009", memberName: "Rohit Desai", trainerId: "e-3", sessions: ["Push — Chest, shoulders, triceps", "Pull — Back, biceps", "Legs — Quads, hams, calves"] },
  { id: uid("wp"), name: "Postpartum Return", goal: "Mobility & core", weeks: 10, memberId: "GYM-0004", memberName: "Sneha Iyer", trainerId: "e-4", sessions: ["Core activation", "Glute & pelvic work", "Light full-body"] },
];

const seedClasses: ClassSession[] = [
  { id: uid("cs"), name: "Morning HIIT", trainerId: "e-3", day: "Mon / Wed / Fri", time: "06:30", capacity: 20, booked: 17 },
  { id: uid("cs"), name: "Yoga Flow", trainerId: "e-4", day: "Tue / Thu", time: "07:00", capacity: 15, booked: 12 },
  { id: uid("cs"), name: "Strength 101", trainerId: "e-3", day: "Tue / Thu", time: "19:00", capacity: 16, booked: 16 },
  { id: uid("cs"), name: "Zumba", trainerId: "e-4", day: "Sat", time: "09:00", capacity: 25, booked: 9 },
  { id: uid("cs"), name: "Boxing Basics", trainerId: "e-3", day: "Sun", time: "10:00", capacity: 18, booked: 6 },
];

const seedExpenses: Expense[] = [
  { id: uid("ex"), category: "Rent", note: "October rent", amount: 65000, date: iso(-3), method: "Bank transfer" },
  { id: uid("ex"), category: "Salaries", note: "October payroll", amount: 126000, date: iso(-2), method: "Bank transfer" },
  { id: uid("ex"), category: "Electricity", note: "Sept–Oct bill", amount: 12400, date: iso(-6), method: "UPI" },
  { id: uid("ex"), category: "Equipment", note: "2 dumbbell racks", amount: 18500, date: iso(-10), method: "UPI" },
  { id: uid("ex"), category: "Marketing", note: "Instagram campaign", amount: 6000, date: iso(-12), method: "Card" },
  { id: uid("ex"), category: "Cleaning", note: "Monthly contract", amount: 4500, date: iso(-15), method: "Cash" },
];

const seedTickets: Ticket[] = [
  { id: "TKT-081", from: "Priya Sharma", subject: "AC not working in the weights area", category: "Facility", status: "In progress", created: iso(-1) },
  { id: "TKT-082", from: "Rahul Verma", subject: "Wrong amount charged last month", category: "Billing", status: "Open", created: iso(0) },
  { id: "TKT-080", from: "Ananya Rao", subject: "Request to freeze membership", category: "Membership", status: "Resolved", created: iso(-6) },
];

const revenueHistory = [218000, 242000, 231000, 268000, 289000, 312000];

/* ---------- Store ---------- */

type Store = {
  members: Member[];
  plans: Plan[];
  payments: Payment[];
  attendance: Attendance[];
  leads: Lead[];
  followUps: FollowUp[];
  employees: Employee[];
  workouts: WorkoutPlan[];
  classes: ClassSession[];
  expenses: Expense[];
  tickets: Ticket[];
  revenueHistory: number[];
  addMember: (m: { name: string; phone: string; planId: string; paid: number; method: Payment["method"] }) => void;
  recordPayment: (p: { memberId: string; amount: number; method: Payment["method"] }) => void;
  checkIn: (memberId: string) => string | null;
  addLead: (l: { name: string; phone: string; source: Lead["source"]; interest: string }) => void;
  moveLead: (id: string, stage: LeadStage) => void;
  addFollowUp: (f: { about: string; kind: FollowUp["kind"]; due: string }) => void;
  toggleFollowUp: (id: string) => void;
  addPlan: (p: { name: string; durationMonths: number; price: number; joiningFee: number }) => void;
  addExpense: (e: { category: string; note: string; amount: number; method: Expense["method"] }) => void;
  addWorkout: (w: { name: string; goal: string; weeks: number; memberId: string; trainerId: string }) => void;
  bookClass: (id: string) => void;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;
  renewMember: (memberId: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState(seedMembers);
  const [plans, setPlans] = useState(seedPlans);
  const [payments, setPayments] = useState(seedPayments);
  const [attendance, setAttendance] = useState(seedAttendance);
  const [leads, setLeads] = useState(seedLeads);
  const [followUps, setFollowUps] = useState(seedFollowUps);
  const [employees] = useState(seedEmployees);
  const [workouts, setWorkouts] = useState(seedWorkouts);
  const [classes, setClasses] = useState(seedClasses);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [tickets, setTickets] = useState(seedTickets);

  const nextReceipt = useCallback(
    () => "RCP-" + (Math.max(0, ...payments.map((p) => Number(p.receipt.slice(4)))) + 1),
    [payments]
  );

  const addMember: Store["addMember"] = useCallback(
    ({ name, phone, planId, paid, method }) => {
      const plan = seedPlans.find((p) => p.id === planId);
      const id = "GYM-" + String(11 + members.length - 10).padStart(4, "0");
      const owed = (plan?.price ?? 0) + (plan?.joiningFee ?? 0);
      const memberName = name;
      setMembers((ms) => [
        {
          id,
          name,
          phone,
          planId,
          joined: iso(0),
          ends: iso((plan?.durationMonths ?? 1) * 30),
          status: "active",
          trainerId: null,
          balance: Math.max(owed - paid, 0),
          visitsThisMonth: 0,
          lastVisit: null,
        },
        ...ms,
      ]);
      if (paid > 0) {
        setPayments((ps) => [
          {
            id: uid("pay"),
            receipt: nextReceipt(),
            memberId: id,
            memberName,
            amount: paid,
            method,
            date: iso(0),
            status: paid >= owed ? "paid" : "partial",
          },
          ...ps,
        ]);
      }
      setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, members: p.members + 1 } : p)));
    },
    [members.length, nextReceipt]
  );

  const recordPayment: Store["recordPayment"] = useCallback(
    ({ memberId, amount, method }) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      setPayments((ps) => [
        {
          id: uid("pay"),
          receipt: nextReceipt(),
          memberId,
          memberName: member.name,
          amount,
          method,
          date: iso(0),
          status: amount >= member.balance ? "paid" : "partial",
        },
        ...ps,
      ]);
      setMembers((ms) =>
        ms.map((m) => (m.id === memberId ? { ...m, balance: Math.max(m.balance - amount, 0) } : m))
      );
    },
    [members, nextReceipt]
  );

  const checkIn: Store["checkIn"] = useCallback(
    (memberId) => {
      const member = members.find(
        (m) => m.id.toLowerCase() === memberId.toLowerCase() || m.name.toLowerCase() === memberId.toLowerCase()
      );
      if (!member) return "No member matches that ID or name.";
      if (attendance.some((a) => a.memberId === member.id && a.date === iso(0)))
        return `${member.name} has already checked in today.`;
      if (member.status === "expired")
        return `${member.name}'s membership expired — renew before check-in.`;
      setAttendance((as) => [
        { id: uid("att"), memberId: member.id, name: member.name, date: iso(0), time: new Date().toTimeString().slice(0, 5) },
        ...as,
      ]);
      setMembers((ms) =>
        ms.map((m) =>
          m.id === member.id
            ? { ...m, visitsThisMonth: m.visitsThisMonth + 1, lastVisit: iso(0) }
            : m
        )
      );
      return null;
    },
    [members, attendance]
  );

  const addLead: Store["addLead"] = useCallback((l) => {
    setLeads((ls) => [
      { ...l, id: uid("ld"), stage: "New", ownerId: "e-2", created: iso(0), nextFollowUp: iso(1) },
      ...ls,
    ]);
    setFollowUps((fs) => [
      { id: uid("fu"), about: `${l.name} — first contact`, kind: "Enquiry", due: iso(1), assigneeId: "e-2", done: false },
      ...fs,
    ]);
  }, []);

  const moveLead: Store["moveLead"] = useCallback((id, stage) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)));
  }, []);

  const addFollowUp: Store["addFollowUp"] = useCallback((f) => {
    setFollowUps((fs) => [{ ...f, id: uid("fu"), assigneeId: "e-2", done: false }, ...fs]);
  }, []);

  const toggleFollowUp: Store["toggleFollowUp"] = useCallback((id) => {
    setFollowUps((fs) => fs.map((f) => (f.id === id ? { ...f, done: !f.done } : f)));
  }, []);

  const addPlan: Store["addPlan"] = useCallback((p) => {
    setPlans((ps) => [...ps, { ...p, id: uid("p"), openForNew: true, members: 0 }]);
  }, []);

  const addExpense: Store["addExpense"] = useCallback((e) => {
    setExpenses((es) => [{ ...e, id: uid("ex"), date: iso(0) }, ...es]);
  }, []);

  const addWorkout: Store["addWorkout"] = useCallback(({ name, goal, weeks, memberId, trainerId }) => {
    const member = members.find((m) => m.id === memberId);
    setWorkouts((ws) => [
      { id: uid("wp"), name, goal, weeks, memberId, memberName: member?.name ?? "Unassigned", trainerId, sessions: ["Day A — to be planned", "Day B — to be planned"] },
      ...ws,
    ]);
  }, [members]);

  const bookClass: Store["bookClass"] = useCallback((id) => {
    setClasses((cs) =>
      cs.map((c) => (c.id === id && c.booked < c.capacity ? { ...c, booked: c.booked + 1 } : c))
    );
  }, []);

  const setTicketStatus: Store["setTicketStatus"] = useCallback((id, status) => {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const renewMember: Store["renewMember"] = useCallback((memberId) => {
    setMembers((ms) =>
      ms.map((m) =>
        m.id === memberId
          ? { ...m, status: "active", ends: iso(30), joined: iso(0), balance: 0 }
          : m
      )
    );
  }, []);

  const value = useMemo<Store>(
    () => ({
      members, plans, payments, attendance, leads, followUps, employees,
      workouts, classes, expenses, tickets, revenueHistory,
      addMember, recordPayment, checkIn, addLead, moveLead, addFollowUp,
      toggleFollowUp, addPlan, addExpense, addWorkout, bookClass,
      setTicketStatus, renewMember,
    }),
    [members, plans, payments, attendance, leads, followUps, employees, workouts,
     classes, expenses, tickets, addMember, recordPayment, checkIn, addLead,
     moveLead, addFollowUp, toggleFollowUp, addPlan, addExpense, addWorkout,
     bookClass, setTicketStatus, renewMember]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------- Derived selectors ---------- */

export function memberStatusTone(s: MemberStatus): "success" | "warning" | "danger" | "muted" {
  if (s === "active") return "success";
  if (s === "expiring") return "warning";
  if (s === "expired") return "danger";
  return "muted";
}

export function paymentStatusTone(s: Payment["status"]): "success" | "warning" | "muted" {
  if (s === "paid") return "success";
  if (s === "pending") return "warning";
  return "muted";
}
