import type { EnemyState, EnemyIntent, EnemyDefinition } from '../../types/combat';

export type { EnemyDefinition };

/**
 * Enemy: runtime state + AI intent selection based on abilities.
 *
 * Intent is chosen at the start of each player turn and telegraphed.
 * Each enemy type has different ability weights that influence behavior.
 */
export class Enemy {
  state: EnemyState;
  private definition: EnemyDefinition;
  /** If true, this enemy skips its next action (from Smoke Bomb). */
  skipNextAction = false;

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
      intent: { type: 'attack', value: 0, description: '' },
      isDead: false,
    };
    this.state.intent = this.chooseIntent();
  }

  getDefinition(): EnemyDefinition {
    return this.definition;
  }

  /**
   * Choose next intent based on enemy abilities and current state.
   * Weighted random selection from available actions.
   */
  chooseIntent(): EnemyIntent {
    const abilities = this.definition.abilities;
    const actions: { intent: EnemyIntent; weight: number }[] = [];

    // Every enemy can attack
    const damage = this.rollDamage();
    actions.push({
      intent: { type: 'attack', value: damage, description: `ATK ${damage}` },
      weight: 3,
    });

    // Block if the enemy has the ability
    if (abilities.includes('block')) {
      actions.push({
        intent: { type: 'block', value: 5, description: 'BLOCK +5' },
        weight: 1,
      });
    }

    // Summon (e.g. coyote howl)
    if (abilities.includes('howl') || abilities.includes('summon')) {
      actions.push({
        intent: { type: 'summon', value: 1, description: 'HOWL' },
        weight: 1,
      });
    }

    // Board manipulation abilities
    if (abilities.includes('poison')) {
      actions.push({
        intent: { type: 'board-manipulation', value: 2, description: 'POISON 2' },
        weight: 1,
      });
    }
    if (abilities.includes('lock')) {
      actions.push({
        intent: { type: 'board-manipulation', value: 1, description: 'LOCK 1' },
        weight: 1,
      });
    }
    if (abilities.includes('bury')) {
      actions.push({
        intent: { type: 'board-manipulation', value: 3, description: 'BURY 3' },
        weight: 1,
      });
    }
    if (abilities.includes('bomb')) {
      actions.push({
        intent: { type: 'board-manipulation', value: 1, description: 'BOMB' },
        weight: 1,
      });
    }

    return this.weightedRandom(actions);
  }

  private weightedRandom(actions: { intent: EnemyIntent; weight: number }[]): EnemyIntent {
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const action of actions) {
      roll -= action.weight;
      if (roll <= 0) return action.intent;
    }
    return actions[0].intent;
  }

  private rollDamage(): number {
    return (
      this.definition.minDamage +
      Math.floor(
        Math.random() * (this.definition.maxDamage - this.definition.minDamage + 1),
      )
    );
  }

  /**
   * Apply damage to this enemy. Accounts for Vulnerable and Block.
   * Returns actual HP damage dealt (after block).
   */
  takeDamage(amount: number): number {
    let remaining = amount;

    // Vulnerable: +25% damage, consumed per hit
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

  /**
   * Venom tick: damage equal to stack count + bonus from upgrades, then stacks decrease by 1.
   * @param bonusDamagePerTick - flat bonus from venom tile upgrades (+1 per upgrade level)
   * Returns damage dealt.
   */
  tickVenom(bonusDamagePerTick = 0): number {
    if (this.state.venomStacks <= 0) return 0;
    const damage = this.state.venomStacks + bonusDamagePerTick;
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

  addVenom(stacks: number): void {
    this.state.venomStacks += stacks;
  }

  addVulnerable(stacks: number): void {
    this.state.vulnerable += stacks;
  }

  /** Execute this enemy's announced intent. Returns the attack damage value (0 if not attacking). */
  executeIntent(): { type: EnemyIntent['type']; value: number } {
    if (this.skipNextAction) {
      this.skipNextAction = false;
      return { type: 'block', value: 0 };
    }

    const intent = this.state.intent;
    const result = { type: intent.type, value: intent.value ?? 0 };

    // Apply block if this is a block action
    if (intent.type === 'block') {
      this.addBlock(intent.value ?? 5);
    }

    return result;
  }

  /** Re-roll intent for next turn. */
  rollNextIntent(): void {
    this.state.intent = this.chooseIntent();
  }
}
