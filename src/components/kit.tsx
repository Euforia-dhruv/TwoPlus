// Shared dashboard UI primitives. Extracted from App.tsx so the platform
// admin area (/admin) reuses the exact same components and styling.
import type { ReactNode } from "react";

// type="button" by default: without it every Button inside a <form> silently
// submits. Form buttons opt in with an explicit type="submit".
export function Button({
  children,
  secondary,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      type={type}
      className={`btn ${secondary ? "secondary" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`.trim()} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className || ""}`.trim()} />;
}

export function Title({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props}>{children}</h2>;
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${
        [
          "Active",
          "Paid",
          "Completed",
          "Resolved",
          "In stock",
          "Verified",
        ].includes(String(children))
          ? "green"
          : [
              "Expired",
              "Overdue",
              "Low stock",
              "Suspended",
              "Cancelled",
              "Failed",
            ].includes(String(children))
              ? "red"
              : [
                  "Expiring soon",
                  "Pending",
                  "Due",
                  "Open",
                  "Trial",
                  "Trialing",
                  "Past due",
                  "In progress",
                ].includes(String(children))
                ? "amber"
                : ""
      }`}
    >
      <i />
      {children}
    </span>
  );
}

export function Avatar({ name, small }: { name: string; small?: boolean }) {
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
  );
}

// One strip, not a row of cards: figures read as a single instrument panel
// and the shared edges stop every page looking like the same card grid.
export function Stats({ items }: { items: string[][] }) {
  return (
    <div className="stats">
      {items.map(([label, value, detail]) => (
        <section key={label} className="stat">
          <span className="stat-label">{label}</span>
          <strong>{value}</strong>
          <span className="stat-note">
            <span className={detail.startsWith("+") ? "positive" : ""}>
              {detail}
            </span>
          </span>
        </section>
      ))}
    </div>
  );
}
