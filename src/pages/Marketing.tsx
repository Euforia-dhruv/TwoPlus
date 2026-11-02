import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import "./marketing.css";

const QUESTIONS = [
  {
    q: "Do I have to move my existing records?",
    a: "No. Import your member list from a spreadsheet and TwoPlus takes name, phone, plan and join date. Memberships and payments that already happened can be entered as opening balances, so your reports start correct on day one.",
  },
  {
    q: "Does it take online payments?",
    a: "Not yet. TwoPlus records the money you have actually collected, by cash, UPI, card or bank transfer, and keeps dues visible until they are settled. When a payment gateway is connected it will be labelled as connected; until then nothing pretends to charge a card.",
  },
  {
    q: "What happens to my data if I leave?",
    a: "It is yours. Every record can be exported as a spreadsheet, and deleting the workspace removes the rows from the database rather than hiding them.",
  },
  {
    q: "Can staff see the money?",
    a: "Only if you let them. Roles are enforced by the database, not the screen: a receptionist can check a member in without being able to read payroll, and an owner can change a role at any time.",
  },
  {
    q: "Does it work on a phone at the front desk?",
    a: "Yes. Checking in, member search and dues all work at phone width with touch targets sized for a thumb, which is where most visits actually happen.",
  },
];

const PREVIEWS = {
  today: {
    label: "Today",
    figure: "38",
    caption: "checked in so far",
    rows: [
      ["Aarav Mehta", "Floor plan", "07:12", "Active"],
      ["Ishita Rao", "Personal training", "07:40", "Active"],
      ["Kabir Shah", "Floor plan", "08:05", "Active"],
      ["Meera Nair", "Floor plan", "08:21", "Expiring"],
    ],
    columns: ["Member", "Plan", "In", "Status"],
  },
  money: {
    label: "This month",
    figure: "₹4,86,000",
    caption: "collected, 11 dues open",
    rows: [
      ["Aarav Mehta", "Quarterly", "12 Oct", "Paid"],
      ["Ishita Rao", "Monthly", "12 Oct", "Paid"],
      ["Kabir Shah", "Annual", "11 Oct", "Paid"],
      ["Meera Nair", "Monthly", "09 Oct", "Due"],
    ],
    columns: ["Member", "Plan", "Date", "Status"],
  },
  team: {
    label: "Team",
    figure: "6",
    caption: "on the roster this week",
    rows: [
      ["Rohit Verma", "Trainer", "42 hrs", "Active"],
      ["Sana Qureshi", "Trainer", "38 hrs", "Active"],
      ["Dev Patel", "Reception", "44 hrs", "Active"],
      ["Nisha Iyer", "Manager", "40 hrs", "Active"],
    ],
    columns: ["Person", "Role", "Hours", "Status"],
  },
} as const;

type PreviewKey = keyof typeof PREVIEWS;

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#questions", label: "Questions" },
];

const IMAGES = {
  rack: "photo-1534438327276-14e5300c3a48",
  lift: "photo-1517836357463-d25dfeac3438",
  floor: "photo-1671970922029-0430d2ae122c",
  ropes: "photo-1599058917212-d750089bc07e",
  gym: "photo-1571019613454-1cb2f99b2d8b",
  room: "photo-1540497077202-7c8a3999166f",
  train: "photo-1583454110551-21f2fa2afe61",
};

function img(id: string, w: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;
}

