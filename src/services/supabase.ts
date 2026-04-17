/**
 * Supabase client singleton.
 * Lazily initialized -- returns null when env vars are missing (offline mode).
 *
 * Session persistence:
 *   A custom storage adapter routes auth tokens to localStorage ("stay signed in")
 *   or sessionStorage (session ends when the tab closes). The mode is toggled via
 *   setAuthStorageMode() before calling signIn / signUp / OAuth redirect.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const AUTH_STORAGE_MODE_KEY = 'omitc-auth-storage-mode';

export type AuthStorageMode = 'local' | 'session';

/** Persist the user's "Stay signed in" choice. Call BEFORE sign-in flows. */
export function setAuthStorageMode(mode: AuthStorageMode): void {
  try { localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode); } catch { /* ignore */ }
}

export function getAuthStorageMode(): AuthStorageMode {
  try {
    const v = localStorage.getItem(AUTH_STORAGE_MODE_KEY);
    return v === 'session' ? 'session' : 'local';
  } catch {
    return 'local';
  }
}

/** Dynamic storage: reads mode at call time so the user's choice for the current
 *  sign-in determines where the new tokens land without recreating the client. */
const dynamicStorage = {
  getItem: (key: string): string | null => {
    const storage = getAuthStorageMode() === 'session' ? sessionStorage : localStorage;
    try { return storage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    const storage = getAuthStorageMode() === 'session' ? sessionStorage : localStorage;
    try { storage.setItem(key, value); } catch { /* ignore */ }
  },
  removeItem: (key: string): void => {
    // Clear from both so sign-out wipes any stale token from either bucket.
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      storage: dynamicStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
