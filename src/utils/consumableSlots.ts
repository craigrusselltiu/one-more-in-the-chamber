import type { RunState } from '../types/game';
import { getAscensionMutations } from '../data/ascension';

/**
 * Compute the player's max consumable slot count.
 *
 * Base is 3. Saddlebag artifact raises it to 5. Ascension L11 penalty
 * subtracts one slot. Floor of 1 so the player always has at least one slot.
 */
export function getMaxConsumableSlots(run: Pick<RunState, 'artifacts' | 'ascensionLevel'>): number {
  const base = run.artifacts.some((a) => a.id === 'saddlebag') ? 5 : 3;
  const penalty = getAscensionMutations(run.ascensionLevel).consumableSlotPenalty;
  return Math.max(1, base - penalty);
}
