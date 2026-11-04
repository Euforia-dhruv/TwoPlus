import Constants from "expo-constants";

/**
 * Backend configuration.
 *
 * These are the publishable Supabase values, not secrets: RLS is what protects
 * the data. They are read from app.json `extra` so a build can be pointed at a
 * different project without touching source, and fall back to the live project
 * so `expo start` works with no extra setup.
 */
type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const Env = {
  supabaseUrl:
    extra.supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "https://qhxgqyzrzqxwvriugnya.supabase.co",
  supabaseAnonKey:
    extra.supabaseAnonKey ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "sb_publishable_zxCxgia_G3yoGHXBrnV0-g_tdpQGJVe",
};
