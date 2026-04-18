/**
 * Sync service: local (IndexedDB) <-> remote (Supabase).
 *
 * Merge rules from SPEC:
 * - meta_progression: additive merge (union unlocks, max reputation/wanted level).
 * - runs (active): compare updated_at, keep more recent or more nodes cleared.
 * - scores: append-only, no remote overwrites.
 */

import { getSupabase } from './supabase';
import { getAuthState } from './auth';
import {
  saveMeta,
  loadAllRuns,
  saveRun,
  deleteRun,
  loadAllScores,
  saveScore,
  saveCombatSnapshot as saveCombatSnapshotLocal,
  clearCombatSnapshot as clearCombatSnapshotLocal,
} from './localSave';
import { useMetaStore, markLocalMetaSynced } from '../store/metaStore';
import { useRunStore } from '../store/runStore';
import { SESSION_ID } from './session';
import { notifyKicked } from './kickout';

// ---------- Types ----------

interface MetaRow {
  player_id: string;
  reputation: number;
  unlocked_artifacts: string[];
  unlocked_events: string[];
  unlocked_cosmetics: string[];
  unlocked_loadouts: string[];
  unlocked_characters: string[];
  unlocked_skins: string[];
  unlocked_nameplates: string[];
  unlocked_colours: string[];
  unlocked_titles: string[];
  equipped_skin: string | null;
  equipped_nameplate: string | null;
  equipped_colour: string | null;
  equipped_title: string | null;
  highest_wanted_level_cleared: number;
}

interface LocalMeta {
  key: string;
  reputation: number;
  unlockedArtifacts: string[];
  unlockedEvents: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  unlockedSkins: string[];
  unlockedNameplates: string[];
  unlockedColours: string[];
  unlockedTitles: string[];
  equippedSkin: string | null;
  equippedNameplate: string | null;
  equippedColour: string | null;
  equippedTitle: string | null;
  highestWantedLevelCleared: number;
}

interface RunRow {
  id: string;
  player_id: string;
  status: string;
  updated_at: string;
  [k: string]: unknown;
}

interface LocalRun {
  id: string;
  status: string;
  updatedAt?: string;
  nodesCleared?: number;
  [k: string]: unknown;
}

interface ScoreRow {
  id: string;
  run_id: string;
  created_at: string;
  [k: string]: unknown;
}

interface LocalScore {
  id: string;
  runId: string;
  createdAt?: string;
  [k: string]: unknown;
}

// ---------- Sync status pub/sub ----------
//
// UI consumers subscribe via subscribeSync() to show a "Retrieving data..."
// indicator while a long-running pull is in flight (login sync, leaderboard
// fetch). Debounced background pushes do NOT register here since they finish
// in tens of ms and would just flicker the badge.

type SyncListener = (active: boolean) => void;
const syncListeners = new Set<SyncListener>();
let activeSyncs = 0;

function notifySync(): void {
  const active = activeSyncs > 0;
  for (const l of syncListeners) {
    try { l(active); } catch { /* ignore */ }
  }
}

export function subscribeSync(fn: SyncListener): () => void {
  syncListeners.add(fn);
  // Fire immediately with current state so mount-time consumers don't wait.
  try { fn(activeSyncs > 0); } catch { /* ignore */ }
  return () => { syncListeners.delete(fn); };
}

/** Wrap an async operation so subscribers see active === true while it runs. */
export async function withSyncIndicator<T>(fn: () => Promise<T>): Promise<T> {
  activeSyncs++;
  notifySync();
  try {
    return await fn();
  } finally {
    activeSyncs = Math.max(0, activeSyncs - 1);
    notifySync();
  }
}

// ---------- Public API ----------

/** Sync local <-> remote on login or reconnect. */
export async function syncOnLogin(): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  await withSyncIndicator(async () => {
    try {
      await syncMeta(sb, userId);
      await syncRuns(sb, userId);
      await syncScores(sb, userId);
    } catch (err) {
      console.error('[sync] sync failed:', err);
    }
  });
}

/** Alias -- same merge logic on reconnect. */
export async function syncOnReconnect(): Promise<void> {
  return syncOnLogin();
}

/**
 * Push current run state to remote.
 *
 * Ownership-aware: the runs.session_id column tracks which tab/device currently
 * owns this run. If we detect that the server's session_id is not ours, a
 * different device has taken over and we kick this client out.
 *
 * First push for a new run: INSERT with session_id = ours. Subsequent pushes:
 * UPDATE with session_id filter; zero rows updated => we've been kicked.
 */
