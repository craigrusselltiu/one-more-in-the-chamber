import type { EnemyState, EnemyIntent } from '../../types/combat';

export interface EnemyDefinition {
  type: string;
  name: string;
  health: number;
  minDamage: number;
  maxDamage: number;
  abilities: string[];
}

/**
 * Enemy: state + AI intent selection.
 */
export class Enemy {
  state: EnemyState;
  private definition: EnemyDefinition;

  constructor(definition: EnemyDefinition) {
    this.definition = definition;
    this.state = {
      id: crypto.randomUUID(),
      enemyType: definition.type,
      health: definition.health,
      maxHealth: definition.health,
      block: 0,
      venomStacks: 0,
      vulnerable: 0,
      intent: this.chooseIntent(),
      isDead: false,
    };
  }

  chooseIntent(): EnemyIntent {
    const damage =
      this.definition.minDamage +
      Math.floor(
        Math.random() * (this.definition.maxDamage - this.definition.minDamage + 1),
      );
    return {
      type: 'attack',
      value: damage,
      description: `ATK ${damage}`,
    };
  }

  takeDamage(amount: number): number {
    let remaining = amount;

    // Vulnerable bonus
    if (this.state.vulnerable > 0) {
      remaining = Math.round(remaining * 1.25);
      this.state.vulnerable--;
    }

    // Block absorption
    if (this.state.block > 0) {
      const absorbed = Math.min(this.state.block, remaining);
      this.state.block -= absorbed;
      remaining -= absorbed;
    }

    this.state.health = Math.max(0, this.state.health - remaining);
    if (this.state.health <= 0) {
      this.state.isDead = true;
    }
    return remaining;
  }

  tickVenom(): number {
    if (this.state.venomStacks <= 0) return 0;
    const damage = this.state.venomStacks;
    this.state.health = Math.max(0, this.state.health - damage);
    this.state.venomStacks--;
    if (this.state.health <= 0) {
      this.state.isDead = true;
    }
    return damage;
  }

  addBlock(amount: number): void {
    this.state.block += amount;
  }
}
