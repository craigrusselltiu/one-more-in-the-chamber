import type { TileType } from '../../types/game';

/**
 * Player: player state + Deadeye ability.
 */
export class Player {
  health: number;
  maxHealth: number;
  block = 0;
  dodgeChance = 0;
  aceMultiplier = 1.0;
  critChance = 0;
  thorns = 0;
  abilityCharge = 0;
  readonly abilityThreshold = 10;
  activeTileTypes: TileType[] = ['bullet', 'iron', 'gold'];

  constructor() {
    this.health = 100;
    this.maxHealth = 100;
  }

  takeDamage(amount: number): number {
    // Dodge check
    if (Math.random() * 100 < this.dodgeChance) return 0;

    let remaining = amount;

    // Block absorption
    if (this.block > 0) {
      const absorbed = Math.min(this.block, remaining);
      this.block -= absorbed;
      remaining -= absorbed;
    }

    // Apply damage
    this.health = Math.max(0, this.health - remaining);
    return remaining;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addBlock(amount: number): void {
    this.block += amount;
  }

  isDeadeyeReady(): boolean {
    return this.abilityCharge >= this.abilityThreshold;
  }

  activateDeadeye(): boolean {
    if (!this.isDeadeyeReady()) return false;
    this.abilityCharge -= this.abilityThreshold;
    return true;
  }

  resetTurnEffects(): void {
    this.block = 0;
  }

  resetFightEffects(): void {
    this.dodgeChance = 0;
    this.aceMultiplier = 1.0;
    this.critChance = 0;
    this.thorns = 0;
  }
}