export async function pushRun(run: LocalRun): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  const now = new Date().toISOString();
  const runsPayload = {
    character: run.character ?? 'red_panda',
    status: run.status,
    seed: run.seed,
    wanted_level: run.wantedLevel ?? 0,
    current_act: run.currentAct ?? 1,
    current_node_id: run.currentNodeId ?? null,
    updated_at: now,
  };

  // Try owner-filtered UPDATE first.
  const { data: updated, error: updateErr } = await sb
    .from('runs')
    .update(runsPayload)
    .eq('id', run.id)
    .eq('session_id', SESSION_ID)
    .select('id')
    .maybeSingle();

  if (updateErr) {
    console.error('[sync] pushRun update failed:', updateErr);
    return;
  }

  if (!updated) {
    // No row matched. Either the row doesn't exist yet (new run for this id)
    // OR it exists with a different session_id (we've been kicked).
    const { data: existing } = await sb
      .from('runs')
      .select('session_id, player_id')
      .eq('id', run.id)
      .maybeSingle();

    if (existing) {
      if (existing.player_id === userId && existing.session_id !== SESSION_ID) {
        // Another device owns this run. Don't re-claim -- that's the behavior
        // that caused the ping-pong where neither device could actually push.
        // Trust the mismatch, kick ourselves, and stop writing stale state.
        console.warn('[sync] pushRun ownership mismatch; kicking');
        notifyKicked();
      }
      return;
    }

    // New run: abandon any other active run this player owns, then INSERT.
    if (run.status === 'active') {
      await abandonOtherActiveRuns(run.id as string).catch((e) => console.error('[sync]', e));
    }
    const { error: insertErr } = await sb.from('runs').insert({
      id: run.id,
      player_id: userId,
      session_id: SESSION_ID,
      ...runsPayload,
    });
    if (insertErr) {
      // 23505 on the partial unique index means another active run already
      // exists for this player that we didn't know about -- treat as a kick.
      if (insertErr.code === '23505') notifyKicked();
      else console.error('[sync] pushRun insert failed:', insertErr);
      return;
    }
  }

  // Push run_state. extra_state holds only the non-duplicated residual fields
  // (counters, pending flags, eventBag, etc.); everything that has a dedicated
  // column (or lives on the runs table) is omitted to keep the payload small
  // and avoid two sources of truth. traitCounts is derived from artifacts on
  // pull, so we don't persist it either.
  //
  // IMPORTANT: we do NOT touch the combat_state column here. That column is
  // owned by pushCombatSnapshot / clearRemoteCombatSnapshot so a background
  // run-state push doesn't clobber a live mid-combat save.
  await sb.from('run_state').upsert({
    run_id: run.id,
    health: run.health,
    max_health: run.maxHealth,
    gold: run.gold,
    active_tile_types: run.activeTileTypes,
    tile_upgrades: run.tileUpgrades,
    artifacts: run.artifacts,
    consumables: run.consumables,
    ability_charge: run.abilityCharge,
    map_state: run.mapState,
    extra_state: buildExtraState(run),
    updated_at: now,
  });
}

/** Fields that are stored in dedicated columns (runs table or run_state
 *  columns) and therefore do not need to be duplicated inside extra_state.
 *  traitCounts is derived from artifacts so it's also excluded. */
const EXTRA_STATE_OMIT_KEYS = new Set<string>([
  // runs table
  'id', 'character', 'status', 'seed', 'wantedLevel', 'currentAct', 'currentNodeId',
  'updatedAt',
  // run_state columns
  'health', 'maxHealth', 'gold', 'activeTileTypes', 'tileUpgrades', 'artifacts',
  'consumables', 'abilityCharge', 'mapState',
  // derived
  'traitCounts',
]);

function buildExtraState(run: LocalRun): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(run)) {
    if (!EXTRA_STATE_OMIT_KEYS.has(k)) {
      out[k] = (run as Record<string, unknown>)[k];
    }
  }
  return out;
}

/** Sum artifact tags to produce the traitCounts map. Keeps a single source
 *  of truth: an artifact's trait contribution is defined by its tags. */
