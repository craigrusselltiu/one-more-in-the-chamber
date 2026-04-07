import type { TraitId } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import type { ResourceOutput } from './ResourceResolver';
import type { Player } from './Player';
import type { Enemy } from './Enemy';
import { TILE_DEFINITIONS } from '../../data/tiles';

/**
 * TraitSystem: evaluates active trait breakpoints from artifact tag counts
 * and applies effects at each combat hook point.
 *
 * Traits are powered by artifact tags. Your trait level equals the number
 * of artifacts you hold with that tag. When you reach a breakpoint, the
 * effect activates automatically.
 */
export class TraitSystem {
  private counts: Partial<Record<TraitId, number>>;

  /** Tracks total matches this fight for various counters. */
  private matchCountThisFight = 0;
  /** Tracks swaps used this turn. */
  private swapsUsedThisTurn = 0;
  /** Sheriff(2): whether the first block gain this turn has been doubled. */
  private sheriffBlockUsedThisTurn = false;
  /** Dead Man Walking(7): once/fight lethal protection. */
  deadManWalkingAvailable = false;

  constructor(traitCounts: Partial<Record<TraitId, number>>) {
    this.counts = { ...traitCounts };
  }

  /** Return the raw trait counts for snapshot serialization. */
  getCounts(): Partial<Record<TraitId, number>> {
    return { ...this.counts };
  }

  /** Restore internal state from a mid-combat snapshot. */
  restoreState(matchCount: number, swapsUsed: number, sheriffBlockUsed = false): void {
    this.matchCountThisFight = matchCount;
    this.swapsUsedThisTurn = swapsUsed;
    this.sheriffBlockUsedThisTurn = sheriffBlockUsed;
  }

  /** Check if a trait has reached a given breakpoint threshold. */
  isActive(trait: TraitId, threshold: number): boolean {
    return (this.counts[trait] ?? 0) >= threshold;
  }

