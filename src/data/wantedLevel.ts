import type { EnemyDefinition, EnemyMove } from '../types/combat';

/**
 * Wanted Level difficulty system (the "ascension" convention from deck-builders,
 * renamed for this game's Western / outlaw theme).
 *
 * Each level (1-30) adds a discrete mutation to the run, cumulative with all
 * previous levels. See docs/CONTENT.md for the canonical definitions.
 *
 *   L1  -- Normal enemies deal +10% damage
 *   L2  -- Elite enemies deal +10% damage
 *   L3  -- Bosses deal +10% damage
 *   L4  -- Elites spawn more often (+2 per act)
 *   L5  -- Heal 80% of missing HP between acts (was 100%)
 *   L6  -- Start each run at 90% HP
 *   L7  -- Normal enemies +10% HP
 *   L8  -- Elite enemies +10% HP
 *   L9  -- Bosses +10% HP
 *   L10 -- Start each run with less gold (50g instead of 100g)
 *   L11 -- Consumable slots -1
 *   L12 -- Upgraded merchant tiles appear less often
 *   L13 -- Gold earned x0.9
 *   L14 -- Max HP x0.95
 *   L15 -- Merchants no longer stock a discounted SALE artifact
 *   L16 -- Normal enemies gain an additional +10% HP (stacks with L7)
 *   L17 -- Elites gain an additional +10% HP (stacks with L8)
 *   L18 -- Bosses gain an additional +10% HP (stacks with L9)
 *   L19 -- Merchant upgrade base price raised by 50g (200 -> 250)
 *   L20 -- Legendary artifact weight dropped from 3 to 1
 *   L21 -- Merchant prices x1.1
 *   L22 -- Normal enemies gain an additional +10% damage (stacks with L1)
 *   L23 -- Elites gain an additional +10% damage (stacks with L2)
 *   L24 -- Bosses gain an additional +10% damage (stacks with L3)
 *   L25 -- Start each run with a random corruption artifact
 *   L26 -- Outlaw King encounter chance x2 on every act
 *   L27 -- Max HP x0.9 (another -5% on top of L14)
 *   L28 -- Final boss spawns with a random Act 3 elite (Summoned status)
 *   L29 -- Campfires are less common (-1 assignable per act)
 *   L30 -- Start each run with an extra Charcoal tile in the deck
 */

export type EnemyCategory = 'normal' | 'elite' | 'boss';

export interface WantedLevelMutations {
  /** L4: extra elites added to each act's map generation target range. */
  eliteCountBonus: number;
  /** L1 (+ L22): damage multiplier applied to normal enemies. */
  normalDamageMult: number;
  /** L2 (+ L23): damage multiplier applied to elite enemies. */
  eliteDamageMult: number;
  /** L3 (+ L24): damage multiplier applied to bosses. */
  bossDamageMult: number;
  /** L5: fraction of missing HP restored between acts. 1.0 = full heal. */
  interActHealFraction: number;
  /** L6: fraction of max HP the player starts each run at. 1.0 = full. */
  startingHealthFraction: number;
  /** L7 (+ L16): HP multiplier applied to normal enemies. */
  normalHpMult: number;
  /** L8 (+ L17): HP multiplier applied to elite enemies. */
  eliteHpMult: number;
  /** L9 (+ L18): HP multiplier applied to bosses. */
  bossHpMult: number;
  /** L10: if set, overrides the player's base starting gold (loadouts still stack on top). */
  startingGoldOverride: number | null;
  /** L11: consumable slot count is reduced by this many. */
  consumableSlotPenalty: number;
  /** L12: if true, merchant/tile-select reward tiles roll with the reduced upgrade distribution. */
  reducedTileUpgradeFrequency: boolean;
  /** L13: multiplier on gold gained from any source. */
  goldMultiplier: number;
  /** L14 (+ L27): multiplier on player starting max HP. */
  maxHealthMultiplier: number;
  /** L15: if true, merchants stop offering a discounted SALE artifact. */
  disableMerchantSales: boolean;
  /** L19: flat bonus added to the merchant upgrade card's base price (pre-multipliers). */
  merchantUpgradeBasePriceBonus: number;
  /** L20: weight for legendary artifacts in rarity rolls (default 3). */
  legendaryWeight: number;
  /** L21: multiplier on merchant prices. */
  merchantPriceMultiplier: number;
  /** L25: if true, the player starts each run with one random corrupt-tagged artifact. */
  startWithRandomCorruption: boolean;
  /** L26: multiplier applied to the Outlaw King encounter chance on every act. */
  outlawKingChanceMultiplier: number;
  /** L28: if true, the act 3 boss spawns with a random Act 3 elite companion. */
  finalBossExtraElite: boolean;
  /** L29: number of assignable campfires removed from each act's map roll. */
  campfireCountPenalty: number;
  /** L30: if true, inject 'charcoal' into the player's active tile deck at run start. */
  extraCharcoalTile: boolean;
}

