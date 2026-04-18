/**
 * Supabase client singleton.
 * Lazily initialized -- returns null when env vars are missing (offline mode).
 *
 * Session persistence: the Supabase client always stores its auth token in
 * localStorage, so tab reopens restore the session reliably. The "Stay signed
 * in" off option is implemented separately via a beforeunload handler that
 * explicitly signs out when the tab closes -- see installUnloadSignOut().
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STAY_SIGNED_IN_KEY = 'omitc-stay-signed-in';

export type AuthStorageMode = 'local' | 'session';

/** Record the user's "Stay signed in" choice BEFORE the sign-in call. On true
 *  (default), session persists normally. On false, beforeunload signs the user
 *  out so the next tab open is a clean slate. */
export function setAuthStorageMode(mode: AuthStorageMode): void {
  try {
    if (mode === 'session') {
      localStorage.setItem(STAY_SIGNED_IN_KEY, 'false');
      installUnloadSignOut();
    } else {
      localStorage.removeItem(STAY_SIGNED_IN_KEY);
      removeUnloadSignOut();
    }
  } catch { /* ignore */ }
}

export function getAuthStorageMode(): AuthStorageMode {
  try {
    return localStorage.getItem(STAY_SIGNED_IN_KEY) === 'false' ? 'session' : 'local';
  } catch {
    return 'local';
  }
}

// beforeunload sign-out: only armed when the user explicitly unchecked Stay
// Signed In at login time. Fires best-effort (no guarantees on mobile / crash).

let unloadHandler: (() => void) | null = null;

function installUnloadSignOut(): void {
  if (unloadHandler) return;
  unloadHandler = () => {
    try { void client?.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
  };
  try { window.addEventListener('beforeunload', unloadHandler); } catch { /* ignore */ }
  try { window.addEventListener('pagehide', unloadHandler); } catch { /* ignore */ }
}

function removeUnloadSignOut(): void {
  if (!unloadHandler) return;
  try { window.removeEventListener('beforeunload', unloadHandler); } catch { /* ignore */ }
  try { window.removeEventListener('pagehide', unloadHandler); } catch { /* ignore */ }
  unloadHandler = null;
}

// On module load, restore the unload handler if the user previously chose
// "Stay signed in: off" -- the flag lives in localStorage and we want the
// behavior to persist across tab reloads within the same authenticated period.
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    if (localStorage.getItem(STAY_SIGNED_IN_KEY) === 'false') {
      installUnloadSignOut();
    }
  } catch { /* ignore */ }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      // Default localStorage-based persistence. Simple, reliable across reloads.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
