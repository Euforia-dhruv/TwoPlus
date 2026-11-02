import type { IconName } from "@/icons";

// Central navigation configuration for the two-level workspace nav.
// Primary = categories (side dock), secondary = items (top floating dock).
// `label` is the existing module name the rest of the app is keyed by
// (modules record, writeRoles, data loaders), so URLs and state map cleanly
// onto the legacy in-app module keys.

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
};

export type NavCategory = {
  id: string;
  label: string;
  icon: IconName;
  items: NavItem[];
};

const item = (id: string, label: string, icon: IconName): NavItem => ({ id, label, icon });

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "dashboard",
    items: [item("overview", "Overview", "dashboard")],
  },
  {
    id: "people",
    label: "People",
    icon: "members",
    items: [
      item("members", "Members", "members"),
      item("trainers-staff", "Trainers & staff", "dumbbell"),
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "checkin",
    items: [
      item("attendance", "Attendance", "checkin"),
      item("equipment", "Equipment", "dumbbell"),
      item("inventory", "Inventory", "package"),
      item("branches", "Branches", "building"),
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: "calendar",
    items: [
      item("classes-pt", "Classes & PT", "calendar"),
      item("workouts", "Workouts", "activity"),
      item("diet-nutrition", "Diet & nutrition", "apple"),
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: "message",
    items: [
      item("community", "Community", "message"),
      item("reminders", "Reminders", "bell"),
      item("customer-support", "Customer support", "headset"),
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "wallet",
    items: [
      item("payments", "Payments", "wallet"),
      item("memberships", "Memberships", "ticket"),
      item("invoices", "Invoices", "receipt"),
      item("expenses", "Expenses", "receipt"),
      item("payroll", "Payroll", "wallet"),
    ],
  },
  {
    id: "growth",
    label: "Growth",
    icon: "chart",
    items: [
      item("enquiries", "Enquiries", "userPlus"),
      item("follow-ups", "Follow-ups", "clipboard"),
      item("offers-referrals", "Offers & referrals", "gift"),
      item("feedback", "Feedback", "sparkles"),
      item("reports", "Reports", "chart"),
      item("marketplace", "Marketplace", "shop"),
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    items: [
      item("settings", "Settings", "settings"),
      item("access-roles", "Access & roles", "shield"),
      item("member-app", "Member app", "mobile"),
      item("manual", "Workspace manual", "clipboard"),
    ],
  },
];

export const DEFAULT_CATEGORY = NAV_CATEGORIES[0];
export const DEFAULT_ITEM = DEFAULT_CATEGORY.items[0];

export function categoryOfLabel(label: string): NavCategory | undefined {
  return NAV_CATEGORIES.find((c) => c.items.some((i) => i.label === label));
}

export function itemById(id: string): NavItem | undefined {
  for (const c of NAV_CATEGORIES) {
    const found = c.items.find((i) => i.id === id);
    if (found) return found;
  }
  return undefined;
}

export function itemByLabel(label: string): NavItem | undefined {
  for (const c of NAV_CATEGORIES) {
    const found = c.items.find((i) => i.label === label);
    if (found) return found;
  }
  return undefined;
}

export function pathFor(item: NavItem): string {
  const category = categoryOfLabel(item.label) ?? DEFAULT_CATEGORY;
  return `/app/${category.id}/${item.id}`;
}
