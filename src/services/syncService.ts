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
import { useMetaStore } from '../store/metaStore';
import { useRunStore } from '../store/runStore';

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

// ---------- Public API ----------

/** Sync local <-> remote on login or reconnect. */
export async function syncOnLogin(): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  try {
    await syncMeta(sb, userId);
    await syncRuns(sb, userId);
    await syncScores(sb, userId);
  } catch (err) {
    console.error('[sync] sync failed:', err);
  }
}

/** Alias -- same merge logic on reconnect. */
export async function syncOnReconnect(): Promise<void> {
  return syncOnLogin();
}

/** Push current run state to remote. Call after every node. */
export async function pushRun(run: LocalRun): Promise<void> {
  const sb = getSupabase();
  const { userId } = getAuthState();
  if (!sb || !userId) return;

  const now = new Date().toISOString();
  await sb.from('runs').upsert({
    id: run.id,
    player_id: userId,
    character: run.character ?? 'red_panda',
    status: run.status,
    seed: run.seed,
    ascension_level: run.ascensionLevel ?? 0,
    current_act: run.currentAct ?? 1,
    current_node_id: run.currentNodeId ?? null,
    updated_at: now,
  });

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

  const merged = mergeMeta(local, remote as MetaRow | null);

  // Hydrate merged state into the zustand store (updates localStorage too).
  useMetaStore.getState().hydrateFromRemote(merged);

  // Save merged to IndexedDB (redundant shadow).
  await saveMeta('progression', merged);

  // Save merged to remote.
  await sb.from('meta_progression').upsert({
    player_id: userId,
    reputation: merged.reputation,
    unlocked_artifacts: merged.unlockedArtifacts,
    unlocked_events: merged.unlockedEvents,
    unlocked_cosmetics: merged.unlockedCosmetics,
    unlocked_loadouts: merged.unlockedLoadouts,
    unlocked_characters: merged.unlockedCharacters,
    highest_ascension_cleared: merged.highestAscensionCleared,
    updated_at: new Date().toISOString(),
  });
}

function mergeMeta(local: LocalMeta | null, remote: MetaRow | null): Omit<LocalMeta, 'key'> {
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

  return {
    reputation: Math.max(l.reputation, r.reputation),
    unlockedArtifacts: union(l.unlockedArtifacts, r.unlocked_artifacts),
    unlockedEvents: union(l.unlockedEvents, r.unlocked_events),
    unlockedCosmetics: union(l.unlockedCosmetics, r.unlocked_cosmetics),
    unlockedLoadouts: union(l.unlockedLoadouts, r.unlocked_loadouts),
    unlockedCharacters: union(l.unlockedCharacters, r.unlocked_characters),
    highestAscensionCleared: Math.max(l.highestAscensionCleared, r.highest_ascension_cleared),
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
