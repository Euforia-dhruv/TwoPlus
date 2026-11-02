import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/icons";
import { WaveGridBackground } from "@/components/ui/wave-grid-background";
import "./auth.css";

// Split-screen shell for auth pages. Left: brand panel (desktop only).
// Right: the form card. Mobile collapses to a single column.
// `wave` switches the whole page to a full-bleed animated grid wall with a
// small glass card centred in front of it; `glass` frosts the card. Both are
// opt-in so the other auth screens keep their flat surface.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wave = false,
  glass = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  wave?: boolean;
  glass?: boolean;
}) {
  const colors = useWallColors();
  const cardClass = glass ? "auth-card auth-card--glass" : "auth-card";

  if (wave) {
    return (
      <div className="auth-page auth-page--wall">
        <div className="auth-page-wall">
          <WaveGridBackground colorBase={colors?.base} colorHigh={colors?.high} />
        </div>
        <main className="auth-panel">
          <div className={cardClass}>
            <div className="auth-wall-logo">
              <Icon name="activity" size={20} />
              TwoPlus
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

  return (
    <div className="auth-page">
      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-brand-logo">
          <Icon name="activity" size={24} />
          TwoPlus
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
        <div className="auth-brand-footer">TWOPLUS · A LITTLE LESS ADMIN</div>
      </aside>
      <main className="auth-panel">
        <div className={cardClass}>
          <div className="auth-mobile-brand">
            <Icon name="activity" size={20} />
            TwoPlus
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

// The wall reads its two colours from the active theme tokens so it rides
// along with every design language instead of hardcoding white/blue.
function useWallColors() {
  const [colors, setColors] = useState<{ base: string; high: string } | null>(null);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setColors({
      base: cs.getPropertyValue("--app-bg").trim() || "#0b1012",
      high: cs.getPropertyValue("--lime").trim() || "#36d6c0",
    });
  }, []);
  return colors;
}