function computeTraitCounts(
  artifacts: Array<{ tags?: string[] }> | null | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of artifacts ?? []) {
    for (const tag of a.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

/** Push a mid-combat snapshot to the run_state.combat_state column. */
export async function pushCombatSnapshot(snapshot: { runId: string }): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;
  const { error } = await sb
    .from('run_state')
    .update({ combat_state: snapshot, updated_at: new Date().toISOString() })
    .eq('run_id', snapshot.runId);
  if (error) console.error('[sync] pushCombatSnapshot failed:', error);
}

/** Clear the remote combat snapshot (combat ended, fresh combat starting, or run cleared). */
export async function clearRemoteCombatSnapshot(runId: string): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;
  const { error } = await sb
    .from('run_state')
    .update({ combat_state: null, updated_at: new Date().toISOString() })
    .eq('run_id', runId);
  if (error) console.error('[sync] clearRemoteCombatSnapshot failed:', error);
}

/**
 * Mark every active run for the logged-in player as 'abandoned' EXCEPT
 * optionally one id we want to keep. Called:
 *   - before pushing a brand-new active run (so only the new one stays active)
 *   - from runStore.clearRun when the user abandons the current run locally
 */
export async function abandonOtherActiveRuns(exceptId?: string): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;
  let q = sb
    .from('runs')
    .update({ status: 'abandoned', updated_at: new Date().toISOString() })
    .eq('player_id', userId)
    .eq('status', 'active');
  if (exceptId) q = q.neq('id', exceptId);
  const { error } = await q;
  if (error) console.error('[sync] abandonOtherActiveRuns failed:', error);
}

/**
 * Claim ownership of a run we just pulled from remote: update session_id
 * to this tab's SESSION_ID. Any other tab/device that was playing this run
 * will detect the mismatch on its next pushRun and get kicked.
 */
export async function claimRunOwnership(runId: string): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;
  const { error } = await sb
    .from('runs')
    .update({ session_id: SESSION_ID, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('player_id', userId);
  if (error) console.error('[sync] claimRunOwnership failed:', error);
}

/**
 * Claim ownership of every active run for the logged-in player. Called on
 * passive session restore (same browser reopening) so our new SESSION_ID
 * replaces the old tab's, preventing a false kick on the first push.
 */
export async function claimAllMyActiveRuns(): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;
  const { error } = await sb
    .from('runs')
    .update({ session_id: SESSION_ID })
    .eq('player_id', userId)
    .eq('status', 'active');
  if (error) console.error('[sync] claimAllMyActiveRuns failed:', error);
}

/**
 * Merge remote state into local on passive session restore.
 *
 * For meta: numeric fields use max-merge (never lower a counter via a pull,
 * so a corrupted / zeroed remote value can't wipe legitimate local progress).
 * Array fields union. This is the SAFE default.
 *
 * For the active run: take whichever side has the newer `updated_at`. This
 * lets manual Supabase edits take effect (DB triggers bump updated_at) while
 * preserving local state when the user has more recent local activity.
 *
 * Name kept as-is for import compatibility; the "overwrite" semantic is now
 * only for runs-with-newer-remote-updated_at.
 */
