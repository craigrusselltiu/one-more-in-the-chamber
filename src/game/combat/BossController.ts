import type { EnemyIntent, EnemyDefinition } from '../../types/combat';
import type { Enemy } from './Enemy';
import type { BoardHazardManager } from '../board/BoardHazardManager';
import { ACT1_ENEMIES } from '../../data/enemies';

export type BossPhase = 1 | 2 | 3;

/**
 * BossController: manages phase transitions and phase-specific AI for bosses.
 *
 * "Dusty" Dan McGraw -- Act 1 Boss (150 HP):
 *   Phase 1 (100-50%): Locks 1/turn, 10-15 damage. Can summon coyote minion (10 HP).
 *   Transition (50%): Barricade row + 10 block. One-time event.
 *   Phase 2 (50-25%): Locks 3/turn, 15-20 damage. Periodic blocks.
 *   Phase 3 (25-0%): Bomb tile every turn + locks. No blocking. 15-20 damage.
 */
export class BossController {
  private bossType: string;
  private phase: BossPhase = 1;
  private transitionTriggered = false;

  constructor(bossType: string) {
    this.bossType = bossType;
  }

  getPhase(): BossPhase {
    return this.phase;
  }

  /**
   * Check for phase transitions based on boss HP.
   * Returns true if a transition occurred this check.
   */
  checkPhaseTransition(
    boss: Enemy,
    hazardManager: BoardHazardManager,
  ): boolean {
    if (this.bossType !== 'dusty_dan') return false;

    const hpRatio = boss.state.health / boss.state.maxHealth;

    // Transition at 50%: barricade row + 10 block (one-time)
    if (hpRatio <= 0.5 && !this.transitionTriggered) {
      this.transitionTriggered = true;
      this.phase = 2;

      // "Flips table" -- barricade a middle row
      const row = 3 + Math.floor(Math.random() * 2); // row 3 or 4
      hazardManager.placeBarricadeRow(row);
      boss.addBlock(10);
      return true;
    }

    // Phase 3 at 25%
    if (hpRatio <= 0.25 && this.phase < 3) {
      this.phase = 3;
      return true;
    }

    return false;
  }

  /**
   * Choose intent for the boss based on current phase.
   */
  chooseBossIntent(boss: Enemy, aliveEnemyCount: number): EnemyIntent {
    if (this.bossType !== 'dusty_dan') {
      return boss.chooseIntent();
    }

    return this.chooseDustyDanIntent(boss, aliveEnemyCount);
  }

  /**
   * Execute boss-specific board manipulation after intent execution.
   * Called during the enemy turn for passive per-turn effects.
   */
  executePerTurnEffects(hazardManager: BoardHazardManager): void {
    if (this.bossType !== 'dusty_dan') return;

    switch (this.phase) {
      case 1:
        // Lock 1 tile per turn
        hazardManager.placeRandomLocks(1);
        break;
      case 2:
        // Lock 3 tiles per turn
        hazardManager.placeRandomLocks(3);
        break;
      case 3:
        // Bomb + lock every turn
        hazardManager.placeRandomBombs(1);
        hazardManager.placeRandomLocks(1);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Dusty Dan phase-specific AI
  // ---------------------------------------------------------------------------

  private chooseDustyDanIntent(boss: Enemy, aliveEnemyCount: number): EnemyIntent {
    switch (this.phase) {
      case 1:
        return this.dustyDanPhase1(boss, aliveEnemyCount);
      case 2:
        return this.dustyDanPhase2(boss);
      case 3:
        return this.dustyDanPhase3(boss);
    }
  }

  /**
   * Phase 1 (100-50%): 10-15 damage. Can summon a coyote minion (10 HP).
   */
  private dustyDanPhase1(_boss: Enemy, aliveEnemyCount: number): EnemyIntent {
    const damage = 10 + Math.floor(Math.random() * 6); // 10-15

    const options: { intent: EnemyIntent; weight: number }[] = [
      { intent: { type: 'attack', value: damage, description: `ATK ${damage}` }, weight: 3 },
    ];

    // Can summon a coyote minion if slots available
    if (aliveEnemyCount < 3) {
      options.push({
        intent: { type: 'summon', value: 1, description: 'HOWL (summon)' },
        weight: 2,
      });
    }

    return weightedRandom(options);
  }

  /**
   * Phase 2 (50-25%): 15-20 damage. Periodic blocks.
   */
  private dustyDanPhase2(_boss: Enemy): EnemyIntent {
    const damage = 15 + Math.floor(Math.random() * 6); // 15-20

    const options: { intent: EnemyIntent; weight: number }[] = [
      { intent: { type: 'attack', value: damage, description: `ATK ${damage}` }, weight: 3 },
      { intent: { type: 'block', value: 5, description: 'BLOCK +5' }, weight: 1 },
    ];

    return weightedRandom(options);
  }

  /**
   * Phase 3 (25-0%): 15-20 damage. No blocking. Frantic race.
   */
  private dustyDanPhase3(_boss: Enemy): EnemyIntent {
    const damage = 15 + Math.floor(Math.random() * 6); // 15-20
    return { type: 'attack', value: damage, description: `ATK ${damage}` };
  }

  /**
   * Create a coyote minion definition for boss summons.
   * 10 HP as specified in SPEC.
   */
  static createBossMinion(bossType: string): EnemyDefinition | null {
    if (bossType !== 'dusty_dan') return null;

    const coyoteDef = ACT1_ENEMIES.coyote;
    return {
      type: 'coyote',
      name: 'Coyote Pup',
      health: 10,
      minDamage: coyoteDef.minDamage,
      maxDamage: Math.round(coyoteDef.maxDamage * 0.7),
      abilities: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightedRandom(options: { intent: EnemyIntent; weight: number }[]): EnemyIntent {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return opt.intent;
  }
  return options[0].intent;
}
