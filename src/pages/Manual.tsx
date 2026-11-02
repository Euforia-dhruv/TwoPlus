import { useNavigate } from "react-router-dom";
import { Icon } from "@/icons";
import InteractiveBook from "@/components/ui/interactive-book";
import GooeySearch from "@/components/ui/gooey-search";
import {
  NAV_CATEGORIES,
  pathFor,
  type NavCategory,
} from "@/lib/navigation";
import "@/pages/manual.css";

// The workspace manual. Content is derived from the navigation catalogue, so a
// module that is renamed or added shows up here without a second edit. The
// tables are the things a person actually forgets, not marketing copy.
const DB_MODULES = new Set([
  "Attendance",
  "Classes & PT",
  "Enquiries",
  "Follow-ups",
  "Payments",
  "Invoices",
  "Trainers & staff",
  "Expenses",
  "Branches",
  "Workouts",
  "Diet & nutrition",
]);

type Section = { heading: string; body: string[]; steps?: string[] };

const SECTIONS: Section[] = [
  {
    heading: "Your first ten minutes",
    body: [
      "A workspace is one gym business. Branches sit inside it, and every member, payment and record belongs to the branch you were viewing when you created it.",
    ],
    steps: [
      "Open Settings and pick Light or Dark. Only the owner can change this, and the choice is remembered per workspace.",
      "Add your branches first, so new members can be filed against the right one.",
      "Create your membership plans, then add members against a plan.",
      "Record a payment when money actually arrives. TwoPlus records money you have collected; it does not take card payments.",
    ],
  },
  {
    heading: "Members",
    body: [
      "Each member card shows the photograph, name, plan, expiry and any dues. Turn the card over with the flip button for phone, email, join date, trainer and dues on one side.",
      "Clicking a card opens the full profile: membership history, payments, check-ins, notes, workouts and measurements.",
    ],
    steps: [
      "Use the strip above the directory to filter by status. The number beside each label is a live count.",
      "Search by name, phone or email. The plan filter narrows the same list.",
      "Archiving a member is a hold-to-confirm action, so it cannot happen from a stray click.",
    ],
  },
  {
    heading: "Money",
    body: [
      "Payments records what came in. Invoices bill what is owed and settle against payments. Expenses tracks what leaves the business. The Overview adds them up for the current month.",
      "A voided invoice stays in the table for the audit trail; it is never deleted.",
    ],
  },
  {
    heading: "Attendance and the floor",
    body: [
      "Check a member in from Attendance. An open session is closed with a check-out, and the duration is calculated from the two timestamps.",
      "Equipment and Inventory are planning tables: they hold what you would otherwise keep in a spreadsheet.",
    ],
  },
  {
    heading: "People and access",
    body: [
      "Trainers & staff holds employee records. Access & roles decides what each person can do inside the workspace.",
      "Roles are owner, manager, trainer, receptionist and finance. A role change applies on the person's next request, so they never keep access they have just lost.",
    ],
  },
  {
    heading: "What this workspace does not do",
    body: [
      "TwoPlus does not send SMS, email or push notifications. Reminders are in-app only, and they are visible to people who open the workspace.",
      "It does not process card payments and never stores card numbers.",
      "The Community and Marketplace areas need a connected service before they carry real conversations or orders.",
    ],
  },
];

function SectionBody({ section }: { section: Section }) {
  return (
    <div className="manual-section">
      <h3>{section.heading}</h3>
      {section.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {section.steps && (
        <ol>
          {section.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CategoryPage({ category }: { category: NavCategory }) {
  return (
    <div className="manual-section">
      <h3>{category.label}</h3>
      <ul className="manual-modules">
        {category.items.map((item) => (
          <li key={item.id}>
            <Icon name={item.icon} size={14} />
            <span>{item.label}</span>
            <em>
              {DB_MODULES.has(item.label)
                ? "Stores records"
                : "Planning view"}
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Manual() {
  const navigate = useNavigate();

  const pages = [
    ...SECTIONS.map((section, i) => ({
      title: section.heading,
      pageNumber: i + 1,
      content: <SectionBody section={section} />,
    })),
    ...NAV_CATEGORIES.map((category, i) => ({
      title: category.label,
      pageNumber: SECTIONS.length + i + 1,
      content: <CategoryPage category={category} />,
    })),
  ];

  return (
    <main className="manual">
      <section className="manual-book">
        <InteractiveBook
          coverImage="/backdrop.jpg"
          bookTitle="Workspace manual"
          bookAuthor="TwoPlus"
          pages={pages}
          width={420}
          height={520}
        />
      </section>

      <section className="manual-list">
        <div className="manual-search">
          {/* Local search over the real module list: no network, no fake
              results, and picking one navigates to the module itself. */}
          <GooeySearch
            items={NAV_CATEGORIES.flatMap((c) =>
              c.items.map((i) => `${c.label} · ${i.label}`),
            )}
            placeholder="Search the manual by module"
            buttonLabel="Find"
            onSelect={(value) => {
              const label = value.split(" · ").pop();
              const target = NAV_CATEGORIES.flatMap((c) => c.items).find(
                (i) => i.label === label,
              );
              if (target) navigate(pathFor(target));
            }}
          />
        </div>
        <div className="manual-grid">
          {NAV_CATEGORIES.map((category) => (
            <div className="manual-card" key={category.id}>
              <strong>
                <Icon name={category.icon} size={15} />
                {category.label}
              </strong>
              <div className="manual-links">
                {category.items.map((item) => (
                  <button key={item.id} onClick={() => navigate(pathFor(item))}>
                    {item.label}
                    <Icon name="arrow" size={12} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
