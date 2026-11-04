import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One loader shape for every screen: data, error, initial spinner, pull-to-
 * refresh. Screens differ in what they fetch, not in how they show fetching.
 *
 * Late results are dropped by a generation counter, so a refresh that lands
 * after unmount cannot set state on a dead screen.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const gen = useRef(0);

  const run = useCallback(
    async (mode: "initial" | "refresh") => {
      const mine = ++gen.current;
      if (mode === "refresh") setRefreshing(true);
      try {
        const next = await fn();
        if (mine !== gen.current) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (mine !== gen.current) return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (mine === gen.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    void run("initial");
    return () => {
      gen.current++;
    };
  }, [run]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => run("initial"),
    refresh: () => run("refresh"),
  };
}