// Reveals a block once, when it is first scrolled into view. Content is visible
// by default so a failed observer never hides the page.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.revealed = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.revealed = "true";
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`mk-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}

// Marks the link whose section is currently on screen, so the bar always says
// where you are. Observes the sections the links point at and keeps the last one
// that crossed the trigger line.
function useCurrentSection(ids: string[]) {
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return current;
}

// Each word lifts to full colour as it crosses the middle of the viewport, in
// reading order. The words are split here rather than in the markup so the
// sentence stays one readable string in the source.
function Tagline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>(".mk-word"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((word) => (word.dataset.on = "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.on = "true";
            io.unobserve(entry.target);
          }
        }
      },
      // The generous top margin makes "already above the line" count as crossed,
      // so a word is still lit when the page opens mid document or jumps past it.
      { rootMargin: "9999px 0px -45% 0px" },
    );
    words.forEach((word) => io.observe(word));
    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={ref}>
      {lines.map((line) => (
        <span className="mk-line" key={line}>
          {line.split(" ").map((word) => (
            <span className="mk-word" key={word}>
              {word}{" "}
            </span>
          ))}
        </span>
      ))}
    </h2>
  );
}

export default function Marketing() {
  const { session, loading } = useAuth();
  const [preview, setPreview] = useState<PreviewKey>("today");
  const [menuOpen, setMenuOpen] = useState(false);
  const current = useCurrentSection(["product", "questions"]);
  const panel = PREVIEWS[preview];

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Owners who are already signed in belong in the product, not on the pitch.
  if (loading) return <div className="mk-splash">TwoPlus</div>;
  if (session) return <Navigate to="/home" replace />;

  return (
    <div className="mk" id="top">
      <a className="mk-skip" href="#main">
        Skip to content
      </a>

      <header className="mk-nav">
        <Link to="/" className="mk-wordmark">
          TwoPlus
        </Link>
        <nav className="mk-nav-links" aria-label="Sections">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={current === link.href.slice(1) ? "true" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mk-nav-actions">
          <Link to="/login" className="mk-link">
            Sign in
          </Link>
          <Link to="/signup" className="mk-button">
            Start free
          </Link>
          <button
            type="button"
            className="mk-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mk-menu" role="dialog" aria-label="Menu">
          <div className="mk-menu-head">
            <span className="mk-wordmark">TwoPlus</span>
            <button
              type="button"
              className="mk-menu-toggle"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              Close
            </button>
          </div>
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mk-menu-foot">
            <Link to="/login" className="mk-button mk-button--block" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <Link to="/signup" className="mk-button mk-button--block" onClick={() => setMenuOpen(false)}>
              Start free
            </Link>
          </div>
        </div>
      )}

      <main id="main">
        {/* ---------- Masthead ---------- */}
        <section className="mk-masthead">
          <div className="mk-masthead-band">
            <figure className="mk-plate mk-plate--wide">
              <img
                src={img(IMAGES.rack, 1400)}
                width={1400}
                height={900}
                alt="A rack of dumbbells in a training room, with a member working in the background."
              />
            </figure>
            <figure className="mk-plate">
              <img
                src={img(IMAGES.lift, 900)}
                width={900}
                height={1200}
                alt="A lifter setting up for a barbell deadlift on a tiled gym floor."
              />
            </figure>
            <figure className="mk-plate mk-plate--narrow">
              <img
                src={img(IMAGES.floor, 700)}
                width={700}
                height={1000}
                alt="A gym floor between sets, weights left in place."
              />
            </figure>
          </div>

          <div className="mk-title-row">
            <p className="mk-axis-note">
              Gym management
              <br />
              for independent gyms
            </p>
            <div className="mk-title-body">
              <h1>
                Your gym,
                <br />
                one workspace.
              </h1>
              <p className="mk-standfirst">
                Members, memberships, payments, attendance and payroll in one
                system. No double entry, and a number you can trust at the end
                of the month.
              </p>
              <div className="mk-actions">
                <Link to="/signup" className="mk-button mk-button--lg">
                  Start free
                </Link>
                <a href="#product" className="mk-link mk-link--lg">
                  See what it does
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Features: fixed output, live controls ---------- */}
        <section className="mk-features" id="product">
          <div className="mk-features-output">
            <div className="mk-window" data-ui>
              <div className="mk-window-bar">
                <span className="mk-window-dot" />
                <span className="mk-window-dot" />
                <span className="mk-window-dot" />
                <span className="mk-window-name">TwoPlus · {panel.label}</span>
              </div>
              <div className="mk-window-body">
                <div className="mk-window-figure">
                  <span className="mk-window-label">{panel.label}</span>
                  <strong>{panel.figure}</strong>
                  <span className="mk-window-caption">{panel.caption}</span>
                </div>
                <table className="mk-window-table">
                  <thead>
                    <tr>
                      {panel.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {panel.rows.map((r) => (
                      <tr key={r[0]}>
                        {r.map((cell, i) => (
                          <td key={i}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mk-window-note">Product preview · sample figures</p>
            </div>
          </div>

          <div className="mk-features-read">
            <h2>What the desk checks first</h2>

            <Reveal className="mk-feature-block">
              <p className="mk-feature-line">Know who is on the floor.</p>
              <p className="mk-feature-text">
                Visits land on one screen as they happen, with the plan each
                member is on, so a lapsed membership is caught at the door
                rather than at renewal.
              </p>
            </Reveal>

            <Reveal className="mk-feature-block">
              <p className="mk-feature-line">See the money before it is asked for.</p>
              <p className="mk-feature-text">
                Collections, dues and expenses share one ledger. The month's
                figure is arithmetic over your records, not an estimate typed
                into a spreadsheet.
              </p>
            </Reveal>

            <Reveal className="mk-feature-block">
              <p className="mk-feature-line">Pay the team without a second file.</p>
              <p className="mk-feature-text">
                Working hours, roles and salary sit beside the attendance they
                came from, so payroll closes from the same data the floor
                produced.
              </p>
            </Reveal>

            <div className="mk-control">
              <span className="mk-control-label">Preview a screen</span>
              <div className="mk-segmented" role="group" aria-label="Preview a screen">
                {(Object.keys(PREVIEWS) as PreviewKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="mk-segment"
                    aria-pressed={preview === key}
                    onClick={() => setPreview(key)}
                  >
                    {PREVIEWS[key].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Showcase band ---------- */}
        <section className="mk-showcase">
          <Reveal>
            <h2>The floor, the desk, the books</h2>
          </Reveal>
          <div className="mk-band">
            <figure className="mk-band-panel" style={{ flexGrow: 5 }}>
              <img
                src={img(IMAGES.ropes, 1200)}
                width={1200}
                height={1500}
                loading="lazy"
                alt="A member working battle ropes under a concrete overpass."
              />
              <figcaption>Conditioning, between sets</figcaption>
            </figure>
            <figure className="mk-band-panel" style={{ flexGrow: 2 }}>
              <img
                src={img(IMAGES.gym, 700)}
                width={700}
                height={1400}
                loading="lazy"
                alt="Training equipment arranged on a gym floor."
              />
            </figure>
            <figure className="mk-band-panel" style={{ flexGrow: 3 }}>
              <img
                src={img(IMAGES.room, 900)}
                width={900}
                height={1400}
                loading="lazy"
                alt="A quiet training room between sessions."
              />
            </figure>
            <figure className="mk-band-panel" style={{ flexGrow: 2 }}>
              <img
                src={img(IMAGES.train, 700)}
                width={700}
                height={1400}
                loading="lazy"
                alt="A lifter partway through a set with a loaded bar."
              />
            </figure>
          </div>
          <p className="mk-band-caption">
            Most check-ins happen on a phone at the front desk. Every screen is
            built for that first.
          </p>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="mk-steps">
          <Reveal className="mk-step">
            <p className="mk-step-line">First you add your members.</p>
            <p className="mk-step-text">
              A spreadsheet import, or type the first ten by hand. Photos and
              emergency contacts are optional.
            </p>
          </Reveal>
          <Reveal className="mk-step">
            <p className="mk-step-line">Then plans and payments follow.</p>
            <p className="mk-step-text">
              Set your plans once. Every join, renewal and due attaches to the
              member it belongs to.
            </p>
          </Reveal>
          <Reveal className="mk-step">
            <p className="mk-step-line">Check-ins run themselves.</p>
            <p className="mk-step-text">
              Search a name or scan a code. The visit is recorded against the
              membership that paid for it.
            </p>
          </Reveal>
          <Reveal className="mk-step mk-step--last">
            <p className="mk-step-line">The month closes in one report.</p>
            <p className="mk-step-text">
              Collections, dues, expenses and visits per month, side by side,
              generated from the records you already have.
            </p>
          </Reveal>
        </section>

        {/* ---------- Questions ---------- */}
        <section className="mk-faq" id="questions">
          <div className="mk-faq-band mk-faq-band--head">
            <h2>Asked before signing up</h2>
          </div>
          {QUESTIONS.map((item, i) => (
            <div className={`mk-faq-band ${i % 2 ? "mk-faq-band--alt" : ""}`} key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </section>

        {/* ---------- Tagline: one word at a time ---------- */}
        <section className="mk-tagline">
          <Tagline lines={["Less admin.", "More progress."]} />
        </section>

        {/* ---------- Close ---------- */}
        <section className="mk-close">
          <div className="mk-close-facts">
            <p className="mk-close-fact">
              <strong>Minutes to set up</strong>
              A workspace and your first plan, before your next shift.
            </p>
            <p className="mk-close-fact">
              <strong>One import</strong>
              Your member list comes over from a spreadsheet, not by hand.
            </p>
            <p className="mk-close-fact">
              <strong>Set up with us</strong>
              Pricing is agreed with you directly, based on how your gym runs.
            </p>
          </div>
          <div className="mk-close-foot">
            <p>
              Set up a workspace in a few minutes and import your member list
              when you are ready. Nothing is charged until you and we agree a
              price.
            </p>
            <Link to="/signup" className="mk-button mk-button--lg">
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="mk-footer">
        <p className="mk-footer-mark">TwoPlus</p>
        <div className="mk-footer-row">
          <div className="mk-footer-places">
            <a href="mailto:hello@twoplus.fit">hello@twoplus.fit</a>
            <span>Built for gyms in India</span>
          </div>
          <div className="mk-footer-cols">
            <div>
              <span>Product</span>
              <a href="#product">What it does</a>
              <a href="#questions">Questions</a>
            </div>
            <div>
              <span>Account</span>
              <Link to="/login">Sign in</Link>
              <Link to="/signup">Create a workspace</Link>
            </div>
            <div>
              <span>Company</span>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="mk-footer-legal">
          <span>TwoPlus · A little less admin. A lot more progress.</span>
          <a href="#top">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
