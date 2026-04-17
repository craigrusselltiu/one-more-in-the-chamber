/**
 * Sync service: local (IndexedDB) <-> remote (Supabase).
 *
 * Merge rules from SPEC:
 * - meta_progression: additive merge (union unlocks, max reputation/ascension).
 * - runs (active): compare updated_at, keep more recent or more nodes cleared.
 * - scores: append-only, no remote overwrites.
 */

import { getSupabase } from './supabase';
import { getAuthState } from './auth';
import {
  saveMeta,
  loadAllRuns,
  saveRun,
  loadAllScores,
  saveScore,
} from './localSave';
import { useMetaStore, readLocalMetaUpdatedAt, markLocalMetaSynced } from '../store/metaStore';
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
  highest_ascension_cleared: number;
}

interface LocalMeta {
  key: string;
  reputation: number;
  unlockedArtifacts: string[];
  unlockedEvents: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  highestAscensionCleared: number;
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
    ascension_level: run.ascensionLevel ?? 0,
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

  // Push run_state independently (single row per run_id, no session tracking).
  await sb.from('run_state').upsert({
    run_id: run.id,
    health: run.health,
    max_health: run.maxHealth,
    gold: run.gold,
    active_tile_types: run.activeTileTypes,
    tile_upgrades: run.tileUpgrades,
    artifacts: run.artifacts,
    trait_counts: run.traitCounts,
    consumables: run.consumables,
    ability_charge: run.abilityCharge,
    map_state: run.mapState,
    combat_state: run.combatState ?? null,
    updated_at: now,
  });
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
 * Pull remote meta + runs into local, unconditionally. No merge, no push-back.
 *
 * Used on passive session restore (tab reopen) so manual DB edits in Supabase
 * reliably take effect on the next page load. Tradeoff: if the user has local
 * meta changes that haven't been pushed yet (still inside the 1.2s debounce),
 * those are lost. Acceptable because persistMeta writes the local cache
 * immediately and the debounced push fires on the NEXT mutation anyway.
 */
export async function pullRemoteStateOverwriteLocal(): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  return withSyncIndicator(async () => {
    // --- Meta ---
    try {
      const { data: remote } = await sb
        .from('meta_progression')
        .select('*')
        .eq('player_id', userId)
        .maybeSingle();
      if (remote) {
        const r = remote as MetaRow & { updated_at?: string | null };
        useMetaStore.getState().hydrateFromRemote({
          reputation: r.reputation,
          unlockedArtifacts: r.unlocked_artifacts,
          unlockedEvents: r.unlocked_events,
          unlockedCosmetics: r.unlocked_cosmetics,
          unlockedLoadouts: r.unlocked_loadouts,
          unlockedCharacters: r.unlocked_characters,
          highestAscensionCleared: r.highest_ascension_cleared,
        });
        await saveMeta('progression', {
          reputation: r.reputation,
          unlockedArtifacts: r.unlocked_artifacts,
          unlockedEvents: r.unlocked_events,
          unlockedCosmetics: r.unlocked_cosmetics,
          unlockedLoadouts: r.unlocked_loadouts,
          unlockedCharacters: r.unlocked_characters,
          highestAscensionCleared: r.highest_ascension_cleared,
        });
        if (r.updated_at) markLocalMetaSynced(r.updated_at);
      }
    } catch (err) {
      console.error('[sync] pullRemoteStateOverwriteLocal meta failed:', err);
    }

    // --- Active run ---
    try {
      const { data: remoteRuns } = await sb
        .from('runs')
        .select('*')
        .eq('player_id', userId)
        .eq('status', 'active');
      if (remoteRuns && remoteRuns.length > 0) {
        const active = remoteRuns[0] as RunRow;
        const pulled = await pullRemoteRun(sb, active);
        await saveRun(pulled);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useRunStore.getState().restoreRun(pulled as any);
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

async function checkOwnership(): Promise<void> {
  const sb = getSupabase();
  const { userId, isLoggedIn } = getAuthState();
  if (!sb || !userId || !isLoggedIn) return;
  const { data, error } = await sb
    .from('runs')
    .select('session_id')
    .eq('player_id', userId)
    .eq('status', 'active');
  if (error || !data) return;
  for (const row of data as Array<{ session_id: string | null }>) {
    if (row.session_id && row.session_id !== SESSION_ID) {
      notifyKicked();
      return;
    }
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
  // Fire one immediately so a tab that was backgrounded during a takeover
  // discovers the kick as soon as the watcher starts.
  checkOwnership().catch(() => {});
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
  highestAscensionCleared: number;
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
    highest_ascension_cleared: meta.highestAscensionCleared,
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
    ascension_level: score.ascensionLevel ?? 0,
    base_score: score.baseScore ?? 0,
    bonus_points: score.bonusPoints ?? 0,
    ascension_multiplier: score.ascensionMultiplier ?? 1,
    time_bonus: score.timeBonus ?? 0,
    final_score: score.finalScore ?? 0,
    run_duration_seconds: score.runDurationSeconds ?? 0,
    nodes_cleared: score.nodesCleared ?? 0,
    bosses_defeated: score.bossesDefeated ?? 0,
    run_completed: score.runCompleted ?? false,
    tiles: score.tiles ?? null,
    artifacts: score.artifacts ?? null,
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
    highestAscensionCleared: zustand.highestAscensionCleared,
  };
  const { data: remote } = await sb.from('meta_progression').select('*').eq('player_id', userId).single();
  const remoteRow = remote as (MetaRow & { updated_at?: string | null }) | null;

  const localUpdatedAt = readLocalMetaUpdatedAt();
  const remoteUpdatedAt = remoteRow?.updated_at ?? null;
  const merged = mergeMeta(local, remoteRow, localUpdatedAt, remoteUpdatedAt);

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
    highest_ascension_cleared: merged.highestAscensionCleared,
    updated_at: now,
  });
  markLocalMetaSynced(now);
}

/**
 * Merge local and remote meta progression.
 *
 * - Unlocks (arrays): always union -- additive merges are safe for array fields.
 * - Numeric fields (reputation, highestAscensionCleared): if a side has a
 *   STRICTLY newer updated_at timestamp, that side's values win entirely.
 *   This lets devs/admins edit values in Supabase (bumping updated_at) and
 *   have those edits take effect -- including decreases. If timestamps are
 *   equal or missing, fall back to max-merge for multi-device concurrent
 *   play safety.
 */
function mergeMeta(
  local: LocalMeta | null,
  remote: MetaRow | null,
  localUpdatedAt: string | null,
  remoteUpdatedAt: string | null,
): Omit<LocalMeta, 'key'> {
  const l = local ?? {
    reputation: 0,
    unlockedArtifacts: [],
    unlockedEvents: [],
    unlockedCosmetics: [],
    unlockedLoadouts: [],
    unlockedCharacters: ['red_panda'],
    highestAscensionCleared: 0,
  };
  const r = remote ?? {
    reputation: 0,
    unlocked_artifacts: [] as string[],
    unlocked_events: [] as string[],
    unlocked_cosmetics: [] as string[],
    unlocked_loadouts: [] as string[],
    unlocked_characters: ['red_panda'],
    highest_ascension_cleared: 0,
  };

  // Decide the "winner" for numeric fields by timestamp comparison.
  const lt = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
  const rt = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;
  let reputation: number;
  let highestAscensionCleared: number;
  if (rt > lt) {
    reputation = r.reputation;
    highestAscensionCleared = r.highest_ascension_cleared;
  } else if (lt > rt) {
    reputation = l.reputation;
    highestAscensionCleared = l.highestAscensionCleared;
  } else {
    reputation = Math.max(l.reputation, r.reputation);
    highestAscensionCleared = Math.max(l.highestAscensionCleared, r.highest_ascension_cleared);
  }

  return {
    reputation,
    unlockedArtifacts: union(l.unlockedArtifacts, r.unlocked_artifacts),
    unlockedEvents: union(l.unlockedEvents, r.unlocked_events),
    unlockedCosmetics: union(l.unlockedCosmetics, r.unlocked_cosmetics),
    unlockedLoadouts: union(l.unlockedLoadouts, r.unlocked_loadouts),
    unlockedCharacters: union(l.unlockedCharacters, r.unlocked_characters),
    highestAscensionCleared,
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
    .single();
  return {
    id: remote.id,
    character: remote.character as string,
    seed: remote.seed as string,
    ascensionLevel: remote.ascension_level as number,
    currentAct: remote.current_act as number,
    currentNodeId: remote.current_node_id as string | null,
    status: remote.status,
    updatedAt: remote.updated_at,
    health: runState?.health ?? 100,
    maxHealth: runState?.max_health ?? 100,
    gold: runState?.gold ?? 0,
    activeTileTypes: runState?.active_tile_types ?? ['bullet', 'iron', 'gold'],
    tileUpgrades: runState?.tile_upgrades ?? {},
    artifacts: runState?.artifacts ?? [],
    traitCounts: runState?.trait_counts ?? {},
    consumables: runState?.consumables ?? [],
    abilityCharge: runState?.ability_charge ?? 0,
    mapState: runState?.map_state ?? null,
  };
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

  for (const local of localRuns) {
    const remote = remoteMap.get(local.id);
    if (!remote) {
      // Local-only run -- push to remote
      await pushRun(local);
      if (local.status === 'active') winningActive = local;
    } else if (local.status === 'active' && remote.status === 'active') {
      // Both active -- keep the more recent
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const remoteTime = new Date(remote.updated_at).getTime();
      if (localTime >= remoteTime) {
        await pushRun(local);
        winningActive = local;
      } else {
        // Remote is newer: pull run_state and overwrite local.
        const pulled = await pullRemoteRun(sb, remote);
        await saveRun(pulled);
        winningActive = pulled;
      }
    } else if (remote.status === 'active' && local.status !== 'active') {
      // Remote has an active run we don't know about locally -- pull it.
      const pulled = await pullRemoteRun(sb, remote);
      await saveRun(pulled);
      winningActive = pulled;
    }
    remoteMap.delete(local.id);
  }

  // Remote-only runs (no matching local id at all) -- pull to local
  for (const remote of remoteMap.values()) {
    const pulled = await pullRemoteRun(sb, remote);
    await saveRun(pulled);
    if (pulled.status === 'active') winningActive = pulled;
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
        ascensionLevel: remote.ascension_level,
        baseScore: remote.base_score,
        bonusPoints: remote.bonus_points,
        ascensionMultiplier: remote.ascension_multiplier,
        timeBonus: remote.time_bonus,
        finalScore: remote.final_score,
        runDurationSeconds: remote.run_duration_seconds,
        nodesCleared: remote.nodes_cleared,
        bossesDefeated: remote.bosses_defeated,
        runCompleted: remote.run_completed,
        createdAt: remote.created_at,
      };
      await saveScore(localScore);
    }
  }
}
