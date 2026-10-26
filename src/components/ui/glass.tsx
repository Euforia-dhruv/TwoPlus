import { useEffect, type ReactNode } from "react";

/* Frosted panel — the base surface of the whole app */
export function Panel({ children, className = "", interactive = false }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div className={`glass glass-edge rounded-2xl ${interactive ? "glass-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 md:px-6">
      <div>
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "muted" | "accent";

const toneStyles: Record<Tone, string> = {
  success: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/25",
  warning: "bg-amber-400/12 text-amber-300 ring-amber-400/25",
  danger: "bg-rose-400/12 text-rose-300 ring-rose-400/25",
  muted: "bg-white/6 text-slate-300 ring-white/12",
  accent: "bg-teal-400/12 text-teal-300 ring-teal-400/30",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}

const dotTone: Record<Tone, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  muted: "bg-slate-500",
  accent: "bg-teal-400",
};

export function Dot({ tone }: { tone: Tone }) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTone[tone]}`} aria-hidden="true" />;
}

/* Primary / quiet buttons */
export function Button({
  children, onClick, variant = "primary", type = "button", className = "", disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-teal-400/90 text-teal-950 hover:bg-teal-300 shadow-[0_4px_20px_rgb(45_212_191/0.25)] font-bold",
    ghost: "bg-white/6 text-slate-100 hover:bg-white/12 ring-1 ring-white/10 font-semibold",
    danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 ring-1 ring-rose-400/30 font-semibold",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-teal-400/50 ${className}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`h-9 w-full rounded-lg border border-white/10 bg-[#101620] px-2.5 text-sm text-slate-100 focus:border-teal-400/50 ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/* Modal — dim + blur backdrop, glass sheet */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass pop-enter w-full max-w-md rounded-2xl p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl" aria-hidden="true">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* Simple CSS bar chart, honest axis-free sparkbars */
export function Bars({ data, format }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-36 items-end gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
            {format ? format(d.value) : d.value}
          </span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-teal-500/35 to-teal-300/80 transition-all group-hover:from-teal-400/50 group-hover:to-teal-200"
            style={{ height: `${Math.max((d.value / max) * 100, 3)}%` }}
          />
          <span className="w-full truncate text-center text-[10px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* Horizontal proportion bar */
export function Meter({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "warning" | "danger" }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const bar = { accent: "bg-teal-400/80", warning: "bg-amber-400/80", danger: "bg-rose-400/80" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const init = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/30 to-indigo-400/30 text-[11px] font-bold text-teal-200 ring-1 ring-white/15 ${className}`}>
      {init}
    </span>
  );
}
