import type { EnemyState, EnemyIntent, EnemyDefinition, MoveAction, EnemyMove } from '../../types/combat';

export type { EnemyDefinition };

/** Build a human-readable description from structured actions. */
function buildDescription(actions: MoveAction[]): string {
  return actions.map((a) => {
    switch (a.kind) {
      case 'attack': return `ATK ${a.value}`;
      case 'multi_attack': return `${a.value}x${a.hits ?? 2}`;
      case 'block': return `DEF ${a.value}`;
      case 'lock': return `LOCK ${a.value}`;
      case 'lock_row': return 'LOCK ROW';
      case 'lock_column': return 'LOCK COL';
      case 'poison_tiles': return `POISON ${a.value}`;
      case 'apply_poison': return `APPLY ${a.value} PSN`;
      case 'bomb': return `BOMB ${a.value}`;
      case 'bury': return `BURY ${a.value}`;
      case 'suppress': return `SUPPRESS ${a.value}`;
      case 'fools_gold': return `FG ${a.value}`;
      case 'summon': return `SUMMON ${a.summonType ?? '?'}`;
      case 'heal': return `HEAL ${a.value}`;
      case 'gain_rageful': return `+${a.value} RGF`;
      case 'gain_terrified': return `TERRIFY ${a.value}`;
      case 'shuffle_rows': return 'SHUFFLE';
      case 'gravity_shift': return 'GRAV';
      case 'transform_tumbleweed': return `TWEED ${a.value}`;
      default: return String(a.kind);
    }
  }).join(', ');
}

/** Convert an EnemyMove into an EnemyIntent. */
function moveToIntent(move: EnemyMove): EnemyIntent {
  const desc = buildDescription(move.actions);
  // Determine primary type from first action
  const first = move.actions[0];
  let type: EnemyIntent['type'] = 'ability';
  if (first?.kind === 'attack' || first?.kind === 'multi_attack') type = 'attack';
  else if (first?.kind === 'block') type = 'block';
  else if (first?.kind === 'summon') type = 'summon';
  else type = 'board-manipulation';
  const value = first?.value ?? 0;
  return { type, value, description: desc, actions: move.actions };
}

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
  /** If true, this enemy was summoned mid-combat (not an original enemy). */
  summoned = false;

  constructor(definition: EnemyDefinition) {
    this.definition = definition;
    this.state = {
      id: crypto.randomUUID(),
      enemyType: definition.type,
      health: definition.health,
      maxHealth: definition.health,
      block: 0,
      poisonStacks: 0,
      vulnerable: 0,
      crackedGround: 0,
      bountyStacks: 0,
      terrifiedStacks: 0,
      summoned: false,
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
  /** Index of the last move used (for no-repeat rule). */
  private lastMoveIndex = -1;

  chooseIntent(): EnemyIntent {
    const moves = this.definition.moves;

    // If the enemy has an explicit moveset, pick randomly (no repeat)
    if (moves && moves.length > 0) {
      const candidates = moves
        .map((mv, i) => ({ mv, i }))
        .filter(({ i }) => moves.length <= 1 || i !== this.lastMoveIndex);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.lastMoveIndex = pick.i;
      return moveToIntent(pick.mv);
    }

    // Fallback: legacy weighted random for enemies without movesets
    const abilities = this.definition.abilities;
    const options: { intent: EnemyIntent; weight: number }[] = [];

    const damage = this.rollDamage();
    options.push({
      intent: { type: 'attack', value: damage, description: `ATK ${damage}` },
      weight: 3,
    });

    if (abilities.includes('block')) {
      options.push({
        intent: { type: 'block', value: 5, description: 'BLOCK +5' },
        weight: 1,
      });
    }

    if (abilities.includes('howl') || abilities.includes('summon')) {
      options.push({
        intent: { type: 'summon', value: 1, description: 'HOWL' },
        weight: 1,
      });
    }

    if (abilities.includes('poison')) {
      options.push({
        intent: { type: 'board-manipulation', value: 2, description: 'POISON 2' },
        weight: 1,
      });
    }
    if (abilities.includes('lock')) {
      options.push({
        intent: { type: 'board-manipulation', value: 1, description: 'LOCK 1' },
        weight: 1,
      });
    }
    if (abilities.includes('bury')) {
      options.push({
        intent: { type: 'board-manipulation', value: 3, description: 'BURY 3' },
        weight: 1,
      });
    }
    if (abilities.includes('bomb')) {
      options.push({
        intent: { type: 'board-manipulation', value: 1, description: 'BOMB' },
        weight: 1,
      });
    }

    return this.weightedRandom(options);
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
   * Returns { hpLost, blocked } for floating number display.
   */
  takeDamage(amount: number): { hpLost: number; blocked: number } {
    let remaining = amount;

    // Vulnerable: +50% damage (stacks decrease at end of turn, not on hit)
    if (this.state.vulnerable > 0) {
      remaining = Math.round(remaining * 1.5);
    }

    // Block absorption
    let blocked = 0;
    if (this.state.block > 0) {
      blocked = Math.min(this.state.block, remaining);
      this.state.block -= blocked;
      remaining -= blocked;
    }

    this.state.health = Math.max(0, this.state.health - remaining);
    if (this.state.health <= 0) {
      this.state.isDead = true;
    }
    return { hpLost: remaining, blocked };
  }

  /**
   * Poison tick: damage equal to stack count + bonus from upgrades, then stacks decrease by 1.
   * @param bonusDamagePerTick - flat bonus from waste tile upgrades (+1 per upgrade level)
   * Returns damage dealt.
   */
  tickPoison(bonusDamagePerTick = 0): number {
    if (this.state.poisonStacks <= 0) return 0;
    const damage = this.state.poisonStacks + bonusDamagePerTick;
    this.state.health = Math.max(0, this.state.health - damage);
    this.state.poisonStacks--;
    if (this.state.health <= 0) {
      this.state.isDead = true;
    }
    return damage;
  }

  addBlock(amount: number): void {
    this.state.block += amount;
  }

  addPoison(stacks: number): void {
    this.state.poisonStacks += stacks;
  }

  addVulnerable(stacks: number): void {
    this.state.vulnerable += stacks;
  }

  addBounty(stacks: number): void {
    this.state.bountyStacks += stacks;
  }

  addTerrified(stacks: number): void {
    this.state.terrifiedStacks += stacks;
  }

  /** Check if bounty kill threshold is met: HP <= bountyStacks. */
  checkBountyKill(): boolean {
    if (this.state.bountyStacks > 0 && this.state.health <= this.state.bountyStacks && !this.state.isDead) {
      this.state.health = 0;
      this.state.isDead = true;
      return true;
    }
    return false;
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
