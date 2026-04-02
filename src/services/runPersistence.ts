/**
 * Run state persistence.
 * Saves the run to IndexedDB on every store change and restores on app startup.
 */

import { useRunStore } from '../store/runStore';
import { saveRun, loadActiveRun } from './localSave';
import type { RunState } from '../types/game';

let unsubscribe: (() => void) | null = null;

/**
 * Load the active run from IndexedDB into the run store.
 * Call once at app startup before checking for combat resume.
 * Returns true if an active run was found and restored.
 */
export async function loadPersistedRun(): Promise<boolean> {
  try {
    const data = await loadActiveRun();
    if (data && typeof data === 'object' && 'id' in data) {
      useRunStore.getState().restoreRun(data as RunState);
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
