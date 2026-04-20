import type { RunState } from '../types/game';

/**
 * Adjust an out-of-combat heal amount for run-level modifiers.
 * Keeps Dry Atmosphere (-20%) consistent across campfires, events, etc.
 */
export function adjustHeal(run: RunState | null | undefined, amount: number): number {
  if (!run || amount <= 0) return amount;
  let mult = 1.0;
  if (run.artifacts?.some((a) => a.id === 'dry_atmosphere')) {
    mult *= 0.8;
  }
  return Math.max(0, Math.round(amount * mult));
}
