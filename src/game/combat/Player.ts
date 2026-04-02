import type { TileType } from '../../types/game';

/**
 * Player: runtime combat state + Deadeye ability.
 * Constructed from RunState at fight start, written back on fight end.
 */
export class Player {
  health: number;
  maxHealth: number;
  block = 0;
  aceMultiplier = 1.0;
  critChance = 0;
  thorns = 0;
  gold = 0;
  goldThisFight = 0;
  abilityCharge: number;
  readonly abilityThreshold = 10;
  deadeyeShots = 3;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;

  constructor(
    health: number,
    maxHealth: number,
    abilityCharge: number,
    activeTileTypes: TileType[],
    tileUpgrades: Partial<Record<TileType, number>>,
    gold: number,
  ) {
    this.health = health;
    this.maxHealth = maxHealth;
    this.abilityCharge = abilityCharge;
    this.activeTileTypes = activeTileTypes;
    this.tileUpgrades = tileUpgrades;
    this.gold = gold;
  }

  /**
   * Apply incoming damage. Returns actual HP lost (after block/thorns).
   * Thorns damage is returned as the second element if triggered.
   */
  takeDamage(amount: number): { hpLost: number; thornsDamage: number } {
    let remaining = amount;
    let absorbedByBlock = 0;

    // Block absorption
    if (this.block > 0) {
      absorbedByBlock = Math.min(this.block, remaining);
      this.block -= absorbedByBlock;
      remaining -= absorbedByBlock;
    }

    // Apply damage to HP
    this.health = Math.max(0, this.health - remaining);

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

  isDeadeyeReady(): boolean {
    return this.abilityCharge >= this.abilityThreshold;
  }

  activateDeadeye(): boolean {
    if (!this.isDeadeyeReady()) return false;
    this.abilityCharge -= this.abilityThreshold;
    return true;
  }

  /** Expire block at end of player turn. */
  resetTurnEffects(): void {
    this.block = 0;
  }

  /** Reset per-fight effects between fights. */
  resetFightEffects(): void {
    this.aceMultiplier = 1.0;
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
