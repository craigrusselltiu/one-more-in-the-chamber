/**
 * Authentication service.
 * Email + Google login via Supabase. Fully optional -- game works offline without auth.
 */

import { getSupabase } from './supabase';
import { syncOnLogin } from './syncService';
import { getMyPlayer } from './players';
import { useMetaStore } from '../store/metaStore';
import { useRunStore } from '../store/runStore';
import { EventBus, GameEvent } from '../game/EventBus';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
  /** True when the user is authenticated but has no players row yet (OAuth first sign-in). */
  needsDisplayName: boolean;
}

/** Listeners notified whenever auth state changes (login/logout/display-name set). */
type Listener = (state: AuthState) => void;
const listeners = new Set<Listener>();

/** Separate pub/sub flagged during the post-login sync + profile hydrate, so
 *  the UI can show a blocking "Syncing data..." overlay just for that window. */
type BoolListener = (active: boolean) => void;
const loginSyncListeners = new Set<BoolListener>();
let loginSyncing = false;

export function subscribeLoginSync(fn: BoolListener): () => void {
  loginSyncListeners.add(fn);
  try { fn(loginSyncing); } catch { /* ignore */ }
  return () => { loginSyncListeners.delete(fn); };
}

function notifyLoginSync(): void {
  for (const l of loginSyncListeners) {
    try { l(loginSyncing); } catch { /* ignore */ }
  }
}

export function subscribeAuth(fn: Listener): () => void {
  listeners.add(fn);
  // Fire immediately with current state so subscribers never miss updates that
  // occurred between their useState() lazy init and the useEffect that subscribes.
  try { fn({ ...state }); } catch { /* ignore */ }
  return () => { listeners.delete(fn); };
}

function notify(): void {
  for (const l of listeners) {
    try { l({ ...state }); } catch { /* ignore */ }
  }
}

const state: AuthState = {
  isLoggedIn: false,
  userId: null,
  displayName: null,
  needsDisplayName: false,
};

let initialized = false;

/** localStorage key for the guest display name captured at the moment of sign-in.
 *  Used to restore the pre-login name on sign-out so returning guests aren't
 *  re-prompted for "What is your name?" every time they log out. */
const GUEST_NAME_STASH_KEY = 'omitc-pre-login-guest-name';

function stashGuestName(name: string): void {
  try {
    if (name) localStorage.setItem(GUEST_NAME_STASH_KEY, name);
    else localStorage.removeItem(GUEST_NAME_STASH_KEY);
  } catch { /* ignore */ }
}

function readGuestNameStash(): string {
  try { return localStorage.getItem(GUEST_NAME_STASH_KEY) ?? ''; } catch { return ''; }
}

function applySession(session: Session | null): void {
  if (session?.user) {
    state.isLoggedIn = true;
    state.userId = session.user.id;
    state.displayName =
      session.user.user_metadata?.display_name ??
      session.user.user_metadata?.full_name ??
      session.user.email ??
      null;
    state.needsDisplayName = false;
  } else {
    state.isLoggedIn = false;
    state.userId = null;
    state.displayName = null;
    state.needsDisplayName = false;
  }
}

/** Fetch the authoritative display name from the players table and push it into metaStore.
 *  If the user has no players row yet (OAuth first sign-in), flag needsDisplayName. */
async function hydrateProfile(): Promise<void> {
  const profile = await getMyPlayer();
  if (profile) {
    state.displayName = profile.displayName;
    state.needsDisplayName = false;
    useMetaStore.getState().setPlayerName(profile.displayName);
  } else {
    state.needsDisplayName = true;
  }
  notify();
}

/** Post-login flow: sync progression, then pull the display name into the local store. */
async function onLogin(): Promise<void> {
  // Stash the current local guest name (if any) before hydrateProfile overwrites
  // it with the account display name. Restored on sign-out so returning guests
  // don't get re-prompted for "What is your name?".
  const currentGuestName = useMetaStore.getState().meta.playerName;
  if (currentGuestName) stashGuestName(currentGuestName);

  loginSyncing = true;
  notifyLoginSync();
  try {
    await syncOnLogin();
  } catch (err) {
    console.error('[auth] syncOnLogin failed:', err);
  }
  try {
    await hydrateProfile();
  } finally {
    loginSyncing = false;
    notifyLoginSync();
  }
}

/** Initialize auth listener. Call once at app startup. */
export async function initAuth(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const sb = getSupabase();
  if (!sb) return;

  // Restore existing session
  const { data } = await sb.auth.getSession();
  applySession(data.session);
  if (state.isLoggedIn) {
    // Session restored from a previous visit -- hydrate the display name from the
    // players table. No sync needed on passive restore (data already in local IDB).
    hydrateProfile().catch(console.error);
  }
  notify();

  // Listen for auth changes (login, logout, token refresh)
  sb.auth.onAuthStateChange((_event, session) => {
    const wasLoggedIn = state.isLoggedIn;
    applySession(session);
    if (!wasLoggedIn && state.isLoggedIn) {
      onLogin().catch(console.error);
    } else {
      notify();
    }
  });
}

export function getAuthState(): AuthState {
  return state;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase not configured' };

  const { error } = await sb.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase not configured' };

  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function loginWithGoogle(): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase not configured' };

  const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
  return { error: error?.message ?? null };
}

export async function logout(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  state.isLoggedIn = false;
  state.userId = null;
  state.displayName = null;
  state.needsDisplayName = false;
  // Drop the account's active run (zustand + IndexedDB + combat snapshot) so
  // the user can't continue playing it as a guest after signing out. The run
  // still lives on the server under their account and will sync back if they
  // log in again.
  await useRunStore.getState().clearRun();
  // Wipe local account-scoped progression so a subsequent login on this device
  // doesn't merge the previous account's unlocks into the new account.
  useMetaStore.getState().resetToDefaults();
  // If the user had a guest name before signing in, restore it so they're not
  // re-prompted to pick one. New accounts (no prior guest name) still get the
  // prompt after logging out.
  const priorGuestName = readGuestNameStash();
  if (priorGuestName) useMetaStore.getState().setPlayerName(priorGuestName);
  notify();
  EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu');
}

/** Called after a successful display-name claim so UI can advance past the pick-name screen. */
export function markDisplayNameSet(name: string): void {
  state.displayName = name;
  state.needsDisplayName = false;
  useMetaStore.getState().setPlayerName(name);
  notify();
}

/** Get the current Supabase User, if any. */
export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user;
}