export async function pullRemoteStateOverwriteLocal(): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  return withSyncIndicator(async () => {
    // --- Meta (safe merge: max for numeric, union for arrays) ---
    try {
      const { data: remote } = await sb
        .from('meta_progression')
        .select('*')
        .eq('player_id', userId)
        .maybeSingle();
      if (remote) {
        const r = remote as MetaRow & { updated_at?: string | null };
        const z = useMetaStore.getState().meta;
        // n() guards against NaN / null / undefined on either side.
        const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
        const merged = {
          reputation: Math.max(n(z.reputation), n(r.reputation)),
          unlockedArtifacts: [...new Set([...(z.unlockedArtifacts ?? []), ...(r.unlocked_artifacts ?? [])])],
          unlockedEvents: [...new Set([...(z.unlockedEvents ?? []), ...(r.unlocked_events ?? [])])],
          unlockedCosmetics: [...new Set([...(z.unlockedCosmetics ?? []), ...(r.unlocked_cosmetics ?? [])])],
          unlockedLoadouts: [...new Set([...(z.unlockedLoadouts ?? []), ...(r.unlocked_loadouts ?? [])])],
          unlockedCharacters: [...new Set([...(z.unlockedCharacters ?? []), ...(r.unlocked_characters ?? [])])],
          unlockedSkins: [...new Set([...(z.unlockedSkins ?? []), ...(r.unlocked_skins ?? [])])],
          unlockedNameplates: [...new Set([...(z.unlockedNameplates ?? []), ...(r.unlocked_nameplates ?? [])])],
          unlockedColours: [...new Set([...(z.unlockedColours ?? []), ...(r.unlocked_colours ?? [])])],
          unlockedTitles: [...new Set([...(z.unlockedTitles ?? []), ...(r.unlocked_titles ?? [])])],
          // Equipped singletons: prefer remote (authoritative per account).
          equippedSkin: r.equipped_skin ?? z.equippedSkin ?? null,
          equippedNameplate: r.equipped_nameplate ?? z.equippedNameplate ?? null,
          equippedColour: r.equipped_colour ?? z.equippedColour ?? null,
          equippedTitle: r.equipped_title ?? z.equippedTitle ?? null,
          highestWantedLevelCleared: Math.max(n(z.highestWantedLevelCleared, -1), n(r.highest_wanted_level_cleared, -1)),
        };
        useMetaStore.getState().hydrateFromRemote(merged);
        await saveMeta('progression', merged);
        if (r.updated_at) markLocalMetaSynced(r.updated_at);
      }
    } catch (err) {
      console.error('[sync] pullRemoteStateOverwriteLocal meta failed:', err);
    }

    // --- Active run: if remote has one and this device still owns it, pull
    // and mirror locally. If we don't own it, checkOwnershipAndKick handles
    // the kick separately; don't overwrite local state in that case because
    // logout() will wipe it shortly anyway. ---
    try {
      const { data: remoteRuns } = await sb
        .from('runs')
        .select('*')
        .eq('player_id', userId)
        .eq('status', 'active');
      if (remoteRuns && remoteRuns.length > 0) {
        const remoteRun = remoteRuns[0] as RunRow & { session_id?: string | null };
        const ownedByUs = remoteRun.session_id === SESSION_ID;
        if (ownedByUs) {
          const localRun = useRunStore.getState().run;
          // Clean up any stray local active run with a different id so
          // loadActiveRun can't resurrect it at next startup.
          const allLocal = (await loadAllRuns()) as LocalRun[];
          for (const l of allLocal) {
            if (l.status === 'active' && l.id !== remoteRun.id) {
              await deleteRun(l.id).catch(() => {});
            }
          }
          const pulled = await pullRemoteRun(sb, remoteRun);
          await saveRun(pulled);
          // Only update the in-memory store if we don't already have this run
          // or the pulled state is newer -- avoids clobbering in-flight local
          // progress that hasn't pushed yet.
          const localUpdatedIso = (localRun as unknown as { updatedAt?: string })?.updatedAt;
          const localUpdated = localUpdatedIso ? new Date(localUpdatedIso).getTime() : 0;
          const remoteUpdated = new Date(remoteRun.updated_at).getTime();
          const shouldRestore = !localRun || localRun.id !== remoteRun.id || remoteUpdated > localUpdated;
          if (shouldRestore) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useRunStore.getState().restoreRun(pulled as any);
          }
        }
      }
    } catch (err) {
      console.error('[sync] pullRemoteStateOverwriteLocal runs failed:', err);
    }
  });
}

// ---------- Ownership watcher (periodic kick detection) ----------
//
// pushRun is our primary write path, and it detects session_id mismatches
// on write. But a user idling on the main menu or any non-combat screen
// wouldn't push anything, so a takeover from another device would be
// invisible until they started a run again. The watcher polls every
// WATCH_INTERVAL_MS and on tab-visible; mismatch -> notifyKicked.

const WATCH_INTERVAL_MS = 20_000;
let watchTimer: ReturnType<typeof setInterval> | null = null;
let watchVisibilityHandler: (() => void) | null = null;

/** Read current active-run session_id values for the logged-in player.
 *  Returns null on error (treat as "don't know, skip kick"). */
async function readActiveRunSessionIds(): Promise<string[] | null> {
  const sb = getSupabase();
  const { userId, isLoggedIn } = getAuthState();
  if (!sb || !userId || !isLoggedIn) return null;
  const { data, error } = await sb
    .from('runs')
    .select('session_id')
    .eq('player_id', userId)
    .eq('status', 'active');
  if (error || !data) return null;
  return (data as Array<{ session_id: string | null }>)
    .map((r) => r.session_id)
    .filter((s): s is string => !!s);
}

/** Two-read kick detection: a single mismatch could be a transient read-after-
 *  write race, so we wait briefly and re-read. If the mismatch is still there,
 *  the other device really does own the run -- kick. We do NOT re-claim here;
 *  that was the defensive behavior that caused cross-device ping-pong where
 *  neither side could actually push state. Ownership only changes on an
 *  explicit login (syncRuns -> claimAllMyActiveRuns). */
export async function checkOwnershipAndKick(): Promise<void> {
  return checkOwnership();
}

