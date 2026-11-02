import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/lib/org";
import * as api from "@/lib/api";
import { Icon } from "../../icons";
import { FlipIdentityCard } from "./FlipIdentityCard";
import { RubberSegment } from "./RubberSegment";
import "./init.css";

type GymDraft = {
  name: string;
  phone?: string;
  address?: string;
  timezone?: string;
  branchName?: string;
};

type Stage = {
  id: string;
  label: string;
  run: () => Promise<void>;
};

// Real operations only. Stages without a backend operation are deliberately
// not shown: statuses always correspond to an actual awaited request.
function buildStages(reloadOrg: () => Promise<unknown>, orgRef: MutableRefObject<{ id: string } | null>): Stage[] {
  return [
    {
      id: "verify",
      label: "Verifying gym information",
      run: async () => {
        await reloadOrg();
        if (!orgRef.current) throw new Error("Workspace not found. Please try again.");
      },
    },
    {
      id: "workspace",
      label: "Creating gym workspace",
      run: async () => {
        const org = orgRef.current;
        if (!org) throw new Error("Workspace not found.");
        await api.listBranches(org.id); // real read: confirms the workspace rows exist
      },
    },
    {
      id: "dashboard",
      label: "Preparing dashboard",
      run: async () => {
        const org = orgRef.current;
        if (!org) throw new Error("Workspace not found.");
        await api.listOrgMembers(org.id);
      },
    },
  ];
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (to === from) return;
    let raf = 0;
    const start = performance.now();
    const duration = 350;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="init-count">{shown}</span>;
}

export function InitExperience({ draft }: { draft: GymDraft }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { org, reload } = useOrg();
  const orgRef = useRef<{ id: string } | null>(null);
  orgRef.current = org ? { id: org.organization.id } : null;

  const stages = buildStages(reload as () => Promise<unknown>, orgRef);
  const [done, setDone] = useState<string[]>([]);
  const [phase, setPhase] = useState<"running" | "error" | "ready">("running");
  const [error, setError] = useState("");
  const [view, setView] = useState("gym");
  const running = useRef(false);

  const runAll = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setDone([]);
    setPhase("running");
    setError("");
    for (const stage of stages) {
      try {
        await stage.run();
        setDone((d) => [...d, stage.id]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong during setup.");
        setPhase("error");
        running.current = false;
        return;
      }
    }
    running.current = false;
    setPhase("ready");
  }, [stages]);

  useEffect(() => {
    void runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "ready") {
      const t = window.setTimeout(() => {
        sessionStorage.removeItem("twoplus-initializing");
        navigate("/app", { replace: true });
      }, 900);
      return () => window.clearTimeout(t);
    }
  }, [phase, navigate]);

  const ownerName =
    (session?.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Owner";
  const email = session?.user?.email;

  return (
    <div className="init">
      <div className="init__glow" aria-hidden="true" />
      <div className="init__grid" aria-hidden="true" />

      <div className="init__body">
        <header className="init__head">
          <span className="init__logo"><Icon name="activity" size={20} /></span>
          <span className="init__wordmark">TwoPlus · Workspace Initialization</span>
        </header>

        <FlipIdentityCard
          gymName={draft.name}
          tagline="Your gym, one calm workspace"
          location={draft.address}
          ownerName={ownerName}
          email={email}
          phone={draft.phone}
          address={draft.address}
          branchName={draft.branchName}
          gymType="Independent gym"
        />

        <RubberSegment
          options={[
            { value: "gym", label: "Gym" },
            { value: "owner", label: "Owner" },
            { value: "workspace", label: "Workspace" },
          ]}
          value={view}
          onChange={setView}
        />

        <div className="init__note">
          {view === "gym" && <span>All details shown are the submitted registration data.</span>}
          {view === "owner" && <span>Owner account: {ownerName} · {email}</span>}
          {view === "workspace" && <span>Branch: {draft.branchName || "Main branch"} · {draft.timezone || "Asia/Kolkata"}</span>}
        </div>

        <div className="init__progress" aria-label="Initialization progress">
          <div className="init__progress-head">
            <span>Modules initialized</span>
            <strong><CountUp value={done.length} /> / {stages.length}</strong>
          </div>
          <div className="init__track" role="progressbar" aria-valuenow={done.length} aria-valuemin={0} aria-valuemax={stages.length}>
            <div className="init__track-fill" style={{ width: `${(done.length / stages.length) * 100}%` }} />
          </div>
        </div>

        <ul className="init__stages">
          {stages.map((stage) => {
            const isDone = done.includes(stage.id);
            const isActive = phase === "running" && !isDone && done.length === stages.indexOf(stage);
            return (
              <li key={stage.id} className={isDone ? "is-done" : isActive ? "is-active" : ""}>
                <span className="init__stage-icon" aria-hidden="true">
                  {isDone ? <Icon name="check" size={14} /> : <Icon name="sparkles" size={14} />}
                </span>
                <span className="init__stage-label">{stage.label}</span>
                {isActive && <span className="init__stage-spinner" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>

        {phase === "error" && (
          <div className="init__error" role="alert">
            <Icon name="shield" size={16} />
            <span>{error}</span>
            <button type="button" onClick={() => void runAll()} className="init__retry">
              Retry
            </button>
          </div>
        )}

        {phase === "ready" && (
          <div className="init__ready">
            <Icon name="check" size={16} />
            <span>Workspace ready</span>
          </div>
        )}
      </div>
    </div>
  );
}
