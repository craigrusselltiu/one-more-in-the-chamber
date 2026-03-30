import type { Board } from '../board/Board';
import type { CombatState, CombatPhase } from '../../types/combat';
import { EventBus, GameEvent } from '../EventBus';

/**
 * CombatManager: turn flow orchestration.
 * Manages turn start -> consumable window -> swap phase -> turn end -> enemy turn.
 */
export class CombatManager {
  private board: Board;
  private state: CombatState;

  constructor(_scene: unknown, board: Board) {
    this.board = board;
    this.state = this.createInitialState();
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

  getState(): CombatState {
    return this.state;
  }

  startTurn(): void {
    this.state.turnNumber++;
    this.state.swapsRemaining = this.state.swapsPerTurn;
    this.state.playerBlock = 0;
    this.state.abilityCharge++;
    this.state.phase = 'consumable-window';
    EventBus.emit(GameEvent.TURN_START, this.state);
  }

  enterSwapPhase(): void {
    this.state.phase = 'swap-phase';
    this.emitUpdate();
  }

  async performSwap(_fromRow: number, _fromCol: number, _toRow: number, _toCol: number): Promise<void> {
    if (this.state.swapsRemaining <= 0 || this.state.phase !== 'swap-phase') return;
    this.state.swapsRemaining--;
    this.state.phase = 'resolving';
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
    this.emitUpdate();
    // TODO: venom ticks, enemy actions
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
