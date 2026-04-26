/**
 * Player profile service: display-name availability + claim/update against
 * the public.players table.
 *
 * Uniqueness is enforced server-side by a case-insensitive unique index on
 * lower(display_name). Client-side checks are best-effort pre-flight only.
 */

import { getSupabase } from './supabase';
import { getAuthState } from './auth';

/** Max display name length. Matches the DB check constraint on public.players.display_name. */
export const DISPLAY_NAME_MAX = 32;

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: 'taken' | 'invalid' | 'not_authenticated' | 'error'; message?: string };

/** Client-side format validation. Server-side constraints (unique + length check) are the source of truth. */
export function validateDisplayName(name: string): { ok: true } | { ok: false; message: string } {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: 'Enter a name.' };
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return { ok: false, message: `Max ${DISPLAY_NAME_MAX} characters.` };
  }
  return { ok: true };
}

/**
 * Returns true if the name is not currently in the players table.
 * Offline/unavailable: returns true (don't block signup on a transient outage;
 * the unique index will catch actual collisions at claim time).
 */
export async function checkDisplayNameAvailable(name: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { count, error } = await sb
    .from('players')
    .select('id', { count: 'exact', head: true })
    .ilike('display_name', name);
  if (error) return true;
  return (count ?? 0) === 0;
}

/** Upsert the logged-in user's players row with the given display name. */
export async function claimDisplayName(name: string): Promise<ClaimResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: 'error', message: 'Offline' };
  const { userId } = getAuthState();
  if (!userId) return { ok: false, reason: 'not_authenticated' };

  const validation = validateDisplayName(name);
  if (!validation.ok) return { ok: false, reason: 'invalid', message: validation.message };

  const { error } = await sb.from('players').upsert({ id: userId, display_name: name.trim() });
  if (error) {
    // Postgres unique-violation SQLSTATE 23505
    if (error.code === '23505') return { ok: false, reason: 'taken' };
    return { ok: false, reason: 'error', message: error.message };
  }
  return { ok: true };
}

/** Same as claim but semantically a rename. Kept separate in case future logic diverges. */
export const updateDisplayName = claimDisplayName;

/** Read the logged-in user's players row. */
export async function getMyPlayer(): Promise<{ displayName: string; isDev: boolean } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { userId } = getAuthState();
  if (!userId) return null;
  const { data } = await sb.from('players').select('display_name,is_dev').eq('id', userId).maybeSingle();
  if (!data?.display_name) return null;
  return { displayName: data.display_name as string, isDev: data.is_dev === true };
}