async function checkOwnership(): Promise<void> {
  const first = await readActiveRunSessionIds();
  if (!first || first.length === 0) return;
  const firstMismatch = first.some((s) => s !== SESSION_ID);
  if (!firstMismatch) return;

  await new Promise((r) => setTimeout(r, 2000));

  const second = await readActiveRunSessionIds();
  if (!second) return;
  if (second.some((s) => s !== SESSION_ID)) {
    console.warn('[sync] ownership mismatch confirmed; kicking');
    notifyKicked();
  }
}

export function startOwnershipWatcher(): void {
  stopOwnershipWatcher();
  watchTimer = setInterval(() => { checkOwnership().catch(() => {}); }, WATCH_INTERVAL_MS);
  watchVisibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      checkOwnership().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', watchVisibilityHandler);
  // initAuth calls checkOwnershipAndKick up-front on session restore, and
  // onLogin has just claimed ownership, so we don't need an immediate check
  // here. First poll fires after WATCH_INTERVAL_MS; visibilitychange catches
  // mid-session takeovers when the user re-focuses the tab.
}

export function stopOwnershipWatcher(): void {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
  if (watchVisibilityHandler) {
    document.removeEventListener('visibilitychange', watchVisibilityHandler);
    watchVisibilityHandler = null;
  }
}

/** Push the current meta progression snapshot to remote. Fire-and-forget. */
export async function pushMeta(meta: {
  reputation: number;
  unlockedArtifacts: string[];
  unlockedEvents: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  unlockedSkins: string[];
  unlockedNameplates: string[];
  unlockedColours: string[];
  unlockedTitles: string[];
  equippedSkin: string | null;
  equippedNameplate: string | null;
  equippedColour: string | null;
  equippedTitle: string | null;
  highestWantedLevelCleared: number;
}): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  await sb.from('meta_progression').upsert({
    player_id: userId,
    reputation: meta.reputation,
    unlocked_artifacts: meta.unlockedArtifacts,
    unlocked_events: meta.unlockedEvents,
    unlocked_cosmetics: meta.unlockedCosmetics,
    unlocked_loadouts: meta.unlockedLoadouts,
    unlocked_characters: meta.unlockedCharacters,
    unlocked_skins: meta.unlockedSkins,
    unlocked_nameplates: meta.unlockedNameplates,
    unlocked_colours: meta.unlockedColours,
    unlocked_titles: meta.unlockedTitles,
    equipped_skin: meta.equippedSkin,
    equipped_nameplate: meta.equippedNameplate,
    equipped_colour: meta.equippedColour,
    equipped_title: meta.equippedTitle,
    highest_wanted_level_cleared: meta.highestWantedLevelCleared,
    updated_at: new Date().toISOString(),
  });
}

/** Push a score to remote. */
export async function pushScore(score: LocalScore, playerName?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { userId } = getAuthState();

  await sb.from('scores').upsert({
    id: score.id,
    player_id: userId ?? null,
    player_name: playerName ?? 'Anonymous',
    run_id: score.runId,
    character: score.character ?? 'red_panda',
    wanted_level: score.wantedLevel ?? 0,
    base_score: score.baseScore ?? 0,
    bonus_points: score.bonusPoints ?? 0,
    wanted_level_multiplier: score.wantedLevelMultiplier ?? 1,
    time_bonus: score.timeBonus ?? 0,
    final_score: score.finalScore ?? 0,
    run_duration_seconds: score.runDurationSeconds ?? 0,
    nodes_cleared: score.nodesCleared ?? 0,
    bosses_defeated: score.bossesDefeated ?? 0,
    run_completed: score.runCompleted ?? false,
    tiles: score.tiles ?? null,
    artifacts: score.artifacts ?? null,
    killed_by: score.killedBy ?? null,
    created_at: score.createdAt ?? new Date().toISOString(),
  });
}

// ---------- Internal: Meta ----------

