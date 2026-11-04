import { Env } from "./env";

/**
 * Supabase client for the member app.
 *
 * Storage: expo-secure-store encrypts at rest on iOS (Keychain) and Android
 * (Keystore). SecureStore has a 2048-byte value limit, and a Supabase session
 * (access JWT + refresh token + user object + MFA state) routinely exceeds it,
 * so we keep the session in one SecureStore key and let AsyncStorage hold
 * nothing security-relevant.
 *
 * Detect session on web too: expo-secure-store has no web implementation, so
 * that platform falls back to localStorage. The web build exists only for
 * development preview; the shipping targets are the native binaries.
 */
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const webAdapter = {
  getItem: (key: string) =>
    Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(Env.supabaseUrl, Env.supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? webAdapter : secureStoreAdapter,
    storageKey: "twoplus.session",
    autoRefreshToken: true,
    persistSession: true,
    // Native has no URL fragment to parse; the app drives every auth flow.
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
