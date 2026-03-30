/**
 * Sync service: local (IndexedDB) <-> remote (Supabase).
 * Merge rules from SPEC:
 * - meta_progression: additive merge (union unlocks, max reputation/ascension).
 * - runs: compare updated_at, keep more recent or more nodes cleared.
 * - scores: append-only, no overwrites.
 *
 * TODO: implement when Supabase is configured.
 */

export async function syncOnLogin(): Promise<void> {
  // TODO: pull remote state, merge with local, push merged state
}

export async function syncOnReconnect(): Promise<void> {
  // TODO: same as syncOnLogin
}
