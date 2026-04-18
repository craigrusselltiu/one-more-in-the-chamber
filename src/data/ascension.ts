import type { EnemyDefinition, EnemyMove } from '../types/combat';

/**
 * Ascension difficulty system.
 *
 * Each level (1–30) adds a discrete mutation to the run, cumulative with all
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
 *   L10 — Start each run with less gold (50g instead of 100g)
 *   L11 — Consumable slots −1
 *   L12 — Upgraded merchant tiles appear less often
 *   L13 — Gold earned ×0.9
 *   L14 — Max HP ×0.95
 *   L15 — Legendary artifact weight dropped from 3 to 1
 *   L16 — Merchant prices ×1.1
 *   L17 — Normal enemies gain an additional +5% HP and +5% damage (stacks with L2/L7)
 *   L18 — Elites gain an additional +5% HP and +5% damage (stacks with L3/L8)
 *   L19 — Bosses gain an additional +5% HP and +5% damage (stacks with L4/L9)
 *   L20 — Final boss spawns with a random Act 3 elite (Summoned status)
 *   L21 — Merchants no longer stock a discounted SALE artifact
 *   L22 — Normal enemies gain an additional +5% HP
 *   L23 — Elites gain an additional +5% HP
 *   L24 — Bosses gain an additional +5% HP
 *   L25 — Start each run with a random corruption artifact
 *   L26 — Max HP ×0.9 (another −5% on top of L14)
 *   L27 — Normal enemies gain an additional +5% damage
 *   L28 — Elites gain an additional +5% damage
 *   L29 — Bosses gain an additional +5% damage
 *   L30 — Start each run with an extra Charcoal tile in the deck
 */

export type EnemyCategory = 'normal' | 'elite' | 'boss';

export interface AscensionMutations {
  /** L1: extra elites added to each act's map generation target range. */
  eliteCountBonus: number;
  /** L2 (+ L17, L27): damage multiplier applied to normal enemies. */
  normalDamageMult: number;
  /** L3 (+ L18, L28): damage multiplier applied to elite enemies. */
  eliteDamageMult: number;
  /** L4 (+ L19, L29): damage multiplier applied to bosses. */
  bossDamageMult: number;
  /** L5: fraction of missing HP restored between acts. 1.0 = full heal. */
  interActHealFraction: number;
  /** L6: fraction of max HP the player starts each run at. 1.0 = full. */
  startingHealthFraction: number;
  /** L7 (+ L17, L22): HP multiplier applied to normal enemies. */
  normalHpMult: number;
  /** L8 (+ L18, L23): HP multiplier applied to elite enemies. */
  eliteHpMult: number;
  /** L9 (+ L19, L24): HP multiplier applied to bosses. */
  bossHpMult: number;
  /** L10: if set, overrides the player's base starting gold (loadouts still stack on top). */
  startingGoldOverride: number | null;
  /** L11: consumable slot count is reduced by this many. */
  consumableSlotPenalty: number;
  /** L12: if true, merchant/tile-select reward tiles roll with the reduced upgrade distribution. */
  reducedTileUpgradeFrequency: boolean;
  /** L13: multiplier on gold gained from any source. */
  goldMultiplier: number;
  /** L14 (+ L26): multiplier on player starting max HP. */
  maxHealthMultiplier: number;
  /** L15: weight for legendary artifacts in rarity rolls (default 3). */
  legendaryWeight: number;
  /** L16: multiplier on merchant prices. */
  merchantPriceMultiplier: number;
  /** L20: if true, the act 3 boss spawns with a random Act 3 elite companion. */
  finalBossExtraElite: boolean;
  /** L21: if true, merchants stop offering a discounted SALE artifact. */
  disableMerchantSales: boolean;
  /** L25: if true, the player starts each run with one random corrupt-tagged artifact. */
  startWithRandomCorruption: boolean;
  /** L30: if true, inject 'charcoal' into the player's active tile deck at run start. */
  extraCharcoalTile: boolean;
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
  startingGoldOverride: null,
  consumableSlotPenalty: 0,
  reducedTileUpgradeFrequency: false,
  goldMultiplier: 1.0,
  maxHealthMultiplier: 1.0,
  legendaryWeight: 3,
  merchantPriceMultiplier: 1.0,
  finalBossExtraElite: false,
  disableMerchantSales: false,
  startWithRandomCorruption: false,
  extraCharcoalTile: false,
};

