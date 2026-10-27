import type { ReactNode } from "react";
import { Icon } from "@/icons";
import "./auth.css";

// Split-screen shell for auth pages. Left: brand panel (desktop only).
// Right: the form card. Mobile collapses to a single column.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-brand-logo">
          <Icon name="activity" size={24} />
          HeyGym
        </div>
        <div className="auth-brand-copy">
          <h2>
            Run your gym on <em>one</em> calm workspace.
          </h2>
          <p>
            Members, memberships, payments, attendance and your team — connected,
            secure, and organised by gym.
          </p>
          <ul className="auth-brand-points">
            <li>
              <Icon name="shield" size={15} /> Every gym's data isolated and encrypted
            </li>
            <li>
              <Icon name="wallet" size={15} /> Track collections, dues and expenses live
            </li>
            <li>
              <Icon name="checkin" size={15} /> Front-desk check-ins in seconds
            </li>
          </ul>
        </div>
        <div className="auth-brand-footer">HEYGYM · A LITTLE LESS ADMIN</div>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Icon name="activity" size={20} />
            HeyGym
          </div>
          <header>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
          {footer && <div className="auth-alt">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