async function syncMeta(sb: ReturnType<typeof getSupabase> & object, userId: string): Promise<void> {
  // In-memory zustand state is the authoritative local copy for meta progression
  // (see metaStore.ts). IndexedDB is a shadow, kept in sync for redundancy.
  const zustand = useMetaStore.getState().meta;
  const local: LocalMeta = {
    key: 'progression',
    reputation: zustand.reputation,
    unlockedArtifacts: zustand.unlockedArtifacts,
    unlockedEvents: zustand.unlockedEvents,
    unlockedCosmetics: zustand.unlockedCosmetics,
    unlockedLoadouts: zustand.unlockedLoadouts,
    unlockedCharacters: zustand.unlockedCharacters,
    unlockedSkins: zustand.unlockedSkins,
    unlockedNameplates: zustand.unlockedNameplates,
    unlockedColours: zustand.unlockedColours,
    unlockedTitles: zustand.unlockedTitles,
    equippedSkin: zustand.equippedSkin,
    equippedNameplate: zustand.equippedNameplate,
    equippedColour: zustand.equippedColour,
    equippedTitle: zustand.equippedTitle,
    highestWantedLevelCleared: zustand.highestWantedLevelCleared,
  };
  // maybeSingle() returns null (not an error) when the account has no
  // meta_progression row yet -- i.e. first-time account creation. In that
  // case mergeMeta falls through to local values, effectively seeding the
  // new account from this device's guest progression.
  const { data: remote } = await sb.from('meta_progression').select('*').eq('player_id', userId).maybeSingle();
  const remoteRow = remote as (MetaRow & { updated_at?: string | null }) | null;

  const merged = mergeMeta(local, remoteRow);

  // Hydrate merged state into the zustand store (updates localStorage too).
  useMetaStore.getState().hydrateFromRemote(merged);

  // Save merged to IndexedDB (redundant shadow).
  await saveMeta('progression', merged);

  // Save merged back to remote with a NEW timestamp, then mark local synced to
  // the same timestamp so the next syncMeta sees them as equal (no churn).
  const now = new Date().toISOString();
  await sb.from('meta_progression').upsert({
    player_id: userId,
    reputation: merged.reputation,
    unlocked_artifacts: merged.unlockedArtifacts,
    unlocked_events: merged.unlockedEvents,
    unlocked_cosmetics: merged.unlockedCosmetics,
    unlocked_loadouts: merged.unlockedLoadouts,
    unlocked_characters: merged.unlockedCharacters,
    unlocked_skins: merged.unlockedSkins,
    unlocked_nameplates: merged.unlockedNameplates,
    unlocked_colours: merged.unlockedColours,
    unlocked_titles: merged.unlockedTitles,
    equipped_skin: merged.equippedSkin,
    equipped_nameplate: merged.equippedNameplate,
    equipped_colour: merged.equippedColour,
    equipped_title: merged.equippedTitle,
    highest_wanted_level_cleared: merged.highestWantedLevelCleared,
    updated_at: now,
  });
  markLocalMetaSynced(now);
}

/**
 * Merge local and remote meta progression on login.
 *
 * Remote is authoritative for numeric fields (reputation, highestWantedLevelCleared)
 * whenever a remote row exists: logging into an account should load *that
 * account's* progression, and guest / stale-local data must never clobber it.
 * Arrays still union so any guest-earned unlocks on this device are preserved.
 *
 * Timestamps are intentionally ignored here. The dev-edit workflow (manual
 * Supabase changes taking effect on next sync) is handled by the session-
 * restore path in pullRemoteStateOverwriteLocal, which max-merges.
 */
