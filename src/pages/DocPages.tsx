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
    "A short description of what a TwoPlus workspace stores, where it lives, and who can read it.",
  updated: "Last updated 2 November 2026",
  sections: [
    {
      heading: "What is stored",
      body: [
        "Your account email, the name of your gym, and the records you enter: members, memberships, payments, attendance and staff. Nothing else is collected.",
        "Member photos and emergency contacts are optional fields. If you do not fill them in, they are never stored.",
      ],
    },
    {
      heading: "Where it lives",
      body: [
        "Records sit in a Postgres database hosted by Supabase. Access is enforced by row level security in the database itself, so a workspace can only read rows that belong to it, and a staff role can only reach what that role is allowed to see.",
      ],
    },
    {
      heading: "Payments",
      body: [
        "TwoPlus records money you have already collected. It does not process card payments and does not store card numbers.",
      ],
    },
    {
      heading: "Who can see it",
      body: [
        "People you have added to your workspace, limited by their role. You can change or remove a role at any time, and the change applies on the next request.",
      ],
    },
    {
      heading: "Export and deletion",
      body: [
        "Every record can be exported as a spreadsheet. Deleting a workspace removes the rows from the database rather than hiding them.",
        "Write to hello@twoplus.fit to request an export or a deletion if you would rather we did it for you.",
      ],
    },
  ],
};

const TERMS: Doc = {
  title: "Terms",
  intro:
    "What you can expect from TwoPlus, and what we ask of you while your workspace is open.",
  updated: "Last updated 2 November 2026",
  sections: [
    {
      heading: "The agreement",
      body: [
        "TwoPlus gives your gym a workspace to run members, memberships, payments, attendance and payroll. Access is priced and agreed with you directly, based on how your gym runs. Nothing is charged until both sides agree a price in writing.",
      ],
    },
    {
      heading: "Your data is yours",
      body: [
        "You own the records you enter. We do not sell them, publish them, or use them to train anything. On request they are exported to a spreadsheet and the workspace is removed.",
      ],
    },
    {
      heading: "What we ask",
      body: [
        "Use the workspace for a gym you are entitled to operate. Keep your sign-in details to yourself. Do not attempt to read another gym's data or to probe the database outside the application.",
      ],
    },
    {
      heading: "Availability",
      body: [
        "We aim to keep the workspace available during your opening hours and to tell you before planned maintenance. The service is provided as it is, without a guarantee of uninterrupted access.",
      ],
    },
    {
      heading: "Ending it",
      body: [
        "You can stop at any time. We will export your records on request and remove the workspace once the export is confirmed.",
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
