import type { TileType } from '../../types/game';

/**
 * Player: runtime combat state + Deadeye ability.
 * Constructed from RunState at fight start, written back on fight end.
 */
export class Player {
  health: number;
  maxHealth: number;
  block = 0;
  aceStacks = 0;
  aceMultiplier = 1.0;
  luckyStacks = 0;
  barricadeStacks = 0;
  ragefulStacks = 0;
  sturdyStacks = 0;
  graceStacks = 0;
  poisonedStacks = 0;
  readyStacks = 0;
  chainStacks = 0;
  terrifiedStacks = 0;
  vulnerableStacks = 0;
  thorns = 0;
  /** Protected: while > 0, immune to tile hazard placement. Decrements at end of player turn. */
  protectedStacks = 0;
  skipNextBlockReset = false;
  gold = 0;
  goldThisFight = 0;
  abilityCharge: number;
  readonly abilityThreshold: number;
  deadeyeShots = 3;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  /** Whether the player took damage this turn (for Barricade check). */
  tookDamageThisTurn = false;
  /** Shed Skin: once/fight survive lethal damage with 1 HP. */
  shedSkinAvailable = false;
  /** Dead Man Walking(3): flat damage reduction per hit. */
  damageReduction = 0;
  /** Dead Man Walking(7): once/combat lethal → heal 20% max HP. */
  deadManWalkingAvailable = false;
  /** If the player owns Mirage, the type it transformed into for this combat. */
  mirageReplacementType: TileType | null = null;

  constructor(
    health: number,
    maxHealth: number,
    abilityCharge: number,
    abilityThreshold: number,
    activeTileTypes: TileType[],
    tileUpgrades: Partial<Record<TileType, number>>,
    gold: number,
  ) {
    this.health = health;
    this.maxHealth = maxHealth;
    this.abilityCharge = abilityCharge;
    this.abilityThreshold = abilityThreshold;
    this.activeTileTypes = activeTileTypes;
    this.tileUpgrades = tileUpgrades;
    this.gold = gold;
  }

  /**
   * Apply incoming damage. Returns actual HP lost, block absorbed, and thorns.
   */
  takeDamage(amount: number): { hpLost: number; blocked: number; thornsDamage: number } {
    let remaining = amount;

    // Vulnerable: +25% damage taken
    if (this.vulnerableStacks > 0) {
      remaining = Math.round(remaining * 1.25);
    }

    // Grace: negate entire damage instance
    if (this.graceStacks > 0 && remaining > 0) {
      this.graceStacks--;
      return { hpLost: 0, blocked: 0, thornsDamage: 0 };
    }

    // Dead Man Walking(3): flat damage reduction
    if (this.damageReduction > 0) {
      remaining = Math.max(0, remaining - this.damageReduction);
    }

    // Block absorption
    let blocked = 0;
    if (this.block > 0) {
      blocked = Math.min(this.block, remaining);
      this.block -= blocked;
      remaining -= blocked;
    }

    // Apply damage to HP
    this.health = Math.max(0, this.health - remaining);
    if (remaining > 0) this.tookDamageThisTurn = true;

    // Dead Man Walking(7): survive lethal → heal 20% max HP (once per combat)
    if (this.health <= 0 && this.deadManWalkingAvailable) {
      this.health = Math.max(1, Math.floor(this.maxHealth * 0.2));
      this.deadManWalkingAvailable = false;
    }

    // Shed Skin: survive lethal damage, heal 50% max HP (once per fight, artifact self-destructs)
    if (this.health <= 0 && this.shedSkinAvailable) {
      this.health = Math.max(1, Math.floor(this.maxHealth * 0.5));
      this.shedSkinAvailable = false;
    }

    // Thorns: deal damage back equal to stacks
    const thornsDamage = this.thorns > 0 ? this.thorns : 0;

    return { hpLost: remaining, blocked, thornsDamage };
  }

  heal(amount: number): number {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - before;
  }

  addBlock(amount: number): void {
    this.block += amount;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.goldThisFight += amount;
  }

  /** Add Ace stacks. Each stack = +0.25x multiplier on next non-Ace match. */
  addAceStacks(stacks: number): void {
    this.aceStacks += stacks;
    this.aceMultiplier = 1.0 + this.aceStacks * 0.25;
  }

  /** Consume Ace stacks on non-Ace match. Returns the multiplier. */
  consumeAce(): number {
    if (this.aceStacks <= 0) return 1.0;
    const mult = this.aceMultiplier;
    this.aceStacks = 0;
    this.aceMultiplier = 1.0;
    return mult;
  }

  /** Add Ready stacks (max 1). Next non-cascade attack deals 50% more damage. */
  addReady(stacks: number): void {
    this.readyStacks = Math.min(1, this.readyStacks + stacks);
  }

  /** Consume Ready on non-cascade attack. Returns 1.5 if ready, 1.0 otherwise. */
  consumeReady(): number {
    if (this.readyStacks <= 0) return 1.0;
    this.readyStacks = 0;
    return 1.5;
  }

  /** Add Lucky stacks. Each stack = +1% chance for 1.5x damage (max 50). Removed when crit occurs. */
  addLuckyStacks(stacks: number): void {
    this.luckyStacks = Math.min(50, this.luckyStacks + stacks);
  }

  /** Consume Lucky stacks when crit occurs. */
  consumeLucky(): void {
    this.luckyStacks = 0;
  }

  isDeadeyeReady(): boolean {
    return this.abilityCharge >= this.abilityThreshold;
  }

  activateDeadeye(): boolean {
    if (!this.isDeadeyeReady()) return false;
    this.abilityCharge -= this.abilityThreshold;
    return true;
  }

  /** End-of-turn effects. Block expires unless Barricade is active. */
  resetTurnEffects(): void {
    // Skip block reset once (Death's Pocket Watch)
    if (this.skipNextBlockReset) {
      this.skipNextBlockReset = false;
    } else if (this.barricadeStacks > 0) {
      // Barricade: retain block, decrement stacks
      this.barricadeStacks--;
    } else {
      this.block = 0;
    }
    // Rageful/Sturdy: decrement stacks
    if (this.ragefulStacks > 0) this.ragefulStacks--;
    if (this.sturdyStacks > 0) this.sturdyStacks--;
    if (this.vulnerableStacks > 0) this.vulnerableStacks--;
    if (this.protectedStacks > 0) this.protectedStacks--;
    this.thorns = 0;
    this.tookDamageThisTurn = false;
  }

  /** Reset per-fight effects between fights. */
  resetFightEffects(): void {
    this.aceStacks = 0;
    this.aceMultiplier = 1.0;
    this.luckyStacks = 0;
    this.barricadeStacks = 0;
    this.ragefulStacks = 0;
    this.sturdyStacks = 0;
    this.poisonedStacks = 0;
    this.readyStacks = 0;
    this.chainStacks = 0;
    this.terrifiedStacks = 0;
    this.protectedStacks = 0;
    this.thorns = 0;
    this.goldThisFight = 0;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getUpgradeLevel(type: TileType): number {
    let level = this.tileUpgrades[type] ?? 0;
    // Mirage adds its upgrade level to the type it transformed into.
    if (this.mirageReplacementType === type) {
      level += this.tileUpgrades['mirage'] ?? 0;
    }
    return level;
  }
}
