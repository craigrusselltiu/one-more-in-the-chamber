import type { ArtifactInstance } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import type { ResourceOutput } from './ResourceResolver';
import type { Player } from './Player';
import type { Enemy } from './Enemy';
import { getArtifactGoldGainMultiplier } from '../../utils/goldGain';

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

  /** Gillie Suit: first 5+ match each combat grants 1 Grace. */
  private gillieSuitUsedThisFight = false;
  /** Death's Pocket Watch: once/combat, below 20% HP -> 20 block. */
  deathsPocketWatchAvailable = false;
  /** Sheriff's Domino: whether all enemy damage was blocked this turn. */
  private allDamageBlockedThisTurn = true;
  /** Sheriff's Domino: whether any enemy actually attacked this turn. */
  private enemyAttackedThisTurn = false;
  /** Sheriff's Domino: bonus block to grant next turn start. */
  private dominoBonusBlock = 0;
  /** Rusty Deputy Badge: turn number tracker. */
  private turnNumber = 0;
  /** Snakeskin Boots: whether the first poison this turn has been auto-cleansed. */
  private snakeskinUsedThisTurn = false;
  /** Reno's Coin: HP lost on chip miss. */
  doubleDownMissPenalty = 1;
  /** Last Breath Tonic: once/combat, below 20% -> random consumable. */
  private lastBreathTonicAvailable = false;
  /** Heliograph Shard: once/combat, on 5-match, apply Blinded. */
  private heliographShardAvailable = false;
  /** Lethargic: first swap of the combat does nothing. Consumed on the first swap attempt. */
  lethargicPending = false;

  constructor(artifacts: ArtifactInstance[]) {
    // Used artifacts (e.g. Shed Skin after triggering, Gold Tooth after pickup) stay in
    // the player's inventory for display purposes but no longer apply their effects.
    this.artifactIds = new Set(artifacts.filter((a) => !a.used).map((a) => a.id));
    this.artifactInstances = artifacts;
  }

  has(artifactId: string): boolean {
    return this.artifactIds.has(artifactId);
  }

  /** Return the full artifact instance list. */
  getArtifacts(): ArtifactInstance[] {
    return this.artifactInstances;
  }

  /** Remove an artifact (e.g. Shed Skin self-destruct). */
  removeArtifact(id: string): void {
    this.artifactIds.delete(id);
    this.artifactInstances = this.artifactInstances.filter(a => a.id !== id);
  }

  /** Restore internal state from a mid-combat snapshot. */
  restoreState(gillieSuitUsed = false, turnNumber = 0): void {
    this.gillieSuitUsedThisFight = gillieSuitUsed;
    this.turnNumber = turnNumber;
  }

  // ---------------------------------------------------------------------------
  // Fight Start
  // ---------------------------------------------------------------------------

  onFightStart(player: Player, enemies?: Enemy[]): void {
    this.gillieSuitUsedThisFight = false;
    this.dominoBonusBlock = 0;
    this.turnNumber = 0;
    this.snakeskinUsedThisTurn = false;

    // Outlaw's Spurs: gain 1 Ready at combat start
    if (this.has('outlaws_spurs')) {
      player.addReady(1);
    }

    // Stolen Badge: gain 20 block at combat start
    if (this.has('stolen_badge')) {
      player.addBlock(20);
    }

    // Reinforced Duster: start each fight with 3 Sturdy
    if (this.has('reinforced_duster')) {
      player.sturdyStacks += 3;
    }

    // Lucky Bullet: gain 1 Lucky at combat start
    if (this.has('lucky_bullet')) {
      player.addLuckyStacks(1);
    }

    // Rust's Cylinder: Deadeye 3 shots -> 6
    if (this.has('rusts_cylinder')) {
      player.deadeyeShots = 6;
    }

    // Shed Skin: once/fight survive lethal damage, heal 50% HP, destroy artifact
    if (this.has('shed_skin')) {
      player.shedSkinAvailable = true;
    }

    // Death's Pocket Watch: once/combat, below 20% -> 20 block
    if (this.has('deaths_pocket_watch')) {
      this.deathsPocketWatchAvailable = true;
    }

    // Sidewinder Belt: handled by CombatManager (after enemy startOfFight)

    // Last Breath Tonic: once/combat, below 20% -> random consumable
    if (this.has('last_breath_tonic')) {
      this.lastBreathTonicAvailable = true;
    }

    // Heliograph Shard: once/combat, on 5-match, apply Blinded
    if (this.has('heliograph_shard')) {
      this.heliographShardAvailable = true;
    }

    // High Vis Jacket: grants 1 Protected stack at fight start (immune to tile
    // hazards for 1 turn). Protected covers both enemy startOfFight hazard
    // placement and turn-1 enemy hazard moves.
    if (this.has('high_vis_jacket')) {
      player.protectedStacks += 1;
    }

    // Death's Glare: grant 3 Dead Man Walking to player, then apply 3 Vulnerable + 3 Terrified to ALL enemies
    if (this.has('deaths_glare') && enemies) {
      player.deadManWalkingStacks += 3;
      for (const enemy of enemies) {
        if (!enemy.state.isDead) {
          enemy.addVulnerable(3);
          enemy.addTerrified(3);
        }
      }
    }

    // Lethargic: arm the first-swap-does-nothing flag for this combat.
    this.lethargicPending = this.has('lethargic');

    // Dry Atmosphere: reduce all healing by 20% for this combat.
    player.healMultiplier = this.has('dry_atmosphere') ? 0.8 : 1.0;
  }

  /** Get number of Deadeye shots (3 default, 6 with Rust's Cylinder). */
  getDeadeyeShots(): number {
    return this.has('rusts_cylinder') ? 6 : 3;
  }

  // ---------------------------------------------------------------------------
  // Turn Start
  // ---------------------------------------------------------------------------

  onTurnStart(player: Player): void {
    this.turnNumber++;
    this.allDamageBlockedThisTurn = true;
    this.enemyAttackedThisTurn = false;
    this.snakeskinUsedThisTurn = false;

    // Sheriff's Domino: grant bonus block from previous turn
    if (this.dominoBonusBlock > 0) {
      player.addBlock(this.dominoBonusBlock);
      this.dominoBonusBlock = 0;
    }

    // Rusty Deputy Badge: gain 13 block at start of turn 2
    if (this.has('rusty_deputy_badge') && this.turnNumber === 2) {
      player.addBlock(13);
    }

    // Dead Man's Bones: at or below 20% HP, gain 4 Ace
    if (this.has('dead_mans_bones') && player.health <= player.maxHealth * 0.2) {
      player.addAceStacks(4);
    }

  }

  // ---------------------------------------------------------------------------
  // Swap Hook
  // ---------------------------------------------------------------------------

  /** Called after each swap. */
  onSwapPerformed(_enemyKilledThisSwap: boolean): { refundSwaps: boolean } {
    return { refundSwaps: false };
  }

  getSwapCritBonus(): number {
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Match Modification
  // ---------------------------------------------------------------------------

  modifyMatchOutput(
    match: MatchResult,
    output: ResourceOutput,
    player: Player,
    _targetEnemy: Enemy | null,
    _enemies: Enemy[],
  ): ResourceOutput {
    const modified = { ...output };

    const isGunTile = match.tileType === 'bullet' || match.tileType === 'fifty_cal'
      || match.tileType === 'buckshot' || match.tileType === 'ricochet';

    // Twin Revolvers: bullets deal 50% more damage, 10% chance to miss
    const twinRevolversActive = this.has('twin_revolvers') && isGunTile;
    const twinRevolversMissed = twinRevolversActive && Math.random() < 0.1;
    if (twinRevolversActive) {
      if (twinRevolversMissed) {
        modified.damage = 0;
      } else {
        modified.damage = Math.round(modified.damage * 1.5);
      }
    }

    // Envenomed Ammo: Bullet-type tile matches apply 1 venom stack to target
    // (A missed shot should not apply poison.)
    if (this.has('envenomed_ammo') && isGunTile && !twinRevolversMissed) {
      modified.poisonStacks += 1;
    }

    // Reno's Coin: damage doubled, 1 HP on miss (hit chance handled by bucket)
    if (this.has('renos_coin') && match.tileType === 'chip') {
      if (modified.chipHit) {
        modified.damage *= 2;
      } else {
        modified.doubleDownPenalty = 1;
      }
    }

    // Gillie Suit: first 5+ in-a-line match each combat grants 1 Grace
    // (crosses/L/T shapes with 5+ total tiles don't count)
    if (this.has('gillie_suit') && match.length >= 5 && !match.isCross && !this.gillieSuitUsedThisFight) {
      this.gillieSuitUsedThisFight = true;
      player.graceStacks += 1;
    }

    return modified;
  }

  // ---------------------------------------------------------------------------
  // Crit Hook
  // ---------------------------------------------------------------------------

  onCritTriggered(
    _player: Player,
    targetEnemy: Enemy | null,
  ): void {
    // Dead Man's Hand: Lucky triggers apply 1 Vulnerable
    if (this.has('dead_mans_hand') && targetEnemy) {
      targetEnemy.addVulnerable(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Turn End
  // ---------------------------------------------------------------------------

  onTurnEnd(_swapsRemaining?: number, player?: Player): void {
    // Iron Will: at or below 20% HP, gain 4 block
    // Must run BEFORE the enemy turn so the block absorbs incoming damage.
    if (this.has('iron_will') && player && player.health <= player.maxHealth * 0.2) {
      player.addBlock(4);
    }
  }

  /**
   * Called after the enemy turn resolves (and before the player's block resets),
   * so that damage-tracking artifacts can inspect what happened.
   */
  onAfterEnemyTurn(): void {
    // Sheriff's Domino: if every point of enemy damage was blocked this turn
    // (and at least one enemy actually attacked), queue 7 block for next turn.
    if (this.has('sheriffs_domino') && this.enemyAttackedThisTurn && this.allDamageBlockedThisTurn) {
      this.dominoBonusBlock = 7;
    }
  }

  // ---------------------------------------------------------------------------
  // Enemy Summoned
  // ---------------------------------------------------------------------------

  onEnemySummoned(_enemy: Enemy, player?: Player): void {
    // Bounty Board: gain 1 Rageful when enemy summoned
    if (this.has('bounty_board') && player) {
      player.ragefulStacks += 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Player Takes Damage (from enemy attack)
  // ---------------------------------------------------------------------------

  /**
   * Called when an enemy attacks the player.
   * Returns venom stacks to apply to the attacker (Cactus Spine Vest).
   */
  onPlayerDamaged(hpLost: number, player: Player): { poisonToAttacker: number; grantConsumable: boolean } {
    // Sheriff's Domino tracking
    this.enemyAttackedThisTurn = true;
    if (hpLost > 0) {
      this.allDamageBlockedThisTurn = false;
    }

    // Death's Pocket Watch: once/combat, when HP drops below 20%, gain 20 block
    if (this.deathsPocketWatchAvailable && player.health > 0 && player.health <= player.maxHealth * 0.2) {
      this.deathsPocketWatchAvailable = false;
      player.addBlock(20);
      player.skipNextBlockReset = true;
    }

    // Last Breath Tonic: once/combat, below 20% -> random consumable
    let grantConsumable = false;
    if (this.lastBreathTonicAvailable && player.health > 0 && player.health <= player.maxHealth * 0.2) {
      this.lastBreathTonicAvailable = false;
      grantConsumable = true;
    }

    // Cactus Spine Vest: when enemy damages HP, apply 3 Venom to attacker
    let poisonToAttacker = 0;
    if (this.has('cactus_spine_vest') && hpLost > 0) {
      poisonToAttacker = 3;
    }

    return { poisonToAttacker, grantConsumable };
  }

  // ---------------------------------------------------------------------------
  // Consumable Hook
  // ---------------------------------------------------------------------------

  /**
   * Called when a consumable is used.
   * Returns { bonusDamage, bonusBlock } to apply.
   */
  onConsumableUsed(): { bonusDamage: number; bonusBlock: number; triggerTwice: boolean } {
    let bonusDamage = 0;
    let bonusBlock = 0;

    // Barkeep's Shotgun: deals 5 damage to a random enemy
    if (this.has('barkeeps_shotgun')) bonusDamage += 5;

    // Top-Shelf Reserve: grants 6 block
    if (this.has('top_shelf_reserve')) bonusBlock += 6;

    // Last Call Bell: consumables trigger twice (caller handles the double-trigger)
    const triggerTwice = this.has('last_call_bell');

    return { bonusDamage, bonusBlock, triggerTwice };
  }

  // ---------------------------------------------------------------------------
  // Lock Freed Hook
  // ---------------------------------------------------------------------------

  /** Jail Cell Keys: gain 4 block when freeing a locked tile. Returns block to add. */
  onLockFreed(): number {
    return this.has('jail_cell_keys') ? 4 : 0;
  }

  // ---------------------------------------------------------------------------
  // Heal Hook
  // ---------------------------------------------------------------------------

  /** Offering Plate: healing grants gold. Absolution Rounds: returns damage to deal. */
  onPlayerHealed(hpHealed: number, player: Player): { absolutionDamage: number } {
    if (this.has('offering_plate') && hpHealed > 0) {
      player.addGold(hpHealed);
    }

    const absolutionDamage = this.has('absolution_rounds') ? hpHealed : 0;
    return { absolutionDamage };
  }

  // ---------------------------------------------------------------------------
  // Buried/Sand Reveal Hook
  // ---------------------------------------------------------------------------

  /**
   * Called when buried (sand) tiles are revealed.
   * Trapper's Snare: apply 1 Vulnerable to random enemy.
   * Gravedigger's Shovel: deal 3 damage to random enemy.
   * Returns { vulnerableCount, damagePerReveal }.
   */
  onBuriedRevealed(): { vulnerableCount: number; damagePerReveal: number; goldPerReveal: number } {
    let vulnerableCount = 0;
    let damagePerReveal = 0;
    let goldPerReveal = 0;

    if (this.has('trappers_snare')) vulnerableCount = 1;
    if (this.has('gravediggers_shovel')) damagePerReveal = 3;
    if (this.has('golden_shovel')) goldPerReveal = 7;

    return { vulnerableCount, damagePerReveal, goldPerReveal };
  }

  // ---------------------------------------------------------------------------
  // Enemy Kill Hook
  // ---------------------------------------------------------------------------

  /**
   * Called when an enemy dies. Returns { healAmount, killGrantsSwap }.
   * Kill Confirmed: gain 1 swap if killed by .50 Cal or 5+ match.
   * Corpse Explosion: handled by caller (needs summoned check + maxHP).
   */
  onEnemyKilled(match: MatchResult | null, wasSummoned?: boolean): { killGrantsSwap: boolean; spawnExplosive: boolean; healAmount: number } {
    // Kill Confirmed: kill with .50 Cal or 5+ match -> gain 1 swap
    let killGrantsSwap = false;
    if (this.has('kill_confirmed') && match) {
      if (match.tileType === 'fifty_cal' || match.length >= 5) {
        killGrantsSwap = true;
      }
    }

    // Detonator: make 1 random tile explosive on enemy death
    const spawnExplosive = this.has('detonator');

    // Burial Rites: heal 5 HP when summoned enemy dies
    const healAmount = (this.has('burial_rites') && wasSummoned) ? 5 : 0;

    return { killGrantsSwap, spawnExplosive, healAmount };
  }

  /** Corpse Explosion: when a summoned enemy dies, deal its maxHP to all enemies. */
  hasCorpseExplosion(): boolean {
    return this.has('corpse_explosion');
  }

  // ---------------------------------------------------------------------------
  // Poison Placement Hook
  // ---------------------------------------------------------------------------

  /** Snakeskin Boots: first poison tile per turn is auto-cleansed. Returns true if cleansed. */
  shouldCleansePoisonPlacement(): boolean {
    if (this.has('snakeskin_boots') && !this.snakeskinUsedThisTurn) {
      this.snakeskinUsedThisTurn = true;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Venomous (self-venom) Modifier
  // ---------------------------------------------------------------------------

  /** Bone Charm: venom damage you take is halved. */
  getPoisonDamageMultiplier(): number {
    return this.has('bone_charm') ? 0.5 : 1.0;
  }

  // ---------------------------------------------------------------------------
  // Venom Application Modifier
  // ---------------------------------------------------------------------------

  /** Rattlesnake Fang Necklace: +1 venom on every application. */
  getExtraPoisonStacks(): number {
    return this.has('rattlesnake_fang_necklace') ? 1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Bomb Defuse Hook
  // ---------------------------------------------------------------------------

  /** Blasting Pan: defusing bombs grants 8 gold. */
  onBombDefused(player: Player): void {
    if (this.has('blasting_pan')) {
      player.addGold(8);
    }
  }

  // ---------------------------------------------------------------------------
  // Merchant Price Modifier
  // ---------------------------------------------------------------------------

  getMerchantPriceMultiplier(): number {
    let multiplier = 1.0;
    if (this.has('stolen_badge')) multiplier += 0.1;
    return multiplier;
  }

  // ---------------------------------------------------------------------------
  // Silver Bullet (boss block -> Ready)
  // ---------------------------------------------------------------------------

  onBossGainedBlock(player: Player): void {
    if (this.has('silver_bullet')) {
      player.addReady(1);
    }
  }

  getBossCritBonus(): number {
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Max consumable slots
  // ---------------------------------------------------------------------------

  getMaxConsumableSlots(): number {
    return this.has('saddlebag') ? 5 : 3;
  }

  // ---------------------------------------------------------------------------
  // Swap bonus (Dan's Feather)
  // ---------------------------------------------------------------------------

  getExtraSwapsPerTurn(): number {
    return this.has('dans_feather') ? 1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Tinker's Wrench: explosive from 3-matches
  // ---------------------------------------------------------------------------

  shouldThreeMatchSpawnExplosive(): boolean {
    return this.has('tinkers_wrench');
  }

  // ---------------------------------------------------------------------------
  // Loaded Dice: cascade matches trigger 1 level higher
  // ---------------------------------------------------------------------------

  getCascadeUpgradeBonus(): number {
    return this.has('loaded_dice') ? 1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Temperance Flask: healing consumables restore 50% more
  // ---------------------------------------------------------------------------

  getConsumableHealMultiplier(): number {
    return this.has('temperance_flask') ? 1.5 : 1.0;
  }

  // ---------------------------------------------------------------------------
  // Scope Lens: 5+ matches generate double resources
  // ---------------------------------------------------------------------------

  shouldDoubleMatchResources(matchLength: number): boolean {
    return this.has('scope_lens') && matchLength >= 5;
  }

  // ---------------------------------------------------------------------------
  // Sniper's Eye: 5-match attacks deal damage to ALL enemies
  // ---------------------------------------------------------------------------

  shouldFiveMatchAoE(matchLength: number): boolean {
    return this.has('snipers_eye') && matchLength === 5;
  }

  // ---------------------------------------------------------------------------
  // Heliograph Shard: once/combat, on 5-match, apply Blinded
  // ---------------------------------------------------------------------------

  tryHeliographShard(matchLength: number): boolean {
    if (this.heliographShardAvailable && matchLength >= 5) {
      this.heliographShardAvailable = false;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Snake Eye: cascade matches have 50% chance to apply 1 Poison to all
  // ---------------------------------------------------------------------------

  shouldCascadePoison(): boolean {
    return this.has('snake_eye') && Math.random() < 0.5;
  }

  // ---------------------------------------------------------------------------
  // Resurrecting Nails: on 3rd turn during boss, restore 30% HP
  // ---------------------------------------------------------------------------

  shouldResurrect(isBoss: boolean): boolean {
    return this.has('resurrecting_nails') && isBoss && this.turnNumber === 3;
  }

  // ---------------------------------------------------------------------------
  // Holy Water: unused swaps heal 3 HP each
  // ---------------------------------------------------------------------------

  getHolyWaterHealPerSwap(): number {
    return this.has('holy_water') ? 3 : 0;
  }

  // ---------------------------------------------------------------------------
  // Golden Scarab: gold gain +30%
  // ---------------------------------------------------------------------------

  getGoldGainMultiplier(): number {
    return getArtifactGoldGainMultiplier(this.artifactInstances);
  }

  // ---------------------------------------------------------------------------
  // Strong Liver: lose 1 gold, gain random buff
  // ---------------------------------------------------------------------------

  shouldStrongLiver(): boolean {
    return this.has('strong_liver');
  }
}
