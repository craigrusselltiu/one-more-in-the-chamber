import type { BoardHazardManager } from '../board/BoardHazardManager';

/**
 * Elite encounter board modifiers.
 * Applied at fight start and persist for the entire fight.
 *
 * From SPEC:
 *   Dust Storm    -- 3 random tiles start buried.
 *   Quicksand     -- bottom row is locked at fight start.
 *   Narrow Canyon -- 2 columns blocked by barricades (6x8 playable area).
 *   Cracked Ground -- cascades deal no damage for the first 2 turns.
 */

export type EliteModifierId =
  | 'dust_storm'
  | 'quicksand'
  | 'narrow_canyon'
  | 'cracked_ground';

export interface EliteModifier {
  id: EliteModifierId;
  name: string;
  description: string;
}

export const ELITE_MODIFIERS: EliteModifier[] = [
  {
    id: 'dust_storm',
    name: 'Dust Storm',
    description: '3 random tiles start buried.',
  },
  {
    id: 'quicksand',
    name: 'Quicksand',
    description: 'Bottom row is locked at fight start.',
  },
  {
    id: 'narrow_canyon',
    name: 'Narrow Canyon',
    description: '2 columns are blocked by barricades.',
  },
  {
    id: 'cracked_ground',
    name: 'Cracked Ground',
    description: 'Cascades deal no damage for the first 2 turns.',
  },
];

/** Pick a random elite modifier. */
export function rollEliteModifier(): EliteModifier {
  return ELITE_MODIFIERS[Math.floor(Math.random() * ELITE_MODIFIERS.length)];
}

/**
 * Apply an elite modifier's board setup effect at fight start.
 * Returns the modifier ID so the combat manager can track ongoing effects.
 */
export function applyEliteModifier(
  modifier: EliteModifier,
  hazardManager: BoardHazardManager,
): void {
  switch (modifier.id) {
    case 'dust_storm':
      hazardManager.placeRandomSand(3);
      break;

    case 'quicksand':
      hazardManager.lockBottomRow();
      break;

    case 'narrow_canyon': {
      // Block 2 random columns (but not adjacent to avoid completely splitting the board)
      const col1 = Math.floor(Math.random() * 4); // 0-3
      const col2 = col1 + 3 + Math.floor(Math.random() * 2); // col1+3 or col1+4
      hazardManager.placeBarricadeColumn(col1);
      hazardManager.placeBarricadeColumn(Math.min(col2, 7));
      break;
    }

    case 'cracked_ground':
      // Cracked Ground is a runtime modifier tracked by CombatManager;
      // no board setup needed here.
      break;
  }
}

/**
 * Check if cascade damage should be suppressed this turn
 * (Cracked Ground: no cascade damage for first 2 turns).
 */
export function shouldSuppressCascadeDamage(
  modifierId: EliteModifierId | null,
  turnNumber: number,
): boolean {
  return modifierId === 'cracked_ground' && turnNumber <= 2;
}
