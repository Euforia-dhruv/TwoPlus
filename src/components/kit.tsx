// Shared dashboard UI primitives. Extracted from App.tsx so the platform
// admin area (/admin) reuses the exact same components and styling.
import type { ReactNode } from "react";
import { Icon } from "../icons";

export function Button({
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
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="input" />;
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

export function Stats({ items }: { items: string[][] }) {
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
  );
}
