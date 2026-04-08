/**
 * Authentication service.
 * Email + social login (Google, GitHub, Discord) via Supabase.
 * Fully optional -- game works offline without auth.
 */

import { getSupabase } from './supabase';
import { syncOnLogin } from './syncService';
import { useAuthStore } from '../store/authStore';
import type { Session, User, Provider } from '@supabase/supabase-js';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
}

const state: AuthState = {
  isLoggedIn: false,
  userId: null,
  displayName: null,
};

let initialized = false;

/** Push current state into the Zustand store so React components re-render. */
function notifyStore(): void {
  useAuthStore.getState().setAuth(state.isLoggedIn, state.userId, state.displayName);
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
  } else {
    state.isLoggedIn = false;
    state.userId = null;
    state.displayName = null;
  }
  notifyStore();
}

/** Initialize auth listener. Call once at app startup. */
export async function initAuth(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const sb = getSupabase();
  if (!sb) {
    useAuthStore.getState().setLoading(false);
    return;
  }

  // Restore existing session
  const { data } = await sb.auth.getSession();
  applySession(data.session);

  // Listen for auth changes (login, logout, token refresh)
  sb.auth.onAuthStateChange((_event, session) => {
    const wasLoggedIn = state.isLoggedIn;
    applySession(session);
    if (!wasLoggedIn && state.isLoggedIn) {
      syncOnLogin().catch(console.error);
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

/** Generic OAuth login -- works for any Supabase-supported provider. */
async function loginWithOAuth(provider: Provider): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase not configured' };

  const { error } = await sb.auth.signInWithOAuth({ provider });
  return { error: error?.message ?? null };
}

export function loginWithGoogle(): Promise<{ error: string | null }> {
  return loginWithOAuth('google');
}

export function loginWithGithub(): Promise<{ error: string | null }> {
  return loginWithOAuth('github');
}

export function loginWithDiscord(): Promise<{ error: string | null }> {
  return loginWithOAuth('discord');
}

export async function logout(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  state.isLoggedIn = false;
  state.userId = null;
  state.displayName = null;
  notifyStore();
}

/** Get the current Supabase User, if any. */
export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user;
}
