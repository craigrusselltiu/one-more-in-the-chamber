import type { EnemyDefinition } from '../../types/combat';
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
 *   Phase 3 (25-0%): Locks every turn. No blocking. 15-20 damage.
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

    // Transition at 50%: clear ALL statuses, "SHED SKIN", lock edge tiles
    if (hpRatio <= 0.5 && !this.transitionTriggered) {
      this.transitionTriggered = true;
      this.phase = 2;

      boss.clearAllStatuses();

      // Lock all edge tiles
      hazardManager.lockEdges();

      return true;
    }

    return false;
  }

  private checkIsabellaTransition(_boss: Enemy): boolean {
    // Isabella uses standard hpTriggers for her 50% phase transition.
    return false;
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

  private dustyDanPerTurn(hazardManager: BoardHazardManager, _board?: Board): void {
    // Gravity shift is handled by Dan's move actions, not here
    this.turnParity++;

    switch (this.phase) {
      case 1:
        hazardManager.placeRandomLocks(1);
        break;
      case 2:
        hazardManager.placeRandomLocks(3);
        break;
      case 3:
        hazardManager.placeRandomLocks(1);
        break;
    }
  }

  private copperheadPerTurn(_hazardManager: BoardHazardManager): void {
    // All effects handled by Copperhead's move actions
    this.turnParity++;
  }

  private isabellaPerTurn(
    _hazardManager: BoardHazardManager,
    boss?: Enemy,
    _activeTileTypes?: TileType[],
  ): void {
    // Passive: gain 10 block per turn
    boss?.addBlock(10);
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
