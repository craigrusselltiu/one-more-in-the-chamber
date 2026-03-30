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

  /** Tracks total matches this fight for Sapper(3) "every 4th match spawns bomb". */
  private matchCountThisFight = 0;
  /** Tracks swaps used this turn for Sharpshooter's Eye (via Gunslinger). */
  private swapsUsedThisTurn = 0;

  constructor(traitCounts: Partial<Record<TraitId, number>>) {
    this.counts = { ...traitCounts };
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
  onFightStart(player: Player): void {
    this.matchCountThisFight = 0;

    // Gunslinger(2): Start each fight with 15% crit chance
    if (this.isActive('gunslinger', 2)) {
      player.critChance += 15;
    }
  }

  // ---------------------------------------------------------------------------
  // Turn Start
  // ---------------------------------------------------------------------------

  /** Apply turn-start effects. Returns bonus block to add. */
  onTurnStart(player: Player): void {
    this.swapsUsedThisTurn = 0;

    // Sheriff(2): +2 block at turn start
    if (this.isActive('sheriff', 2)) {
      player.addBlock(2);
    }
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
    _player: Player,
    targetEnemy: Enemy | null,
    isLassoSwap = false,
  ): ResourceOutput {
    const modified = { ...output };
    const is4Plus = match.length >= 4;

    this.matchCountThisFight++;

    // --- Outlaw ---

    // Outlaw(2): 4+ matches deal 30% bonus damage
    if (is4Plus && this.isActive('outlaw', 2)) {
      modified.damage = Math.round(modified.damage * 1.3);
    }

    // Outlaw(4): 4+ matches apply 1 Vulnerable to targeted enemy
    if (is4Plus && this.isActive('outlaw', 4) && targetEnemy) {
      targetEnemy.addVulnerable(1);
    }

    // Outlaw(6): tiles from 4+ match cascades trigger resource effects twice
    // This is handled by CombatManager doubling the output for cascade matches
    // from 4+ origins (we flag it here)

    // --- Sheriff ---

    // Sheriff(2): Iron matches +30% block
    if (match.tileType === 'iron' && this.isActive('sheriff', 2)) {
      modified.block = Math.round(modified.block * 1.3);
    }

    // --- Prospector ---

    // Prospector(2): Non-gold matches: 15% chance to generate 1 gold
    if (match.tileType !== 'gold' && this.isActive('prospector', 2)) {
      if (Math.random() < 0.15) {
        modified.gold += 1;
      }
    }

    // Prospector(4): Gold matches: double gold + 2 block
    if (match.tileType === 'gold' && this.isActive('prospector', 4)) {
      modified.gold *= 2;
      modified.block += 2;
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

    return modified;
  }

  // ---------------------------------------------------------------------------
  // Crit Modification
  // ---------------------------------------------------------------------------

  /**
   * Get crit parameters based on trait breakpoints.
   * Returns the crit multiplier and whether crit chance halves or resets.
   */
  getCritConfig(): { multiplier: number; bonusFlatDamage: number; halveOnTrigger: boolean } {
    let multiplier = 2.0;
    let bonusFlatDamage = 0;
    let halveOnTrigger = false;

    // Gunslinger(2): Crits deal 3 bonus flat damage
    if (this.isActive('gunslinger', 2)) {
      bonusFlatDamage = 3;
    }

    // Gunslinger(4): Crit multiplier 3x, halve instead of reset
    if (this.isActive('gunslinger', 4)) {
      multiplier = 3.0;
      halveOnTrigger = true;
    }

    return { multiplier, bonusFlatDamage, halveOnTrigger };
  }

  // ---------------------------------------------------------------------------
  // Turn End
  // ---------------------------------------------------------------------------

  /**
   * Apply turn-end effects.
   * Returns bonus damage to deal to the targeted enemy.
   */
  onTurnEnd(player: Player, targetEnemy: Enemy | null): number {
    let bonusDamage = 0;

    // Prospector(6): deal bonus damage equal to 50% of gold earned this fight
    if (this.isActive('prospector', 6) && targetEnemy) {
      bonusDamage = Math.floor(player.goldThisFight * 0.5);
      if (bonusDamage > 0) {
        const hpBefore = targetEnemy.state.health;
        targetEnemy.takeDamage(bonusDamage);
        // If this kill triggers, double gold earned this fight
        if (targetEnemy.state.isDead && hpBefore > 0) {
          const doubleGold = player.goldThisFight;
          player.addGold(doubleGold);
        }
      }
    }

    return bonusDamage;
  }

  // ---------------------------------------------------------------------------
  // Sheriff(5) Block Reflect
  // ---------------------------------------------------------------------------

  /**
   * Whether block should reflect 100% of absorbed damage.
   * Sheriff(5): Block reflects 100% of absorbed damage back to attacker.
   */
  blockReflectsDamage(): boolean {
    return this.isActive('sheriff', 5);
  }

  // ---------------------------------------------------------------------------
  // Outlaw(6) double-trigger check
  // ---------------------------------------------------------------------------

  /** Whether cascade tiles from 4+ matches should trigger resource effects twice. */
  doubleTriggerCascades(): boolean {
    return this.isActive('outlaw', 6);
  }

  // ---------------------------------------------------------------------------
  // Sapper match counter
  // ---------------------------------------------------------------------------

  getMatchCountThisFight(): number {
    return this.matchCountThisFight;
  }

  /** Sapper(3): check if this match should spawn a player-side bomb (every 4th match). */
  shouldSpawnPlayerBomb(): boolean {
    return this.isActive('sapper', 3) && this.matchCountThisFight % 4 === 0;
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
      damage: Math.round(bulletPerTile * 2), // 2x Bullet per-tile value per poison tile
      venomStacks: 1, // per poison tile matched
    };
  }

  // ---------------------------------------------------------------------------
  // Sapper bomb helpers
  // ---------------------------------------------------------------------------

  /** Sapper(1): Bomb countdowns +2 turns. */
  getBombCountdownBonus(): number {
    return this.isActive('sapper', 1) ? 2 : 0;
  }

  /** Sapper(2): Defusing a bomb deals its damage to targeted enemy. */
  defuseDealsDamage(): boolean {
    return this.isActive('sapper', 2);
  }

  /** Sapper(3): Defused bombs clear adjacent tiles. */
  defuseClearsAdjacent(): boolean {
    return this.isActive('sapper', 3);
  }
}
