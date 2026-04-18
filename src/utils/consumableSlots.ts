import type { RunState } from '../types/game';
import { getWantedLevelMutations } from '../data/wantedLevel';

/**
 * Compute the player's max consumable slot count.
 *
 * Base is 3. Saddlebag artifact raises it to 5. Wanted-level L11 penalty
 * subtracts one slot. Floor of 1 so the player always has at least one slot.
 */
export function getMaxConsumableSlots(run: Pick<RunState, 'artifacts' | 'wantedLevel'>): number {
  const base = run.artifacts.some((a) => a.id === 'saddlebag') ? 5 : 3;
  const penalty = getWantedLevelMutations(run.wantedLevel).consumableSlotPenalty;
  return Math.max(1, base - penalty);
}
