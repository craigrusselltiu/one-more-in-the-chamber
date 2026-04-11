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
      case 'apply_terrified': return `TERRIFY ${a.value}`;
      case 'gain_dead_man_walking': return `+${a.value} DMW`;
      case 'gain_barricade': return `+${a.value} BARRICADE`;
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
  /** Tracks which hpTrigger thresholds have already fired. */
  triggeredThresholds = new Set<number>();
  /** If set, overrides the next chooseIntent call (e.g. Dust Devil enrage). */
  forcedNextMove: MoveAction[] | null = null;

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
      cloak: 0,
      bountyStacks: 0,
      terrifiedStacks: 0,
      blindedStacks: 0,
      ragefulStacks: 0,
      thorns: 0,
      graceStacks: 0,
      hardened: 0,
      fuse: definition.initialFuse ?? 0,
      deadManWalking: 0,
      barricadeStacks: 0,
      summoned: false,
      intent: { type: 'attack', value: 0, description: '' },
      isDead: false,
    };
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

  chooseIntent(aliveCount = 1, allyInjured = false): EnemyIntent {
    // Forced next move (e.g. Dust Devil's enrage Multi-attack 2x4)
    if (this.forcedNextMove) {
      const move: EnemyMove = { actions: this.forcedNextMove };
      this.forcedNextMove = null;
      this.lastMoveIndex = -1; // allow any move next time without no-repeat interference
      return moveToIntent(move);
    }

    // First move override (e.g. Dusty Dan always summons both on turn 1)
    if (this.lastMoveIndex === -1 && this.definition.firstMove) {
      this.lastMoveIndex = -2; // mark as used
      return moveToIntent(this.definition.firstMove);
    }

    const moves = this.definition.moves;

    if (moves && moves.length > 0) {
      const canSummon = aliveCount < 3 && !this.summoned;
      const hpRatio = this.state.health / this.state.maxHealth;

      // Sequential move order (e.g. Hangman)
      if (this.definition.sequential) {
        const idx = (this.lastMoveIndex + 1) % moves.length;
        this.lastMoveIndex = idx;
        return moveToIntent(moves[idx]);
      }

      // Hellfire Preacher: prioritize heal_ally when an ally is injured
      if (allyInjured && this.definition.type === 'hellfire_preacher') {
        const healMove = moves.find(mv => mv.actions.some(a => a.kind === 'heal_ally'));
        if (healMove) return moveToIntent(healMove);
      }

      // Special: Coyote always summons when alone
      if (this.definition.type === 'coyote' && aliveCount === 1 && canSummon) {
        const summonMove = moves.find(mv => mv.actions.some(a => a.kind === 'summon'));
        if (summonMove) return moveToIntent(summonMove);
      }

      // Build weighted candidate list
      const candidates: { mv: EnemyMove; i: number; weight: number }[] = [];
      for (let i = 0; i < moves.length; i++) {
        const mv = moves[i];
        // No-repeat rule
        if (moves.length > 1 && i === this.lastMoveIndex) continue;
        // Filter summon when field is full or enemy is summoned
        if (!canSummon && mv.actions.some(a => a.kind === 'summon')) continue;

        // Calculate weight based on HP
        const threshold = mv.lowHpThreshold ?? 0.5;
        const baseWeight = mv.weight ?? 1;
        const weight = (mv.lowHpWeight != null && hpRatio <= threshold)
          ? mv.lowHpWeight
          : baseWeight;
        if (weight > 0) candidates.push({ mv, i, weight });
      }

      // Fallback if all filtered out
      if (candidates.length === 0) {
        const fallback = moves.filter(mv => !mv.actions.some(a => a.kind === 'summon'));
        if (fallback.length === 0) return moveToIntent(moves[0]);
        return moveToIntent(fallback[Math.floor(Math.random() * fallback.length)]);
      }

      // Weighted random selection
      const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      let roll = Math.random() * totalWeight;
      for (const c of candidates) {
        roll -= c.weight;
        if (roll <= 0) {
          this.lastMoveIndex = c.i;
          return moveToIntent(c.mv);
        }
      }
      // Shouldn't reach here, but fallback
      const last = candidates[candidates.length - 1];
      this.lastMoveIndex = last.i;
      return moveToIntent(last.mv);
    }

    // Fallback for enemies without movesets (should not happen)
    return { type: 'attack', value: 0, description: 'ATK 0', actions: [{ kind: 'attack', value: 0 }] };
  }


  /**
   * Apply damage to this enemy. Accounts for Grace, Vulnerable, Hardened, and Block.
   * @param pierceBlock if true, damage bypasses block absorption (but still respects Grace/Vulnerable/Hardened).
   * Returns { hpLost, blocked } for floating number display.
   */
  takeDamage(amount: number, pierceBlock = false): { hpLost: number; blocked: number } {
    let remaining = amount;

    // Grace: negate entire damage instance
    if (this.state.graceStacks > 0 && remaining > 0) {
      this.state.graceStacks--;
      return { hpLost: 0, blocked: 0 };
    }

    // Vulnerable: +20% damage (stacks decrease at end of turn, not on hit)
    if (this.state.vulnerable > 0) {
      remaining = Math.round(remaining * 1.2);
    }

    // Hardened: cap damage to hardened stacks (post-Vulnerable, pre-Block)
    if (this.state.hardened > 0 && remaining > this.state.hardened) {
      remaining = this.state.hardened;
    }

    // Block absorption (skipped if pierceBlock)
    let blocked = 0;
    if (!pierceBlock && this.state.block > 0) {
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

  /** Dead Man Walking grants immunity to debuff application. */
  isImmuneToDebuffs(): boolean {
    return this.state.deadManWalking > 0;
  }

  addPoison(stacks: number): void {
    if (this.isImmuneToDebuffs()) return;
    this.state.poisonStacks += stacks;
  }

  addVulnerable(stacks: number): void {
    if (this.isImmuneToDebuffs()) return;
    this.state.vulnerable += stacks;
  }

  addBounty(stacks: number): void {
    if (this.isImmuneToDebuffs()) return;
    this.state.bountyStacks += stacks;
  }

  addTerrified(stacks: number): void {
    if (this.isImmuneToDebuffs()) return;
    this.state.terrifiedStacks += stacks;
  }

  addBlinded(stacks: number): void {
    if (this.isImmuneToDebuffs()) return;
    this.state.blindedStacks += stacks;
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


    return result;
  }

  /** Re-roll intent for next turn. */
  rollNextIntent(): void {
    this.state.intent = this.chooseIntent();
  }
}