function mergeMeta(
  local: LocalMeta | null,
  remote: MetaRow | null,
): Omit<LocalMeta, 'key'> {
  const l = local ?? {
    reputation: 0,
    unlockedArtifacts: [],
    unlockedEvents: [],
    unlockedCosmetics: [],
    unlockedLoadouts: [],
    unlockedCharacters: ['red_panda'],
    unlockedSkins: [],
    unlockedNameplates: [],
    unlockedColours: [],
    unlockedTitles: [],
    equippedSkin: null,
    equippedNameplate: null,
    equippedColour: null,
    equippedTitle: null,
    highestWantedLevelCleared: 0,
  };
  const r = remote ?? {
    reputation: 0,
    unlocked_artifacts: [] as string[],
    unlocked_events: [] as string[],
    unlocked_cosmetics: [] as string[],
    unlocked_loadouts: [] as string[],
    unlocked_characters: ['red_panda'],
    unlocked_skins: [] as string[],
    unlocked_nameplates: [] as string[],
    unlocked_colours: [] as string[],
    unlocked_titles: [] as string[],
    equipped_skin: null,
    equipped_nameplate: null,
    equipped_colour: null,
    equipped_title: null,
    highest_wanted_level_cleared: 0,
  };

  const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const reputation = remote ? n(r.reputation) : n(l.reputation);
  const highestWantedLevelCleared = remote
    ? n(r.highest_wanted_level_cleared, -1)
    : n(l.highestWantedLevelCleared, -1);

  // Equipped fields are singletons: remote wins when a remote row exists
  // (account is source of truth on login), otherwise keep local.
  const equippedSkin = remote ? r.equipped_skin : l.equippedSkin;
  const equippedNameplate = remote ? r.equipped_nameplate : l.equippedNameplate;
  const equippedColour = remote ? r.equipped_colour : l.equippedColour;
  const equippedTitle = remote ? r.equipped_title : l.equippedTitle;

  return {
    reputation,
    unlockedArtifacts: union(l.unlockedArtifacts, r.unlocked_artifacts),
    unlockedEvents: union(l.unlockedEvents, r.unlocked_events),
    unlockedCosmetics: union(l.unlockedCosmetics, r.unlocked_cosmetics),
    unlockedLoadouts: union(l.unlockedLoadouts, r.unlocked_loadouts),
    unlockedCharacters: union(l.unlockedCharacters, r.unlocked_characters),
    unlockedSkins: union(l.unlockedSkins, r.unlocked_skins),
    unlockedNameplates: union(l.unlockedNameplates, r.unlocked_nameplates),
    unlockedColours: union(l.unlockedColours, r.unlocked_colours),
    unlockedTitles: union(l.unlockedTitles, r.unlocked_titles),
    equippedSkin,
    equippedNameplate,
    equippedColour,
    equippedTitle,
    highestWantedLevelCleared,
  };
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

// ---------- Internal: Runs ----------

async function pullRemoteRun(
  sb: ReturnType<typeof getSupabase> & object,
  remote: RunRow,
): Promise<LocalRun> {
  const { data: runState } = await sb
    .from('run_state')
    .select('*')
    .eq('run_id', remote.id)
    .maybeSingle();

  // Mid-combat snapshot lives in run_state.combat_state. If one is present,
  // mirror it into local IndexedDB so checkForCombatResume can find it and
  // the enemies / board / stacks restore correctly on combat entry.
  const combatSnapshot = runState?.combat_state as { runId?: string } | null | undefined;
  if (combatSnapshot && typeof combatSnapshot === 'object') {
    try {
      await saveCombatSnapshotLocal({ ...combatSnapshot, runId: remote.id });
    } catch (err) {
      console.error('[sync] saveCombatSnapshot (pull) failed:', err);
    }
  } else {
    // No remote snapshot -- clear any stale local one for this run.
    try { await clearCombatSnapshotLocal(remote.id); } catch { /* ignore */ }
  }

  const artifacts = (runState?.artifacts ?? []) as Array<{ tags?: string[] }>;
  const extra = (runState?.extra_state ?? {}) as Partial<LocalRun> & Record<string, unknown>;

  // Dedicated columns are the source of truth for fields they cover; extra_state
  // contributes only non-duplicated residual fields (counters, pending flags,
  // eventBag, etc.). traitCounts is derived from artifacts.
  return {
    ...extra,
    id: remote.id,
    character: remote.character as string,
    seed: remote.seed as string,
    wantedLevel: remote.wanted_level as number,
    currentAct: remote.current_act as number,
    currentNodeId: remote.current_node_id as string | null,
    status: remote.status,
    updatedAt: remote.updated_at,
    health: runState?.health ?? (extra.health as number | undefined) ?? 100,
    maxHealth: runState?.max_health ?? (extra.maxHealth as number | undefined) ?? 100,
    gold: runState?.gold ?? (extra.gold as number | undefined) ?? 0,
    activeTileTypes: runState?.active_tile_types ?? extra.activeTileTypes ?? ['bullet', 'iron', 'gold'],
    tileUpgrades: runState?.tile_upgrades ?? extra.tileUpgrades ?? {},
    artifacts: runState?.artifacts ?? extra.artifacts ?? [],
    consumables: runState?.consumables ?? extra.consumables ?? [],
    abilityCharge: runState?.ability_charge ?? (extra.abilityCharge as number | undefined) ?? 0,
    mapState: runState?.map_state ?? extra.mapState ?? null,
    traitCounts: computeTraitCounts(artifacts),
    // Legacy counters -- default to 0 if missing from both extra_state and
    // legacy runs that predate these fields.
    totalDamageDealt: (extra.totalDamageDealt as number | undefined) ?? 0,
    runStartedAt: (extra.runStartedAt as number | undefined) ?? Date.now(),
    playTimeSeconds: (extra.playTimeSeconds as number | undefined) ?? 0,
    longestCascade: (extra.longestCascade as number | undefined) ?? 0,
    flawlessFights: (extra.flawlessFights as number | undefined) ?? 0,
    bossesDefeated: (extra.bossesDefeated as number | undefined) ?? 0,
    combatsCleared: (extra.combatsCleared as number | undefined) ?? 0,
    elitesCleared: (extra.elitesCleared as number | undefined) ?? 0,
    goldObtained: (extra.goldObtained as number | undefined) ?? 0,
    artifactsObtained: (extra.artifactsObtained as number | undefined) ?? 0,
  } as LocalRun;
}

async function syncRuns(sb: ReturnType<typeof getSupabase> & object, userId: string): Promise<void> {
  // Claim ownership of ALL active runs for this player at the start of the sync
  // so subsequent ownership-filtered pushes don't false-positive into a kickout.
  // This also immediately kicks any other device that was still pushing.
  await sb
    .from('runs')
    .update({ session_id: SESSION_ID, updated_at: new Date().toISOString() })
    .eq('player_id', userId)
    .eq('status', 'active');

  const localRuns = (await loadAllRuns()) as LocalRun[];
  const { data: remoteRuns } = await sb
    .from('runs')
    .select('*')
    .eq('player_id', userId);

  const remoteMap = new Map<string, RunRow>();
  for (const r of (remoteRuns ?? []) as RunRow[]) {
    remoteMap.set(r.id, r);
  }

  /** The winning active run after merge, to be injected into the zustand runStore. */
  let winningActive: LocalRun | null = null;

  // Remote is authoritative on login: if the account has any active run on the
  // server, that's the run the user continues. Local (possibly guest) runs are
  // only promoted to the account when the account has no active run on the
  // server -- the first-time-login seeding case.
  const remoteActive = [...remoteMap.values()].find((r) => r.status === 'active') ?? null;

  if (remoteActive) {
    // Delete any local active runs with a different id so loadActiveRun()
    // can't pick the leftover guest run at next startup.
    for (const local of localRuns) {
      if (local.status === 'active' && local.id !== remoteActive.id) {
        await deleteRun(local.id).catch(() => {});
      }
    }
    const pulled = await pullRemoteRun(sb, remoteActive);
    await saveRun(pulled);
    winningActive = pulled;
  } else {
    const localActive = localRuns.find((l) => l.status === 'active');
    if (localActive) {
      await pushRun(localActive);
      winningActive = localActive;
    }
  }

  // Pull any remote-only finished runs into local for history continuity.
  const localIds = new Set(localRuns.map((l) => l.id));
  for (const remote of remoteMap.values()) {
    if (remote.id === remoteActive?.id) continue;
    if (localIds.has(remote.id)) continue;
    const pulled = await pullRemoteRun(sb, remote);
    await saveRun(pulled);
  }

  // Hydrate the in-memory runStore with the winning active run so the UI
  // reflects the merged result without requiring a page reload.
  if (winningActive) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useRunStore.getState().restoreRun(winningActive as any);
    // Claim device ownership of the active run: any other tab/device still
    // playing it will detect the session mismatch on its next push and get
    // kicked out. No-op if the run is brand-new (pushRun already stamped us).
    await claimRunOwnership(winningActive.id).catch(() => {});
  }
}

