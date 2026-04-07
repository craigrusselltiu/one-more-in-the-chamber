import type { ArtifactInstance } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import type { ResourceOutput } from './ResourceResolver';
import type { Player } from './Player';
import type { Enemy } from './Enemy';

/**
 * ArtifactSystem: applies individual artifact effects at combat hook points.
 *
 * Each artifact's runtime behavior is implemented here.
 * Artifacts are found at elite combat, merchants, treasure nodes, and events.
 * They cannot be discarded or sold.
 */
export class ArtifactSystem {
  private artifactIds: Set<string>;
  private artifactInstances: ArtifactInstance[];

  /** Horseshoe Charm: first match of each fight gets 2x resources. */
  private firstMatchThisFight = true;
  /** Quickdraw Holster: tracks whether this is the first swap of the turn. */
  private isFirstSwapOfTurn = true;
  /** Sharpshooter's Eye: bonus crit from swaps this turn. */
  private swapCritBonus = 0;
  /** Worn Lasso: once/fight non-adjacent swap used. */
  private lassoUsedThisFight = false;
  /** Motherlode Map: once/fight 4+ gold match converts adjacent tiles. */
  private motherlodeUsedThisFight = false;
  /** Double Down: HP lost on chip miss, increases by 1 per miss. Persists across fights. */
  doubleDownMissPenalty = 1;

  constructor(artifacts: ArtifactInstance[]) {
    this.artifactIds = new Set(artifacts.map((a) => a.id));
    this.artifactInstances = artifacts;
  }

  has(artifactId: string): boolean {
    return this.artifactIds.has(artifactId);
  }

  /** Return the full artifact instance list. */
  getArtifacts(): ArtifactInstance[] {
    return this.artifactInstances;
  }

  /** Whether the first-match bonus is still available this fight. */
  isFirstMatchAvailable(): boolean {
    return this.firstMatchThisFight;
  }

  /** Whether the lasso has been used this fight (raw state, ignores artifact ownership). */
  isLassoUsedThisFight(): boolean {
    return this.lassoUsedThisFight;
  }

  /** Restore internal state from a mid-combat snapshot. */
  restoreState(firstMatch: boolean, lassoUsed: boolean, motherlodeUsed = false): void {
    this.firstMatchThisFight = firstMatch;
    this.lassoUsedThisFight = lassoUsed;
    this.motherlodeUsedThisFight = motherlodeUsed;
  }

  /** Whether the motherlode map has been triggered this fight. */
  isMotherlodeUsedThisFight(): boolean {
    return this.motherlodeUsedThisFight;
  }

