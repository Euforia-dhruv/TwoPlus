import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton so the landing/dashboard bundle never throws at import time
// when env vars are absent (e.g. static preview without secrets).
// shortcut: client is untyped until `supabase gen types` is wired; row shapes
// live in ./types.ts and are asserted at the call sites.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
