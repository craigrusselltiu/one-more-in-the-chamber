import type { EnemyDefinition } from '../types/combat';

/**
 * Ascension difficulty system.
 *
 * Each level (1–20) adds a discrete mutation to the run, cumulative with all
 * previous levels. See docs/CONTENT.md for the canonical definitions.
 *
 *   L1  — Elites spawn more often (+2 per act)
 *   L2  — Normal enemies deal +10% damage
 *   L3  — Elite enemies deal +10% damage
 *   L4  — Bosses deal +10% damage
 *   L5  — Heal 80% of missing HP between acts (was 100%)
 *   L6  — Start each run at 90% HP
 *   L7  — Normal enemies +10% HP
 *   L8  — Elite enemies +10% HP
 *   L9  — Bosses +10% HP
 *   L10 — Start each run with an extra Charcoal tile in the deck
 *   L11 — Consumable slots −1
 *   L12 — Upgraded merchant tiles are one tier lower (TBD — not yet wired)
 *   L13 — Gold earned ×0.9
 *   L14 — Max HP ×0.95
 *   L15 — Legendary artifact weight dropped from 3 to 1
 *   L16 — Merchant prices ×1.1
 *   L17 — Normal enemies gain new abilities (not yet implemented)
 *   L18 — Elites gain new abilities (not yet implemented)
 *   L19 — Bosses gain new abilities (not yet implemented)
 *   L20 — Final boss spawns with a random Act 3 elite as a companion
 */

export type EnemyCategory = 'normal' | 'elite' | 'boss';

export interface AscensionMutations {
  /** L1: extra elites added to each act's map generation target range. */
  eliteCountBonus: number;
  /** L2: damage multiplier applied to normal enemies. */
  normalDamageMult: number;
  /** L3: damage multiplier applied to elite enemies. */
  eliteDamageMult: number;
  /** L4: damage multiplier applied to bosses. */
  bossDamageMult: number;
  /** L5: fraction of missing HP restored between acts. 1.0 = full heal. */
  interActHealFraction: number;
  /** L6: fraction of max HP the player starts each run at. 1.0 = full. */
  startingHealthFraction: number;
  /** L7: HP multiplier applied to normal enemies. */
  normalHpMult: number;
  /** L8: HP multiplier applied to elite enemies. */
  eliteHpMult: number;
  /** L9: HP multiplier applied to bosses. */
  bossHpMult: number;
  /** L10: if true, inject 'charcoal' into the player's active tile deck at run start. */
  extraCharcoalTile: boolean;
  /** L11: consumable slot count is reduced by this many. */
  consumableSlotPenalty: number;
  /** L12: if true, merchant/tile-select reward tiles roll with the reduced upgrade distribution. */
  reducedTileUpgradeFrequency: boolean;
  /** L13: multiplier on gold gained from any source. */
  goldMultiplier: number;
  /** L14: multiplier on player starting max HP. */
  maxHealthMultiplier: number;
  /** L15: weight for legendary artifacts in rarity rolls (default 3). */
  legendaryWeight: number;
  /** L16: multiplier on merchant prices. */
  merchantPriceMultiplier: number;
  /** L20: if true, the act 3 boss spawns with a random Act 3 elite companion. */
  finalBossExtraElite: boolean;
}

const BASE_MUTATIONS: AscensionMutations = {
  eliteCountBonus: 0,
  normalDamageMult: 1.0,
  eliteDamageMult: 1.0,
  bossDamageMult: 1.0,
  interActHealFraction: 1.0,
  startingHealthFraction: 1.0,
  normalHpMult: 1.0,
  eliteHpMult: 1.0,
  bossHpMult: 1.0,
  extraCharcoalTile: false,
  consumableSlotPenalty: 0,
  reducedTileUpgradeFrequency: false,
  goldMultiplier: 1.0,
  maxHealthMultiplier: 1.0,
  legendaryWeight: 3,
  merchantPriceMultiplier: 1.0,
  finalBossExtraElite: false,
};

/** Compute the active ascension mutations for a given level (0–20, cumulative). */
export function getAscensionMutations(level: number): AscensionMutations {
  const l = Math.max(0, Math.min(20, level));
  const m: AscensionMutations = { ...BASE_MUTATIONS };
  if (l >= 1) m.eliteCountBonus = 2;
  if (l >= 2) m.normalDamageMult = 1.1;
  if (l >= 3) m.eliteDamageMult = 1.1;
  if (l >= 4) m.bossDamageMult = 1.1;
  if (l >= 5) m.interActHealFraction = 0.8;
  if (l >= 6) m.startingHealthFraction = 0.9;
  if (l >= 7) m.normalHpMult = 1.1;
  if (l >= 8) m.eliteHpMult = 1.1;
  if (l >= 9) m.bossHpMult = 1.1;
  if (l >= 10) m.extraCharcoalTile = true;
  if (l >= 11) m.consumableSlotPenalty = 1;
  if (l >= 12) m.reducedTileUpgradeFrequency = true;
  if (l >= 13) m.goldMultiplier = 0.9;
  if (l >= 14) m.maxHealthMultiplier = 0.95;
  if (l >= 15) m.legendaryWeight = 1;
  if (l >= 16) m.merchantPriceMultiplier = 1.1;
  if (l >= 20) m.finalBossExtraElite = true;
  return m;
}

/** Apply ascension HP/damage scaling to a group of enemies of the given category. */
export function applyAscensionToEnemies(
  enemies: EnemyDefinition[],
  level: number,
  category: EnemyCategory,
): void {
  if (level <= 0) return;
  const m = getAscensionMutations(level);
  const hpMult =
    category === 'boss' ? m.bossHpMult : category === 'elite' ? m.eliteHpMult : m.normalHpMult;
  const dmgMult =
    category === 'boss' ? m.bossDamageMult : category === 'elite' ? m.eliteDamageMult : m.normalDamageMult;
  for (const e of enemies) {
    e.health = Math.round(e.health * hpMult);
    e.minDamage = Math.round(e.minDamage * dmgMult);
    e.maxDamage = Math.round(e.maxDamage * dmgMult);
  }
}