// ---------- Internal: Scores ----------

async function syncScores(sb: ReturnType<typeof getSupabase> & object, userId: string): Promise<void> {
  const localScores = (await loadAllScores()) as LocalScore[];
  const { data: remoteScores } = await sb
    .from('scores')
    .select('*')
    .eq('player_id', userId);

  const remoteIds = new Set((remoteScores ?? []).map((s: ScoreRow) => s.id));
  const localIds = new Set(localScores.map((s) => s.id));

  // Push local scores not on remote
  for (const local of localScores) {
    if (!remoteIds.has(local.id)) {
      await pushScore(local);
    }
  }

  // Pull remote scores not in local
  for (const remote of (remoteScores ?? []) as ScoreRow[]) {
    if (!localIds.has(remote.id)) {
      const localScore: LocalScore = {
        id: remote.id,
        runId: remote.run_id,
        character: remote.character,
        wantedLevel: remote.wanted_level,
        baseScore: remote.base_score,
        bonusPoints: remote.bonus_points,
        wantedLevelMultiplier: remote.wanted_level_multiplier,
        timeBonus: remote.time_bonus,
        finalScore: remote.final_score,
        runDurationSeconds: remote.run_duration_seconds,
        nodesCleared: remote.nodes_cleared,
        bossesDefeated: remote.bosses_defeated,
        runCompleted: remote.run_completed,
        killedBy: remote.killed_by ?? null,
        createdAt: remote.created_at,
      };
      await saveScore(localScore);
    }
  }
}
