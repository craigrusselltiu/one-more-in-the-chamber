/**
 * Run state persistence.
 * Saves the run to IndexedDB on every store change and restores on app startup.
 */

import { useRunStore } from '../store/runStore';
import { saveRun, loadActiveRun } from './localSave';
import type { RunState, MapNodeType } from '../types/game';

let unsubscribe: (() => void) | null = null;

/** Migrate old node type names from before the rename. */
const NODE_TYPE_MIGRATION: Record<string, MapNodeType> = {
  shop: 'merchant',
  rest: 'campfire',
};

/** Migrate a persisted run to handle schema changes. */
function migrateRun(run: RunState): RunState {
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
    if (state.run) {
      saveRun(state.run).catch((err) => {
        console.error('[persist] run save failed:', err);
      });
    }
  });
}
