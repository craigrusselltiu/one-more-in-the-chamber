import type { EnemyDefinition } from '../types/combat';

/**
 * Ascension difficulty modifiers.
 *
 * Levels 0-20, cumulative. Each level stacks:
 *   - Enemy HP:       +10% per level
 *   - Enemy damage:   +5%  per level
 *   - Gold earned:    -5%  per level (floor 50%)
 *   - Shop prices:    +5%  per level
 *
 * Specifics TBD via playtesting -- these are initial values.
 */

export interface AscensionModifiers {
  /** Multiplier for enemy max HP. */
  enemyHpMultiplier: number;
  /** Multiplier for enemy min/max damage. */
  enemyDamageMultiplier: number;
  /** Multiplier for gold earned from tiles and combat rewards. */
  goldMultiplier: number;
  /** Multiplier for shop prices. */
  shopPriceMultiplier: number;
}

/** Compute cumulative ascension modifiers for a given level (0-20). */
export function getAscensionModifiers(level: number): AscensionModifiers {
  const clamped = Math.max(0, Math.min(20, level));
  return {
    enemyHpMultiplier: 1 + 0.1 * clamped,
    enemyDamageMultiplier: 1 + 0.05 * clamped,
    goldMultiplier: Math.max(0.5, 1 - 0.05 * clamped),
    shopPriceMultiplier: 1 + 0.05 * clamped,
  };
}

/** Apply ascension scaling to enemy definitions (mutates in place). */
export function applyAscensionToEnemies(
  enemies: EnemyDefinition[],
  level: number,
): void {
  if (level <= 0) return;
  const mods = getAscensionModifiers(level);
  for (const e of enemies) {
    e.health = Math.round(e.health * mods.enemyHpMultiplier);
    e.minDamage = Math.round(e.minDamage * mods.enemyDamageMultiplier);
    e.maxDamage = Math.round(e.maxDamage * mods.enemyDamageMultiplier);
  }
}
