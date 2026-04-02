/**
 * Mid-combat resume logic.
 * Checks IndexedDB for a saved combat snapshot and prepares it for restoration.
 */

import type { CombatSnapshot } from '../types/combatSnapshot';
import { loadCombatSnapshot } from './localSave';
import { useRunStore } from '../store/runStore';

/** Pending snapshot set by checkForCombatResume, consumed by App on combat entry. */
let pendingSnapshot: CombatSnapshot | null = null;

/** Get and clear the pending snapshot. */
export function consumePendingSnapshot(): CombatSnapshot | null {
  const snapshot = pendingSnapshot;
  pendingSnapshot = null;
  return snapshot;
}

/**
 * Check for a mid-combat save for the active run.
 * If one exists, stores it as the pending snapshot and returns true.
 */
export async function checkForCombatResume(): Promise<boolean> {
  const run = useRunStore.getState().run;
  if (!run || run.status !== 'active') return false;

  try {
    const snapshot = (await loadCombatSnapshot(run.id)) as CombatSnapshot | null;
    if (snapshot && snapshot.runId === run.id && snapshot.phase !== 'combat-end') {
      pendingSnapshot = snapshot;
      return true;
    }
  } catch {
    // Snapshot load failed -- ignore, start normally
  }

  return false;
}
