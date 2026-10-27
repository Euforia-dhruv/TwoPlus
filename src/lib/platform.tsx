import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "./supabase";
import { useAuth } from "./auth";
import { PlatformContext } from "./platform-context";

// Resolves the signed-in user's platform role once via a SECURITY DEFINER
// RPC (server decides; nothing client-supplied is trusted).
export function PlatformAdminProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [tick, setTick] = useState(0);
  const [resolved, setResolved] = useState<{ key: string; role: string | null } | null>(null);
  const key = session ? `${session.user.id}:${tick}` : "";

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await getSupabase().rpc("platform_admin_role");
        if (!cancelled) setResolved({ key, role: error ? null : (data as string | null) });
      } catch {
        if (!cancelled) setResolved({ key, role: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tick, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const role = resolved?.key === key ? resolved.role : null;
  const loading = !!session && resolved?.key !== key;

  return (
    <PlatformContext.Provider
      value={{ isAdmin: role === "super_admin", role, loading, reload }}
    >
      {children}
    </PlatformContext.Provider>
  );
}