  getLevel(trait: TraitId): number {
    return this.counts[trait] ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Fight Start
  // ---------------------------------------------------------------------------

  /** Apply fight-start effects. Called once when combat begins. */
  onFightStart(player: Player, isBoss: boolean, enemies: Enemy[]): void {
    this.matchCountThisFight = 0;

    // Sheriff(4): gain 5 Sturdy at fight start
    if (this.isActive('sheriff', 4)) {
      player.sturdyStacks += 5;
    }

    // Outlaw(5): at start of Boss encounters, gain 3 Rageful + 2 Vulnerable to all enemies
    if (isBoss && this.isActive('outlaw', 5)) {
      player.ragefulStacks += 3;
      for (const enemy of enemies) {
        if (!enemy.state.isDead) enemy.addVulnerable(2);
      }
    }

    // Dead Man Walking(7): arm lethal protection
    if (this.isActive('dead_man_walking', 7)) {
      this.deadManWalkingAvailable = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Turn Start
  // ---------------------------------------------------------------------------

  /** Apply turn-start effects. */
  onTurnStart(_player: Player): void {
    this.swapsUsedThisTurn = 0;
    this.sheriffBlockUsedThisTurn = false;
  }

  /** Get extra swaps per turn from traits. */
  getExtraSwapsPerTurn(): number {
    // Mustang(4): +1 swap/turn
    return this.isActive('mustang', 4) ? 1 : 0;
  }

  /** Whether a non-adjacent swap is allowed this turn. */
  allowsNonAdjacentSwap(): boolean {
    return this.isActive('mustang', 4);
  }

  // ---------------------------------------------------------------------------
  // Swap tracking
  // ---------------------------------------------------------------------------

  onSwapPerformed(): void {
    this.swapsUsedThisTurn++;
  }

  getSwapsUsedThisTurn(): number {
    return this.swapsUsedThisTurn;
  }

  // ---------------------------------------------------------------------------
  // Match Modification
  // ---------------------------------------------------------------------------

  /**
   * Modify resource output based on trait effects.
   * Called after ResourceResolver computes the base output.
   * @param isLassoSwap Whether the originating swap was non-adjacent (lasso).
   */
  modifyMatchOutput(
    match: MatchResult,
    output: ResourceOutput,
    player: Player,
    _targetEnemy: Enemy | null,
    isLassoSwap = false,
  ): ResourceOutput {
    const modified = { ...output };

    this.matchCountThisFight++;

    // --- Sheriff ---

    // Sheriff(2): first block gain each turn is doubled
    if (modified.block > 0 && !this.sheriffBlockUsedThisTurn && this.isActive('sheriff', 2)) {
      modified.block *= 2;
      this.sheriffBlockUsedThisTurn = true;
    }

    // --- Prospector ---

    // Prospector(2): any match: 20% chance to generate 1 gold
    if (this.isActive('prospector', 2)) {
      if (Math.random() < 0.2) {
        modified.gold += 1;
      }
    }

    // Prospector(6): deal 10% of current gold as extra damage
    if (this.isActive('prospector', 6) && player.gold > 0) {
      modified.damage += Math.floor(player.gold * 0.1);
    }

    // --- Rattlesnake ---
    // Rattlesnake(1): Immune to poison tile damage/debuffs -- handled in hazard system
    // Rattlesnake(3): Matching poison tiles deals damage + venom -- handled in hazard system

    // --- Sapper ---
    // Sapper effects are board-hazard related -- handled in hazard system

    // --- Mustang ---

    // Mustang(4): 5+ tile lasso (non-adjacent) matches: +50% damage
    if (isLassoSwap && match.length >= 5 && this.isActive('mustang', 4)) {
      modified.damage = Math.round(modified.damage * 1.5);
    }

    // --- Gunslinger ---
    const isGunTile = match.tileType === 'bullet' || match.tileType === 'fifty_cal'
      || match.tileType === 'buckshot' || match.tileType === 'ricochet';

    // Gunslinger(2): Gun tiles deal 1 extra damage per tile
    if (isGunTile && this.isActive('gunslinger', 2)) {
      modified.damage += match.length;
    }

    // Gunslinger(4): Gain 1 Lucky stack per gun tile matched
    if (isGunTile && this.isActive('gunslinger', 4)) {
      modified.luckyStacks += match.length;
    }

    // --- Sniper ---

    // Sniper(4): on 5-match, gain 1 swap for that turn
    if (match.length >= 5 && this.isActive('sniper', 4)) {
      modified.bonusSwaps += 1;
    }

    // --- Dead Man Walking ---

    // Dead Man Walking(5): below 20% HP, all damage is doubled
    if (this.isActive('dead_man_walking', 5) && player.health < player.maxHealth * 0.2) {
      modified.damage *= 2;
    }

    return modified;
  }

  // ---------------------------------------------------------------------------
  // Enemy Kill Hook
  // ---------------------------------------------------------------------------

  /** Called when an enemy is killed. Returns rageful stacks to add. */
  onEnemyKilled(): number {
    // Outlaw(2): killing an enemy grants 1 Rageful
    if (this.isActive('outlaw', 2)) {
      return 1;
    }
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Gold Gain Hook
  // ---------------------------------------------------------------------------

  /** Prospector(4): whenever gold is gained in combat, deal 1 damage to a random enemy. */
  goldDealsDamage(): boolean {
    return this.isActive('prospector', 4);
  }

  // ---------------------------------------------------------------------------
  // Damage Reduction
  // ---------------------------------------------------------------------------

  /** Dead Man Walking(3): reduce incoming damage by 1. */
  getDamageReduction(): number {
    return this.isActive('dead_man_walking', 3) ? 1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Crit Modification
  // ---------------------------------------------------------------------------

  /**
   * Get crit parameters based on trait breakpoints.
   * Returns the crit multiplier and whether crit chance halves or resets.
   */
  getCritConfig(): { multiplier: number; bonusFlatDamage: number; halveOnTrigger: boolean } {
    return { multiplier: 1.5, bonusFlatDamage: 0, halveOnTrigger: false };
  }

  // ---------------------------------------------------------------------------
  // Turn End
  // ---------------------------------------------------------------------------

  /**
   * Apply turn-end effects.
   * Returns bonus damage to deal to the targeted enemy.
   */
  onTurnEnd(_player: Player, _targetEnemy: Enemy | null): number {
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Sheriff(6) Block Reflect
  // ---------------------------------------------------------------------------

  /** Whether block should reflect 100% of absorbed damage. */
  blockReflectsDamage(): boolean {
    return this.isActive('sheriff', 6);
  }

  // ---------------------------------------------------------------------------
  // Sapper helpers
  // ---------------------------------------------------------------------------

  getMatchCountThisFight(): number {
    return this.matchCountThisFight;
  }

  /** Sapper(1): Enemy bomb timers +2 turns. */
  getBombCountdownBonus(): number {
    return this.isActive('sapper', 1) ? 2 : 0;
  }

  /** Sapper(5): Explosive tile radius increased by 1. */
  hasExpandedExplosiveRadius(): boolean {
    return this.isActive('sapper', 5);
  }

  // ---------------------------------------------------------------------------
  // Rattlesnake helpers
  // ---------------------------------------------------------------------------

  /** Rattlesnake(1): Immune to poison tile damage/debuffs. */
  isPoisonImmune(): boolean {
    return this.isActive('rattlesnake', 1);
  }

  /**
   * Rattlesnake(3): Matching poison tiles deals damage + venom.
   * Returns { damage, venomStacks } to apply per poison tile matched.
   */
  getPoisonMatchBonus(player: Player): { damage: number; venomStacks: number } | null {
    if (!this.isActive('rattlesnake', 3)) return null;
    const bulletDef = TILE_DEFINITIONS['bullet'];
    const bulletUpgrade = player.getUpgradeLevel('bullet');
    const bulletPerTile = bulletDef.baseValue + bulletUpgrade * bulletDef.upgradeValue;
    return {
      damage: Math.round(bulletPerTile * 2),
      venomStacks: 1,
    };
  }
}
