import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "./supabase";
import { useAuth } from "./auth";
import type { OrgContext, OrgRole } from "./types";

type OrgState = {
  org: OrgContext | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const OrgContext = createContext<OrgState>({
  org: null,
  loading: true,
  error: null,
  reload: () => {},
});

// Loads the signed-in user's first organization + primary branch + role.
// RLS already scopes every query; this just resolves the context once.
export function OrgProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [org, setOrg] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!session) {
      setOrg(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = getSupabase();
    (async () => {
      const { data: membership, error: mErr } = await supabase
        .from("organization_members")
        .select("role, organizations(*)")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (mErr) {
        setError(mErr.message);
        setOrg(null);
        setLoading(false);
        return;
      }
      const row = membership as unknown as {
        role: OrgRole;
        organizations: {
          id: string;
          owner_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          timezone: string;
          currency: string;
        } | null;
      } | null;
      if (!row?.organizations) {
        setOrg(null); // signed up but not onboarded yet
        setLoading(false);
        return;
      }
      const { data: branch } = await supabase
        .from("branches")
        .select("*")
        .eq("organization_id", row.organizations.id)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setOrg({
        organization: row.organizations,
        branch: branch ?? null,
        role: row.role,
      });
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tick]);

  return (
    <OrgContext.Provider
      value={{
        org,
        loading,
        error,
        reload: () => setTick((t) => t + 1),
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgState {
  return useContext(OrgContext);
}