  /**
   * Motherlode Map: once/fight, a 4+ gold match converts adjacent non-gold tiles to gold.
   * Returns the positions that were converted (for the board to update visuals).
   */
  tryMotherlodeConvert(match: MatchResult, board: { getGrid: () => (unknown | null)[][]; getBoardSize: () => number }): boolean {
    if (!this.has('motherlode_map')) return false;
    if (this.motherlodeUsedThisFight) return false;
    if (match.tileType !== 'gold' || match.length < 4) return false;

    this.motherlodeUsedThisFight = true;

    const grid = board.getGrid() as ({ type: string; setType: (t: string) => void } | null)[][];
    const size = board.getBoardSize();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const pos of match.tiles) {
      for (const [dr, dc] of directions) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const tile = grid[r]?.[c];
        if (tile && tile.type !== 'gold') {
          tile.setType('gold');
        }
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Fight Start
  // ---------------------------------------------------------------------------

  onFightStart(player: Player): void {
    this.firstMatchThisFight = true;
    this.lassoUsedThisFight = false;
    this.motherlodeUsedThisFight = false;
    this.swapCritBonus = 0;

    // Horseshoe Charm: +5 max HP (applied once when acquired, but we
    // ensure it's reflected at fight start)
    if (this.has('horseshoe_charm')) {
      if (player.maxHealth === 100) {
        // Only bump once -- check if already bumped
        player.maxHealth += 5;
        player.health = Math.min(player.health + 5, player.maxHealth);
      }
    }

    // Lucky Bullet: +10 Lucky stacks at fight start
    if (this.has('lucky_bullet')) {
      player.addLuckyStacks(10);
    }

    // Rust's Cylinder: Deadeye 3 shots -> 6
    if (this.has('rusts_cylinder')) {
      player.deadeyeShots = 6;
    }
  }

  /** Get number of Deadeye shots (3 default, 6 with Rust's Cylinder). */
  getDeadeyeShots(): number {
    return this.has('rusts_cylinder') ? 6 : 3;
  }

  // ---------------------------------------------------------------------------
  // Turn Start
  // ---------------------------------------------------------------------------

  onTurnStart(player: Player): void {
    this.isFirstSwapOfTurn = true;
    this.swapCritBonus = 0;

    // Stolen Badge: +2 block/turn
    if (this.has('stolen_badge')) {
      player.addBlock(2);
    }
  }

  // ---------------------------------------------------------------------------
  // Swap Hook
  // ---------------------------------------------------------------------------

  /** Called after each swap. Returns whether swaps should be refunded (Quickdraw kill). */
  onSwapPerformed(enemyKilledThisSwap: boolean): { refundSwaps: boolean } {
    const isFirst = this.isFirstSwapOfTurn;
    this.isFirstSwapOfTurn = false;

    // Sharpshooter's Eye: +5% crit per swap used this turn
    if (this.has('sharpshooters_eye')) {
      this.swapCritBonus += 5;
    }

    // Quickdraw Holster: first swap/turn, kill = refund swaps
    if (this.has('quickdraw_holster') && isFirst && enemyKilledThisSwap) {
      return { refundSwaps: true };
    }

    return { refundSwaps: false };
  }

  getSwapCritBonus(): number {
    return this.swapCritBonus;
  }

  // ---------------------------------------------------------------------------
  // Match Modification
  // ---------------------------------------------------------------------------

  /**
   * Modify resource output based on artifact effects.
   * Called after trait modifications.
   */
  modifyMatchOutput(
    match: MatchResult,
    output: ResourceOutput,
    _player: Player,
    targetEnemy: Enemy | null,
    _enemies: Enemy[],
  ): ResourceOutput {
    const modified = { ...output };

    // Horseshoe Charm: first match/fight gets 2x resources
    if (this.has('horseshoe_charm') && this.firstMatchThisFight) {
      this.firstMatchThisFight = false;
      modified.damage *= 2;
      modified.block *= 2;
      modified.gold *= 2;
      modified.healing *= 2;
    }

    // Gold Tooth: Bullet matches 15% chance for 1 gold
    if (this.has('gold_tooth') && match.tileType === 'bullet') {
      if (Math.random() < 0.15) {
        modified.gold += 1;
      }
    }

    // Bandit's Bandana: 4+ matches 25% chance for 1 gold
    if (this.has('bandits_bandana') && match.length >= 4) {
      if (Math.random() < 0.25) {
        modified.gold += 1;
      }
    }

    // Rusty Deputy Badge: +3 block per iron match
    if (this.has('rusty_deputy_badge') && match.tileType === 'iron') {
      modified.block += 3;
    }

    // Twin Revolvers: Bullets hit 2x at 60% each (net 120%)
    if (this.has('twin_revolvers') && match.tileType === 'bullet') {
      // Instead of 100% once, we do 60% + 60% = 120% average
      modified.damage = Math.round(modified.damage * 1.2);
    }

    // Bounty Board: +15% damage vs enemies with board abilities
    if (this.has('bounty_board') && targetEnemy) {
      const def = targetEnemy.getDefinition();
      const hasBoardAbility = def.abilities.some((a) =>
        ['poison', 'lock', 'bury', 'bomb'].includes(a),
      );
      if (hasBoardAbility) {
        modified.damage = Math.round(modified.damage * 1.15);
      }
    }

    // Iron Horse Shoes: Iron matches 20% for 1 ability charge
    if (this.has('iron_horse_shoes') && match.tileType === 'iron') {
      if (Math.random() < 0.2) {
        modified.abilityCharges += 1;
      }
    }

    // Envenomed Ammo: Bullet matches apply 1 venom stack to target
    if (this.has('envenomed_ammo') && match.tileType === 'bullet') {
      modified.venomStacks += 1;
    }

    // Reno's Coin: chip damage doubled on hit, self-damage on miss
    if (this.has('renos_coin') && match.tileType === 'chip') {
      if (modified.chipHit) {
        modified.damage *= 2;
      } else {
        modified.doubleDownPenalty = this.doubleDownMissPenalty;
        this.doubleDownMissPenalty++;
      }
    }

    return modified;
  }

  // ---------------------------------------------------------------------------
  // Crit Hook
  // ---------------------------------------------------------------------------

  /**
   * Apply artifact effects when a crit triggers.
   * Called after the crit multiplier is applied to the match.
   */
  onCritTriggered(
    player: Player,
    targetEnemy: Enemy | null,
  ): void {
    // Dead Man's Hand: crits apply 1 Vulnerable
    if (this.has('dead_mans_hand') && targetEnemy) {
      targetEnemy.addVulnerable(1);
    }

    // Rigged Deck: crits give 5 gold
    if (this.has('stacked_deck')) {
      player.addGold(5);
    }
  }

  // ---------------------------------------------------------------------------
  // Turn End
  // ---------------------------------------------------------------------------

  onTurnEnd(swapsRemaining?: number, player?: Player): void {
    // Sharpshooter's Eye crit bonus resets at turn end
    this.swapCritBonus = 0;

    // Patrol Route: unused swaps at turn end give +3 block each
    if (this.has('patrol_route') && player && swapsRemaining && swapsRemaining > 0) {
      player.addBlock(swapsRemaining * 3);
    }
  }

  // ---------------------------------------------------------------------------
  // Enemy Summoned
  // ---------------------------------------------------------------------------

  /** Called when a new enemy is summoned into combat. */
  onEnemySummoned(enemy: Enemy): void {
    // Coyote Pelt: summoned enemies take 5 damage immediately
    if (this.has('coyote_pelt')) {
      enemy.takeDamage(5);
    }
  }

  // ---------------------------------------------------------------------------
  // Non-Adjacent Swap (Worn Lasso)
  // ---------------------------------------------------------------------------

  /** Whether the Worn Lasso non-adjacent swap is available this fight. */
  hasLassoAvailable(): boolean {
    return this.has('worn_lasso') && !this.lassoUsedThisFight;
  }

  useLasso(): void {
    this.lassoUsedThisFight = true;
  }

  // ---------------------------------------------------------------------------
  // Merchant Price Modifier
  // ---------------------------------------------------------------------------

  /** Get merchant price multiplier from artifacts. */
  getMerchantPriceMultiplier(): number {
    let multiplier = 1.0;
    // Stolen Badge: merchants +10%
    if (this.has('stolen_badge')) {
      multiplier += 0.1;
    }
    return multiplier;
  }

  // ---------------------------------------------------------------------------
  // Silver Bullet (boss crit bonus)
  // ---------------------------------------------------------------------------

  /** Get extra crit chance vs bosses. */
  getBossCritBonus(): number {
    return this.has('silver_bullet') ? 20 : 0;
  }

  // ---------------------------------------------------------------------------
  // Max consumable slots
  // ---------------------------------------------------------------------------

  getMaxConsumableSlots(): number {
    return this.has('saddlebag') ? 4 : 3;
  }
}