/** Compute the active ascension mutations for a given level (0+, cumulative). */
export function getAscensionMutations(level: number): AscensionMutations {
  const l = Math.max(0, level);
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
  if (l >= 10) m.startingGoldOverride = 50;
  if (l >= 11) m.consumableSlotPenalty = 1;
  if (l >= 12) m.reducedTileUpgradeFrequency = true;
  if (l >= 13) m.goldMultiplier = 0.9;
  if (l >= 14) m.maxHealthMultiplier = 0.95;
  if (l >= 15) m.legendaryWeight = 1;
  if (l >= 16) m.merchantPriceMultiplier = 1.1;
  // L17/18/19: additional +5% HP and damage per enemy category, stacking
  // additively with L2/L7 (normals), L3/L8 (elites), L4/L9 (bosses).
  if (l >= 17) { m.normalHpMult += 0.05; m.normalDamageMult += 0.05; }
  if (l >= 18) { m.eliteHpMult += 0.05; m.eliteDamageMult += 0.05; }
  if (l >= 19) { m.bossHpMult += 0.05; m.bossDamageMult += 0.05; }
  if (l >= 20) m.finalBossExtraElite = true;
  if (l >= 21) m.disableMerchantSales = true;
  // L22/23/24: another +5% HP per category (stacks on L7/L17 etc).
  if (l >= 22) m.normalHpMult += 0.05;
  if (l >= 23) m.eliteHpMult += 0.05;
  if (l >= 24) m.bossHpMult += 0.05;
  if (l >= 25) m.startWithRandomCorruption = true;
  if (l >= 26) m.maxHealthMultiplier = 0.9; // another -5% on top of L14
  // L27/28/29: another +5% damage per category (stacks on L2/L17 etc).
  if (l >= 27) m.normalDamageMult += 0.05;
  if (l >= 28) m.eliteDamageMult += 0.05;
  if (l >= 29) m.bossDamageMult += 0.05;
  if (l >= 30) m.extraCharcoalTile = true;
  // Ascension caps at L30. Any level past 30 is treated as L30 (no extra scaling).
  return m;
}

/** Scale damage values on an enemy's full move library (moves + firstMove + hpTriggers). */
function scaleEnemyDamage(enemy: EnemyDefinition, dmgMult: number): void {
  if (dmgMult === 1.0) return;
  // Clone move lists so we don't mutate shared module-level definitions.
  if (enemy.moves) {
    enemy.moves = enemy.moves.map((mv: EnemyMove) => ({
      ...mv,
      actions: mv.actions.map((a) =>
        a.kind === 'attack' || a.kind === 'multi_attack'
          ? { ...a, value: Math.max(1, Math.round(a.value * dmgMult)) }
          : a,
      ),
    }));
  }
  if (enemy.firstMove) {
    enemy.firstMove = {
      ...enemy.firstMove,
      actions: enemy.firstMove.actions.map((a) =>
        a.kind === 'attack' || a.kind === 'multi_attack'
          ? { ...a, value: Math.max(1, Math.round(a.value * dmgMult)) }
          : a,
      ),
    };
  }
  if (enemy.hpTriggers) {
    enemy.hpTriggers = enemy.hpTriggers.map((trig) => ({
      ...trig,
      actions: trig.actions.map((a) =>
        a.kind === 'attack' || a.kind === 'multi_attack'
          ? { ...a, value: Math.max(1, Math.round(a.value * dmgMult)) }
          : a,
      ),
      forceNextMove: trig.forceNextMove
        ? trig.forceNextMove.map((a) =>
            a.kind === 'attack' || a.kind === 'multi_attack'
              ? { ...a, value: Math.max(1, Math.round(a.value * dmgMult)) }
              : a,
          )
        : trig.forceNextMove,
    }));
  }
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
    scaleEnemyDamage(e, dmgMult);
  }
}
