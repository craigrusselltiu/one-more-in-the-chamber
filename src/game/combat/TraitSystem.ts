import type { TraitId } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import type { ResourceOutput } from './ResourceResolver';
import type { Player } from './Player';
import type { Enemy } from './Enemy';

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
  private sheriffBlockUsedThisFight = false;
  /** Dead Man Walking(7): once/combat lethal protection. */
  deadManWalkingAvailable = false;
  /** Preacher(2): whether the player dealt damage this turn. */
  private damageDealtThisTurn = false;
  /** Reference to the player, needed for Undertaker(6) Ready grant. */
  private player: Player | null = null;

  constructor(traitCounts: Partial<Record<TraitId, number>>) {
    this.counts = { ...traitCounts };
  }

  /** Return the raw trait counts for snapshot serialization. */
  getCounts(): Partial<Record<TraitId, number>> {
    return { ...this.counts };
  }

  /** Restore internal state from a mid-combat snapshot. */
  restoreState(
    matchCount: number,
    swapsUsed: number,
    sheriffBlockUsed = false,
    damageDealtThisTurn = false,
    _undertakerBonusDamageReady = false,
  ): void {
    this.matchCountThisFight = matchCount;
    this.swapsUsedThisTurn = swapsUsed;
    this.sheriffBlockUsedThisFight = sheriffBlockUsed;
    this.damageDealtThisTurn = damageDealtThisTurn;
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
    this.sheriffBlockUsedThisFight = false;
    this.player = player;
    // Sheriff(4): gain 3 Sturdy at fight start
    if (this.isActive('sheriff', 4)) {
      player.sturdyStacks += 3;
    }

    // Outlaw(5): at start of Boss encounters, gain 5 Rageful + 3 Vulnerable to all enemies
    if (isBoss && this.isActive('outlaw', 5)) {
      player.ragefulStacks += 5;
      for (const enemy of enemies) {
        if (!enemy.state.isDead) enemy.addVulnerable(3);
      }
    }

    // Dead Man Walking(7): arm lethal protection
    if (this.isActive('dead_man_walking', 7)) {
      this.deadManWalkingAvailable = true;
    }

    // Preacher(6): gain 1 Grace at start of combat
    if (this.isActive('preacher', 6)) {
      player.graceStacks += 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Turn Start
  // ---------------------------------------------------------------------------

  /** Apply turn-start effects. */
  onTurnStart(_player: Player): void {
    this.swapsUsedThisTurn = 0;
    this.damageDealtThisTurn = false;
  }

  /** Get extra swaps per turn from traits. */
  getExtraSwapsPerTurn(): number {
    // Mustang(4): +1 swap/turn
    return this.isActive('mustang', 4) ? 1 : 0;
  }

  /** Desperado(5): grant Ace stacks at turn start. */
  getDesperadoAceGrant(): number {
    return this.isActive('desperado', 5) ? 4 : 0;
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
  // Damage tracking (Preacher)
  // ---------------------------------------------------------------------------

  /** Called when the player deals damage to an enemy. */
  onDamageDealt(): void {
    this.damageDealtThisTurn = true;
  }

  // ---------------------------------------------------------------------------
  // Match Modification
  // ---------------------------------------------------------------------------

  /**
   * Modify resource output based on trait effects.
   * Called after ResourceResolver computes the base output.
   */
  modifyMatchOutput(
    match: MatchResult,
    output: ResourceOutput,
    player: Player,
    _targetEnemy: Enemy | null,
  ): ResourceOutput {
    const modified = { ...output };

    this.matchCountThisFight++;

    // --- Sheriff ---

    // Sheriff(2): first block gain each turn is doubled
    if (modified.block > 0 && !this.sheriffBlockUsedThisFight && this.isActive('sheriff', 2)) {
      modified.block *= 2;
      this.sheriffBlockUsedThisFight = true;
    }

    // --- Prospector ---

    // Prospector(2): any match: 25% chance to generate 6 gold
    if (this.isActive('prospector', 2)) {
      if (Math.random() < 0.25) {
        modified.gold += 6;
      }
    }

    // Prospector(6): deal 3% of current gold as extra damage
    if (this.isActive('prospector', 6) && player.gold > 0) {
      modified.damage += Math.floor(player.gold * 0.03);
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

    // Sniper(3): on 5-match, gain 1 swap for that turn
    if (match.length >= 5 && this.isActive('sniper', 3)) {
      modified.bonusSwaps += 1;
    }

    // --- Dead Man Walking ---

    // Dead Man Walking(5): at or below 20% HP, all damage is doubled
    if (this.isActive('dead_man_walking', 5) && player.health <= player.maxHealth * 0.2) {
      modified.damage *= 2;
    }

    return modified;
  }

  // ---------------------------------------------------------------------------
  // Undertaker
  // ---------------------------------------------------------------------------

  /** Undertaker(2): +50% damage to summoned enemies. Returns multiplier bonus (0.5 or 0). */
  getUndertakerBonusDamage(targetIsSummoned: boolean): number {
    if (this.isActive('undertaker', 2) && targetIsSummoned) return 0.5;
    return 0;
  }

  /** Undertaker(4): on enemy kill, grant +1 max HP (and heal by 1). Returns true if triggered. */
  onEnemyKilledUndertaker(): boolean {
    if (this.isActive('undertaker', 4) && this.player) {
      this.player.maxHealth += 1;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Sniper(5): Execute
  // ---------------------------------------------------------------------------

  /** Sniper(5): 6+ match kills non-boss targeted enemy. */
  shouldSniperExecute(matchLength: number): boolean {
    return this.isActive('sniper', 5) && matchLength >= 6;
  }

  // ---------------------------------------------------------------------------
  // Enemy Kill Hook
  // ---------------------------------------------------------------------------

  /** Called when an enemy is killed. Returns rageful stacks to add. */
  onEnemyKilled(): number {
    // Outlaw(2): killing an enemy grants 3 Rageful
    if (this.isActive('outlaw', 2)) {
      return 3;
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

  /** Preacher(4): 20% damage reduction from enemies with lower HP than player. */
  getPreacherDamageReduction(enemyHp: number, playerHp: number): number {
    if (this.isActive('preacher', 4) && enemyHp < playerHp) return 0.20;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Turn End
  // ---------------------------------------------------------------------------

  /** Preacher(2): heal 5 if no damage dealt this turn. */
  getPreacherHealing(): number {
    if (this.isActive('preacher', 2) && !this.damageDealtThisTurn) return 5;
    return 0;
  }

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

  /** Sheriff(8): immune to Suppress hazard placement. */
  isSuppressImmune(): boolean {
    return this.isActive('sheriff', 8);
  }

  // ---------------------------------------------------------------------------
  // Tracker
  // ---------------------------------------------------------------------------

  /** Tracker(1): reveal all buried tiles at end of turn. */
  shouldRevealBuried(): boolean {
    return this.isActive('tracker', 1);
  }

  /** Tracker(3): gain 1 Rageful when buried tile is revealed. */
  buriedRevealGrantsRageful(): boolean {
    return this.isActive('tracker', 3);
  }

  // ---------------------------------------------------------------------------
  // Antivenom
  // ---------------------------------------------------------------------------

  /** Antivenom(2): matching adjacent to poison clears it. */
  clearsAdjacentPoison(): boolean {
    return this.isActive('antivenom', 2);
  }

  /** Antivenom(4): at the start of every turn, halve player's Poison stacks. */
  halvesPoisonOnTurnStart(): boolean {
    return this.isActive('antivenom', 4);
  }

  // ---------------------------------------------------------------------------
  // Rattlesnake
  // ---------------------------------------------------------------------------

  /** Rattlesnake(2): poison-applying tiles (waste, rattler) gain +1 level. */
  getPoisonTileLevelBonus(): number {
    return this.isActive('rattlesnake', 2) ? 1 : 0;
  }

  /** Rattlesnake(4): venom applies to ALL enemies instead of just the target. */
  poisonAppliesToAll(): boolean {
    return this.isActive('rattlesnake', 4);
  }

  // ---------------------------------------------------------------------------
  // Sapper helpers
  // ---------------------------------------------------------------------------

  getMatchCountThisFight(): number {
    return this.matchCountThisFight;
  }

  getDamageDealtThisTurn(): boolean {
    return this.damageDealtThisTurn;
  }

  /** @deprecated Undertaker(6) now grants Ready stacks; kept for snapshot compat. */
  getUndertakerBonusDamageReady(): boolean {
    return false;
  }

  /** Sapper(2): Enemy bomb timers +2 turns. */
  getBombCountdownBonus(): number {
    return this.isActive('sapper', 2) ? 2 : 0;
  }

  /** Sapper(4): Explosive tile radius increased by 1. */
  hasExpandedExplosiveRadius(): boolean {
    return this.isActive('sapper', 4);
  }

  // ---------------------------------------------------------------------------
  // Crit
  // ---------------------------------------------------------------------------

  getCritConfig(): { multiplier: number; bonusFlatDamage: number; halveOnTrigger: boolean } {
    const multiplier = this.isActive('gunslinger', 6) ? 2.0 : 1.5;
    return { multiplier, bonusFlatDamage: 0, halveOnTrigger: false };
  }
}