const BASE_MUTATIONS: WantedLevelMutations = {
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
  disableMerchantSales: false,
  merchantUpgradeBasePriceBonus: 0,
  legendaryWeight: 3,
  merchantPriceMultiplier: 1.0,
  startWithRandomCorruption: false,
  outlawKingChanceMultiplier: 1.0,
  finalBossExtraElite: false,
  campfireCountPenalty: 0,
  extraCharcoalTile: false,
};

/** Compute the active wanted-level mutations for a given level (0+, cumulative). */
export function getWantedLevelMutations(level: number): WantedLevelMutations {
  const l = Math.max(0, level);
  const m: WantedLevelMutations = { ...BASE_MUTATIONS };
  // L1/L2/L3: base damage bumps per enemy category.
  if (l >= 1) m.normalDamageMult = 1.1;
  if (l >= 2) m.eliteDamageMult = 1.1;
  if (l >= 3) m.bossDamageMult = 1.1;
  if (l >= 4) m.eliteCountBonus = 2;
  if (l >= 5) m.interActHealFraction = 0.8;
  if (l >= 6) m.startingHealthFraction = 0.9;
  // L7/L8/L9: base HP bumps per enemy category.
  if (l >= 7) m.normalHpMult = 1.1;
  if (l >= 8) m.eliteHpMult = 1.1;
  if (l >= 9) m.bossHpMult = 1.1;
  if (l >= 10) m.startingGoldOverride = 50;
  if (l >= 11) m.consumableSlotPenalty = 1;
  if (l >= 12) m.reducedTileUpgradeFrequency = true;
  if (l >= 13) m.goldMultiplier = 0.9;
  if (l >= 14) m.maxHealthMultiplier = 0.95;
  if (l >= 15) m.disableMerchantSales = true;
  // L16/L17/L18: another +10% HP per category (stacks on L7/L8/L9).
  if (l >= 16) m.normalHpMult += 0.1;
  if (l >= 17) m.eliteHpMult += 0.1;
  if (l >= 18) m.bossHpMult += 0.1;
  if (l >= 19) m.merchantUpgradeBasePriceBonus = 50;
  if (l >= 20) m.legendaryWeight = 1;
  if (l >= 21) m.merchantPriceMultiplier = 1.1;
  // L22/L23/L24: another +10% damage per category (stacks on L1/L2/L3).
  if (l >= 22) m.normalDamageMult += 0.1;
  if (l >= 23) m.eliteDamageMult += 0.1;
  if (l >= 24) m.bossDamageMult += 0.1;
  if (l >= 25) m.startWithRandomCorruption = true;
  if (l >= 26) m.outlawKingChanceMultiplier = 2.0;
  if (l >= 27) m.maxHealthMultiplier = 0.9; // another -5% on top of L14
  if (l >= 28) m.finalBossExtraElite = true;
  if (l >= 29) m.campfireCountPenalty = 1;
  if (l >= 30) m.extraCharcoalTile = true;
  // Wanted Level caps at L30. Any level past 30 is treated as L30 (no extra scaling).
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

/** Apply wanted-level HP/damage scaling to a group of enemies of the given category. */
export function applyWantedLevelToEnemies(
  enemies: EnemyDefinition[],
  level: number,
  category: EnemyCategory,
): void {
  if (level <= 0) return;
  const m = getWantedLevelMutations(level);
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
