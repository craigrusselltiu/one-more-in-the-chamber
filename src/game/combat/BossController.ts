import type { EnemyIntent, EnemyDefinition } from '../../types/combat';
import type { SerializedBossController } from '../../types/combatSnapshot';
import type { Enemy } from './Enemy';
import type { Board } from '../board/Board';
import type { BoardHazardManager } from '../board/BoardHazardManager';
import type { TileType } from '../../types/game';
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
 *
 * "Copperhead" Cassidy -- Act 2 Boss (200 HP):
 *   Phase 1 (100-50%): Poison 4 tiles/turn. Alternates brew (more poison) / strike
 *     (15-20 damage + 2 bonus per poison tile on board). Occasional block (coil).
 *   Transition (50%): Fool's gold tiles appear. One-time event.
 *   Phase 2 (50-0%): Poison 2 + fool's gold 2 per turn. 20-25 damage strikes.
 *     Board becomes a minefield of traps.
 */
export class BossController {
  private bossType: string;
  private phase: BossPhase = 1;
  private transitionTriggered = false;
  /** Tracks alternating brew/strike pattern for Copperhead Cassidy. */
  private turnParity = 0;

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
    board: Board,
  ): boolean {
    switch (this.bossType) {
      case 'dusty_dan':
        return this.checkDustyDanTransition(boss, hazardManager, board);
      case 'copperhead_cassidy':
        return this.checkCopperheadTransition(boss, hazardManager);
      case 'iron_eye_isabella':
        return this.checkIsabellaTransition(boss);
      default:
        return false;
    }
  }

  private checkDustyDanTransition(
    boss: Enemy,
    hazardManager: BoardHazardManager,
    _board: Board,
  ): boolean {
    const hpRatio = boss.state.health / boss.state.maxHealth;

    // Transition at 50%: lock row + 10 block (one-time)
    if (hpRatio <= 0.5 && !this.transitionTriggered) {
      this.transitionTriggered = true;
      this.phase = 2;

      // "Flips table" -- lock a middle row
      const row = 3 + Math.floor(Math.random() * 2); // row 3 or 4
      hazardManager.lockRow(row);
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

  private checkCopperheadTransition(
    boss: Enemy,
    hazardManager: BoardHazardManager,
  ): boolean {
    const hpRatio = boss.state.health / boss.state.maxHealth;

    // Transition at 50%: fool's gold tiles flood the board (one-time)
    if (hpRatio <= 0.5 && !this.transitionTriggered) {
      this.transitionTriggered = true;
      this.phase = 2;

      // Initial fool's gold burst on transition
      hazardManager.placeRandomFoolsGold(4);
      return true;
    }

    return false;
  }

  private checkIsabellaTransition(boss: Enemy): boolean {
    const hpRatio = boss.state.health / boss.state.maxHealth;

    // Phase 2 at 65%
    if (hpRatio <= 0.65 && this.phase < 2) {
      this.phase = 2;
      return true;
    }

    // Phase 3 at 30%
    if (hpRatio <= 0.3 && this.phase < 3) {
      this.phase = 3;
      return true;
    }

    return false;
  }

  /**
   * Choose intent for the boss based on current phase.
   * @param hazardManager - needed by Copperhead to count poison tiles for bonus damage.
   */
  chooseBossIntent(
    boss: Enemy,
    aliveEnemyCount: number,
    hazardManager?: BoardHazardManager,
  ): EnemyIntent {
    switch (this.bossType) {
      case 'dusty_dan':
        return this.chooseDustyDanIntent(boss, aliveEnemyCount);
      case 'copperhead_cassidy':
        return this.chooseCopperheadIntent(boss, hazardManager);
      case 'iron_eye_isabella':
        return this.chooseIsabellaIntent(boss);
      default:
        return boss.chooseIntent();
    }
  }

  /**
   * Execute boss-specific board manipulation after intent execution.
   * Called during the enemy turn for passive per-turn effects.
   * @param boss - optional, needed by Isabella for passive block.
   * @param activeTileTypes - optional, needed by Isabella Phase 2 for warrant suppression.
   */
  executePerTurnEffects(
    hazardManager: BoardHazardManager,
    boss?: Enemy,
    activeTileTypes?: TileType[],
    board?: Board,
  ): void {
    switch (this.bossType) {
      case 'dusty_dan':
        this.dustyDanPerTurn(hazardManager, board);
        break;
      case 'copperhead_cassidy':
        this.copperheadPerTurn(hazardManager);
        break;
      case 'iron_eye_isabella':
        this.isabellaPerTurn(hazardManager, boss, activeTileTypes);
        break;
    }
  }

  private static readonly GRAVITY_CYCLE: Array<'left' | 'up' | 'right' | 'down'> = ['left', 'up', 'right', 'down'];

  private dustyDanPerTurn(hazardManager: BoardHazardManager, board?: Board): void {
    // Rotate gravity clockwise each turn
    if (board) {
      const dir = BossController.GRAVITY_CYCLE[this.turnParity % 4];
      board.setGravityDirection(dir);
    }
    this.turnParity++;

    switch (this.phase) {
      case 1:
        hazardManager.placeRandomLocks(1);
        break;
      case 2:
        hazardManager.placeRandomLocks(3);
        break;
      case 3:
        hazardManager.placeRandomBombs(1);
        hazardManager.placeRandomLocks(1);
        break;
    }
  }

  private copperheadPerTurn(hazardManager: BoardHazardManager): void {
    switch (this.phase) {
      case 1:
        // Poison 4 tiles per turn
        hazardManager.placeRandomPoison(4);
        break;
      case 2:
        // Poison + fool's gold -- board becomes a minefield
        hazardManager.placeRandomPoison(2);
        hazardManager.placeRandomFoolsGold(2);
        break;
    }
    this.turnParity++;
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
   * Per-turn: HEX 1 (lock).
   */
  private dustyDanPhase1(_boss: Enemy, aliveEnemyCount: number): EnemyIntent {
    const damage = 10 + Math.floor(Math.random() * 6); // 10-15
    const nextGrav = BossController.GRAVITY_CYCLE[this.turnParity % 4].toUpperCase();

    const options: { intent: EnemyIntent; weight: number }[] = [
      { intent: { type: 'attack', value: damage, description: `GRAV ${nextGrav}, LOCK 1, ATK ${damage}` }, weight: 3 },
    ];

    // Can summon a coyote minion if slots available
    if (aliveEnemyCount < 3) {
      options.push({
        intent: { type: 'summon', value: 1, description: `GRAV ${nextGrav}, LOCK 1, CALL 1` },
        weight: 2,
      });
    }

    return weightedRandom(options);
  }

  /**
   * Phase 2 (50-25%): 15-20 damage. Periodic blocks. Per-turn: 3 locks + gravity.
   */
  private dustyDanPhase2(_boss: Enemy): EnemyIntent {
    const damage = 15 + Math.floor(Math.random() * 6); // 15-20
    const nextGrav = BossController.GRAVITY_CYCLE[this.turnParity % 4].toUpperCase();

    const options: { intent: EnemyIntent; weight: number }[] = [
      { intent: { type: 'attack', value: damage, description: `GRAV ${nextGrav}, LOCK 3, ATK ${damage}` }, weight: 3 },
      { intent: { type: 'block', value: 5, description: `GRAV ${nextGrav}, LOCK 3, DEF 5` }, weight: 1 },
    ];

    return weightedRandom(options);
  }

  /**
   * Phase 3 (25-0%): 15-20 damage. Per-turn: bomb + lock + gravity. No blocking.
   */
  private dustyDanPhase3(_boss: Enemy): EnemyIntent {
    const damage = 15 + Math.floor(Math.random() * 6); // 15-20
    const nextGrav = BossController.GRAVITY_CYCLE[this.turnParity % 4].toUpperCase();
    return { type: 'attack', value: damage, description: `GRAV ${nextGrav}, BOMB 1, LOCK 1, ATK ${damage}` };
  }

  // ---------------------------------------------------------------------------
  // Copperhead Cassidy phase-specific AI
  // ---------------------------------------------------------------------------

  private chooseCopperheadIntent(
    _boss: Enemy,
    hazardManager?: BoardHazardManager,
  ): EnemyIntent {
    switch (this.phase) {
      case 1:
        return this.copperheadPhase1(hazardManager);
      case 2:
        return this.copperheadPhase2(hazardManager);
      default:
        return this.copperheadPhase2(hazardManager);
    }
  }

  /**
   * Phase 1 (100-50%): alternates brew / strike. Occasional block (coil).
   * Brew: poison 3 extra tiles (board-manipulation).
   * Strike: 15-20 damage + 2 bonus per poison tile on board.
   */
  private copperheadPhase1(hazardManager?: BoardHazardManager): EnemyIntent {
    const isBrew = this.turnParity % 2 === 0;

    if (isBrew) {
      // Brew turn -- mostly poison, small chance of coil (block)
      const options: { intent: EnemyIntent; weight: number }[] = [
        { intent: { type: 'board-manipulation', value: 3, description: 'POISON 3' }, weight: 4 },
        { intent: { type: 'block', value: 8, description: 'COIL +8' }, weight: 1 },
      ];
      return weightedRandom(options);
    }

    // Strike turn -- attack with bonus from poison tiles
    const poisonCount = hazardManager?.countHazards('poison') ?? 0;
    const baseDamage = 15 + Math.floor(Math.random() * 6); // 15-20
    const bonus = poisonCount * 2;
    const damage = baseDamage + bonus;
    return { type: 'attack', value: damage, description: `STRIKE ${damage}` };
  }

  /**
   * Phase 2 (50-0%): 20-25 damage strikes. Heavier aggression.
   * Board is flooded with poison + fool's gold from per-turn effects.
   */
  private copperheadPhase2(hazardManager?: BoardHazardManager): EnemyIntent {
    const poisonCount = hazardManager?.countHazards('poison') ?? 0;
    const baseDamage = 20 + Math.floor(Math.random() * 6); // 20-25
    const bonus = poisonCount * 2;
    const damage = baseDamage + bonus;

    const options: { intent: EnemyIntent; weight: number }[] = [
      { intent: { type: 'attack', value: damage, description: `STRIKE ${damage}` }, weight: 4 },
      { intent: { type: 'board-manipulation', value: 2, description: 'POISON 2' }, weight: 1 },
    ];

    return weightedRandom(options);
  }

  // ---------------------------------------------------------------------------
  // Iron Eye Isabella phase-specific AI
  // ---------------------------------------------------------------------------

  private chooseIsabellaIntent(_boss: Enemy): EnemyIntent {
    switch (this.phase) {
      case 1:
        return this.isabellaPhase1();
      case 2:
        return this.isabellaPhase2();
      case 3:
        return this.isabellaPhase3();
    }
  }

  /**
   * Phase 1 (100-65%): 20-25 damage strikes. Row locks + 10 passive block
   * are handled via per-turn effects, not intents.
   */
  private isabellaPhase1(): EnemyIntent {
    const damage = 20 + Math.floor(Math.random() * 6); // 20-25
    return { type: 'attack', value: damage, description: `ATK ${damage}` };
  }

  /**
   * Phase 2 (65-30%): 25-30 damage strikes. Hardened locks + warrants (suppress)
   * are handled via per-turn effects. Passive block continues.
   */
  private isabellaPhase2(): EnemyIntent {
    const damage = 25 + Math.floor(Math.random() * 6); // 25-30
    return { type: 'attack', value: damage, description: `ATK ${damage}` };
  }

  /**
   * Phase 3 (30-0%): 30-35 damage strikes. No blocking. Pure damage race.
   * Locks + poisons are handled via per-turn effects.
   */
  private isabellaPhase3(): EnemyIntent {
    const damage = 30 + Math.floor(Math.random() * 6); // 30-35
    return { type: 'attack', value: damage, description: `ATK ${damage}` };
  }

  private isabellaPerTurn(
    hazardManager: BoardHazardManager,
    boss?: Enemy,
    activeTileTypes?: TileType[],
  ): void {
    switch (this.phase) {
      case 1: {
        // Lock a random row each turn
        const row = Math.floor(Math.random() * 8);
        hazardManager.lockRow(row);
        // 10 passive block per turn
        boss?.addBlock(10);
        break;
      }
      case 2:
        // Hardened locks (need 2 adjacent matches to free) instead of row locks
        hazardManager.placeRandomHardenedLocks(2, 2);
        // Warrants -- suppress 2 tile types (refreshes each turn to keep 2 suppressed)
        if (activeTileTypes) {
          hazardManager.suppressRandomTypes(2, activeTileTypes, 2);
        }
        // Passive block continues in Phase 2
        boss?.addBlock(10);
        break;
      case 3:
        // Lockdown -- 2 locks + 2 poisons per turn. No passive block.
        hazardManager.placeRandomLocks(2);
        hazardManager.placeRandomPoison(2);
        break;
    }
  }

  /** Serialize boss controller state for mid-combat save. */
  serialize(): SerializedBossController {
    return {
      bossType: this.bossType,
      phase: this.phase,
      transitionTriggered: this.transitionTriggered,
      turnParity: this.turnParity,
    };
  }

  /** Restore boss controller state from a snapshot. */
  restoreState(data: SerializedBossController): void {
    this.phase = data.phase;
    this.transitionTriggered = data.transitionTriggered;
    this.turnParity = data.turnParity;
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
