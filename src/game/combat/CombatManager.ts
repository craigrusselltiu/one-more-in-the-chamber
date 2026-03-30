import type { Board } from '../board/Board';
import type { CombatState, CombatPhase, EnemyState } from '../../types/combat';
import { EventBus, GameEvent } from '../EventBus';

/**
 * CombatManager: turn flow orchestration.
 * Manages turn start -> consumable window -> swap phase -> turn end -> enemy turn.
 * Emits granular events so the React HUD stays in sync.
 */
export class CombatManager {
  private board: Board;
  private state: CombatState;

  constructor(_scene: unknown, board: Board) {
    this.board = board;
    this.state = this.createInitialState();
    this.listenForPlayerActions();
  }

  private createInitialState(): CombatState {
    return {
      turnNumber: 0,
      swapsRemaining: 2,
      swapsPerTurn: 2,
      playerBlock: 0,
      dodgeChance: 0,
      aceMultiplier: 1.0,
      critChance: 0,
      thorns: 0,
      enemies: [],
      targetedEnemyIndex: 0,
      phase: 'turn-start',
      abilityCharge: 0,
      abilityThreshold: 10,
      isDeadeyeActive: false,
      deadeyeShotsRemaining: 0,
    };
  }

  /** Wire up React -> Phaser actions via EventBus. */
  private listenForPlayerActions(): void {
    EventBus.on(GameEvent.TARGET_ENEMY, (...args: unknown[]) => {
      const index = args[0] as number;
      if (index >= 0 && index < this.state.enemies.length) {
        this.state.targetedEnemyIndex = index;
        this.emitUpdate();
      }
    });

    EventBus.on(GameEvent.USE_CONSUMABLE, (..._args: unknown[]) => {
      if (this.state.phase !== 'consumable-window') return;
      // TODO: resolve consumable effect using _args[0] as slot index
    });

    EventBus.on(GameEvent.ACTIVATE_ABILITY, () => {
      if (this.state.phase !== 'swap-phase') return;
      if (this.state.abilityCharge < this.state.abilityThreshold) return;
      this.state.abilityCharge -= this.state.abilityThreshold;
      this.state.isDeadeyeActive = true;
      this.state.deadeyeShotsRemaining = 3;
      this.emitUpdate();
      EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.state.abilityCharge, this.state.abilityThreshold);
    });

    EventBus.on(GameEvent.END_TURN_EARLY, () => {
      if (this.state.phase === 'swap-phase' || this.state.phase === 'consumable-window') {
        this.endTurn();
      }
    });
  }

  getState(): CombatState {
    return this.state;
  }

  /** Initialize combat with enemy list. */
  initCombat(enemies: EnemyState[]): void {
    this.state = this.createInitialState();
    this.state.enemies = enemies;
    EventBus.emit(GameEvent.COMBAT_START, this.state);
    this.emitUpdate();
    this.startTurn();
  }

  startTurn(): void {
    this.state.turnNumber++;
    this.state.swapsRemaining = this.state.swapsPerTurn;
    this.state.playerBlock = 0;
    this.state.abilityCharge++;
    this.state.phase = 'consumable-window';

    EventBus.emit(GameEvent.TURN_START, this.state);
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.state.swapsRemaining, this.state.swapsPerTurn);
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.state.abilityCharge, this.state.abilityThreshold);
  }

  enterSwapPhase(): void {
    this.state.phase = 'swap-phase';
    this.emitUpdate();
  }

  async performSwap(_fromRow: number, _fromCol: number, _toRow: number, _toCol: number): Promise<void> {
    if (this.state.swapsRemaining <= 0 || this.state.phase !== 'swap-phase') return;
    this.state.swapsRemaining--;
    this.state.phase = 'resolving';
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.state.swapsRemaining, this.state.swapsPerTurn);
    this.emitUpdate();

    // TODO: validate adjacent, swap tiles, resolve matches/cascades, apply resources
    await this.board.resolveMatches();
    // TODO: process ResourceResolver for each match

    if (this.state.swapsRemaining <= 0) {
      this.endTurn();
    } else {
      this.state.phase = 'swap-phase';
      this.emitUpdate();
    }
  }

  endTurn(): void {
    this.state.phase = 'enemy-turn';
    EventBus.emit(GameEvent.TURN_END, this.state);
    this.emitUpdate();

    // Venom ticks
    for (const enemy of this.state.enemies) {
      if (enemy.venomStacks > 0 && !enemy.isDead) {
        enemy.health = Math.max(0, enemy.health - enemy.venomStacks);
        enemy.venomStacks--;
        if (enemy.health <= 0) enemy.isDead = true;
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, enemy);
      }
    }

    // Check if all enemies dead
    if (this.state.enemies.every((e) => e.isDead)) {
      this.state.phase = 'combat-end';
      EventBus.emit(GameEvent.COMBAT_END, true);
      return;
    }

    // TODO: enemy actions (left to right)

    // Next turn
    this.state.phase = 'turn-start';
    this.startTurn();
  }

  setPhase(phase: CombatPhase): void {
    this.state.phase = phase;
    this.emitUpdate();
  }

  private emitUpdate(): void {
    EventBus.emit(GameEvent.COMBAT_STATE_UPDATE, this.state);
  }
}
