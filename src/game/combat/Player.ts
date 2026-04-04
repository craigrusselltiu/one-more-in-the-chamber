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
  critChance = 0;
  thorns = 0;
  gold = 0;
  goldThisFight = 0;
  abilityCharge: number;
  readonly abilityThreshold: number;
  deadeyeShots = 3;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  /** Whether the player took damage this turn (for Barricade check). */
  tookDamageThisTurn = false;

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
   * Apply incoming damage. Returns actual HP lost (after block/thorns).
   */
  takeDamage(amount: number): { hpLost: number; thornsDamage: number } {
    let remaining = amount;

    // Block absorption
    if (this.block > 0) {
      const absorbed = Math.min(this.block, remaining);
      this.block -= absorbed;
      remaining -= absorbed;
    }

    // Apply damage to HP
    this.health = Math.max(0, this.health - remaining);
    if (remaining > 0) this.tookDamageThisTurn = true;

    // Thorns: reflect 100% of the incoming attack back (consumed on trigger)
    let thornsDamage = 0;
    if (this.thorns > 0) {
      thornsDamage = amount;
      this.thorns = 0;
    }

    return { hpLost: remaining, thornsDamage };
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

  /** Add Lucky stacks. Each stack = +1% crit. Removed when crit occurs. */
  addLuckyStacks(stacks: number): void {
    this.luckyStacks += stacks;
    this.critChance += stacks;
  }

  /** Consume Lucky stacks when crit occurs. */
  consumeLucky(): void {
    this.critChance -= this.luckyStacks;
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
    // Barricade: if no damage taken this turn, retain block, decrement stacks
    if (this.barricadeStacks > 0 && !this.tookDamageThisTurn) {
      this.barricadeStacks--;
      // Block persists (not reset)
    } else {
      this.block = 0;
      this.barricadeStacks = 0;
    }
    this.tookDamageThisTurn = false;
  }

  /** Reset per-fight effects between fights. */
  resetFightEffects(): void {
    this.aceStacks = 0;
    this.aceMultiplier = 1.0;
    this.luckyStacks = 0;
    this.barricadeStacks = 0;
    this.critChance = 0;
    this.thorns = 0;
    this.goldThisFight = 0;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getUpgradeLevel(type: TileType): number {
    return this.tileUpgrades[type] ?? 0;
  }
}
