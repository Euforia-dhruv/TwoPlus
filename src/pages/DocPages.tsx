import { Link } from "react-router-dom";
import "./marketing.css";

// Plain-language pages. Kept as one file because each is a title, a short intro
// and a list of points; splitting them would be three copies of the same shell.
type Section = { heading: string; body: string[] };

type Doc = {
  title: string;
  intro: string;
  sections: Section[];
  updated: string;
};

const PRIVACY: Doc = {
  title: "Privacy",
  intro:
    "What a TwoPlus workspace stores, where it lives, who can read it, and how to take it away or erase it.",
  updated: "Last updated 3 November 2026",
  sections: [
    {
      heading: "What is stored",
      body: [
        "Your account email, the name of your gym, and the records entered on your behalf: members, memberships, payments, attendance, classes, workout and diet plans, body measurements and staff. Nothing else is collected.",
        "Member photos, emergency contacts, date of birth and address are optional fields. If they are left blank, they are never stored.",
        "There is no analytics, advertising or tracking SDK in the app, on the web or in the mobile builds. Nothing about how you use a screen is sent anywhere.",
      ],
    },
    {
      heading: "Where it lives",
      body: [
        "Records sit in a Postgres database hosted by Supabase. Access is enforced by row level security in the database itself, so a workspace can only read rows that belong to it, and a staff role can only reach what that role is allowed to see.",
        "Progress photos are kept in a private storage bucket. They are served through links that expire after ten minutes, which is why they are never cached on the device.",
      ],
    },
    {
      heading: "Payments",
      body: [
        "TwoPlus records money that has already been collected. It does not process card payments, does not store card numbers, and has no payment gateway connected.",
      ],
    },
    {
      heading: "Who can see it",
      body: [
        "People added to your workspace, limited by their role: an owner or manager sees the workspace, a trainer sees the members assigned to them, a member sees only their own record. A role change applies on the next request.",
        "No TwoPlus employee reads member records as part of normal operation. Support means looking at a specific record only when you ask, and saying so first.",
      ],
    },
    {
      heading: "Taking your data with you",
      body: [
        "A member can download everything held about them from the member app: profile, memberships, payments, attendance, workout history, assigned plans, measurements and progress photo details. It arrives as a single JSON file.",
        "Gym staff can export any module they can see as a spreadsheet from the workspace.",
        "Write to hello@twoplus.fit if you want an export produced for you instead.",
      ],
    },
    {
      heading: "Deleting your account",
      body: [
        "A member can delete their own account from the member app. It needs a deliberate hold rather than a single click, because it cannot be undone.",
        "Deletion erases the identity fields on the member record (name, email, phone, date of birth, gender, address, emergency contacts, notes), the training log and its sets, body measurements, progress photos and the stored image files, both plan assignments, class bookings, attendance, internal staff notes, and the sign-in itself.",
        "Payments, invoices, membership rows and renewals are kept, attached to a member record that no longer identifies anyone. A gym has to be able to account for money it received and to answer a bank or a tax authority about it; a receipt is not a reason to keep someone's phone number.",
        "A gym owner cannot delete their account this way. The gym has to be transferred or closed first, so a workspace is never left without an owner.",
      ],
    },
    {
      heading: "How long it is kept",
      body: [
        "Health and training data goes as soon as the account is deleted. Financial records stay until the gym removes them, because retention of accounting records is the gym's legal obligation, not a preference.",
        "An archived member record, and a gym that has been closed, keep their rows until an operator deletes them. Suspending a gym makes it read-only and deletes nothing.",
      ],
    },
  ],
};

const TERMS: Doc = {
  title: "Terms",
  intro:
    "What you can expect from TwoPlus, and what is asked of you while your workspace is open.",
  updated: "Last updated 3 November 2026",
  sections: [
    {
      heading: "The agreement",
      body: [
        "TwoPlus gives a gym a workspace to run members, memberships, payments, attendance and payroll. Access is priced and agreed directly, based on how the gym runs. Nothing is charged until both sides agree a price in writing.",
      ],
    },
    {
      heading: "Your data is yours",
      body: [
        "You own the records you enter. They are not sold, published, or used to train anything. A member can export or erase their own record from the member app, as described in the privacy notice.",
      ],
    },
    {
      heading: "Keeping records lawful",
      body: [
        "A gym using TwoPlus is responsible for having a lawful basis to hold its members' data, for telling them what it collects, and for answering their requests. TwoPlus provides the mechanics: role-limited access, an export, and a self-service deletion.",
      ],
    },
    {
      heading: "What is asked of you",
      body: [
        "Use the workspace for a gym you are entitled to operate. Keep sign-in details to yourself. Do not attempt to read another gym's data or probe the database outside the application.",
      ],
    },
    {
      heading: "Availability",
      body: [
        "The workspace aims to be available during your opening hours and to give notice before planned maintenance. It is provided as it is, without a guarantee of uninterrupted access.",
      ],
    },
    {
      heading: "Ending it",
      body: [
        "You can stop at any time. Records are exported on request and the workspace is removed once the export is confirmed.",
      ],
    },
  ],
};

function DocPage({ doc }: { doc: Doc }) {
  return (
    <div className="mk">
      <div className="mk-doc">
        <header className="mk-doc-head">
          <Link to="/" className="mk-wordmark">
            TwoPlus
          </Link>
          <Link to="/" className="mk-link">
            Back to site
          </Link>
        </header>
        <h1>{doc.title}</h1>
        <p className="mk-doc-intro">{doc.intro}</p>
        <p className="mk-doc-updated">{doc.updated}</p>
        {doc.sections.map((section) => (
          <section className="mk-doc-section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        <p className="mk-doc-contact">
          Questions: <a href="mailto:hello@twoplus.fit">hello@twoplus.fit</a>
        </p>
      </div>
    </div>
  );
}

export function Privacy() {
  return <DocPage doc={PRIVACY} />;
}

export function Terms() {
  return <DocPage doc={TERMS} />;
}

export function NotFound() {
  return (
    <div className="mk">
      <div className="mk-missing">
        <h1>That page is not here.</h1>
        <p>
          The address may be out of date, or the page may have moved. The
          product page and the questions are still where you left them.
        </p>
        <div className="mk-actions">
          <Link to="/" className="mk-button">
            Back to TwoPlus
          </Link>
          <a href="/#questions" className="mk-link">
            Read the questions
          </a>
        </div>
      </div>
    </div>
  );
}
