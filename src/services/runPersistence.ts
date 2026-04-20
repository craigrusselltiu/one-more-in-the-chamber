/**
 * Run state persistence.
 * Saves the run to IndexedDB on every store change and restores on app startup.
 */

import { useRunStore } from '../store/runStore';
import { saveRun, loadActiveRun } from './localSave';
import { pushRun } from './syncService';
import { getAuthState } from './auth';
import type { RunState, MapNodeType } from '../types/game';

let unsubscribe: (() => void) | null = null;
let paused = false;

/** Debounced remote push -- the run store mutates many times per turn during
 *  combat; coalesce into at most one request per PUSH_INTERVAL_MS. */
const PUSH_INTERVAL_MS = 1500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPush: RunState | null = null;

function schedulePush(run: RunState): void {
  if (!getAuthState().isLoggedIn) return;
  pendingPush = run;
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    const snapshot = pendingPush;
    pushTimer = null;
    pendingPush = null;
    if (snapshot) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pushRun(snapshot as any).catch((err) => console.error('[sync] pushRun failed:', err));
    }
  }, PUSH_INTERVAL_MS);
}

/**
 * Pause auto-save. Used by events so that intermediate state changes
 * (card reveals, choice resolution) do not persist mid-event.
 */
export function pauseRunPersistence(): void {
  paused = true;
}

/**
 * Resume auto-save. Deliberately does NOT force a save -- in-memory changes
 * made while paused should NOT leak to disk on resume. That way, quitting
 * mid-event leaves the on-disk state at the pre-choice checkpoint, and
 * returning to the run re-runs the event from the start. Callers that want
 * to checkpoint the current state should call `forceSaveRun` explicitly.
 */
export function resumeRunPersistence(): void {
  paused = false;
}

/** Force an immediate save of the current run state (bypasses the pause flag). */
export function forceSaveRun(): void {
  const state = useRunStore.getState();
  if (state.run) {
    saveRun(state.run).catch((err) => {
      console.error('[persist] run save failed:', err);
    });
    schedulePush(state.run);
  }
}

/** Migrate old node type names from before the rename. */
const NODE_TYPE_MIGRATION: Record<string, MapNodeType> = {
  shop: 'merchant',
  rest: 'campfire',
};

/** Migrate a persisted run to handle schema changes. */
function migrateRun(run: RunState): RunState {
  // Rename: ascensionLevel -> wantedLevel. Old runs persisted before the
  // Ascension -> Wanted Level rename (Apr 2026) have no wantedLevel key;
  // without this copy, scoring.ts reads undefined and the final score comes
  // out NaN, which silently stores as NULL in scores.wanted_level_multiplier
  // and scores.final_score on upsert.
  const legacy = run as unknown as { ascensionLevel?: number };
  if (legacy.ascensionLevel != null && run.wantedLevel == null) {
    run.wantedLevel = legacy.ascensionLevel;
    console.info('[persist] migrated run: ascensionLevel -> wantedLevel');
  }

  // Rename consumable ID: tonic -> strong_whiskey
  if (Array.isArray(run.consumables)) {
    let migrated = false;
    for (const consumable of run.consumables) {
      if (consumable && (consumable as { id?: unknown }).id === 'tonic') {
        (consumable as { id: string }).id = 'strong_whiskey';
        migrated = true;
      }
    }
    if (migrated) {
      console.info('[persist] migrated consumable id: tonic -> strong_whiskey');
    }
  }

  if (!run.mapState) return run;
  let migrated = false;
  for (const node of run.mapState.nodes) {
    const replacement = NODE_TYPE_MIGRATION[node.type];
    if (replacement) {
      (node as { type: MapNodeType }).type = replacement;
      migrated = true;
    }
  }
  if (migrated) {
    console.info('[persist] migrated old node types (shop→merchant, rest→campfire)');
  }
  return run;
}

/**
 * Load the active run from IndexedDB into the run store.
 * Call once at app startup before checking for combat resume.
 * Returns true if an active run was found and restored.
 */
export async function loadPersistedRun(): Promise<boolean> {
  try {
    const data = await loadActiveRun();
    if (data && typeof data === 'object' && 'id' in data) {
      const run = migrateRun(data as RunState);
      useRunStore.getState().restoreRun(run);
      return true;
    }
  } catch {
    // Load failed -- start fresh
  }
  return false;
}

/**
 * Subscribe to run store changes and persist to IndexedDB.
 * Call once at app startup after loading the persisted run.
 */
export function startRunPersistence(): void {
  if (unsubscribe) return; // Already subscribed

  unsubscribe = useRunStore.subscribe((state) => {
    if (paused) return;
    if (state.run) {
      saveRun(state.run).catch((err) => {
        console.error('[persist] run save failed:', err);
      });
      schedulePush(state.run);
    }
  });
}
