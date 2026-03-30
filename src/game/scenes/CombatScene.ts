import Phaser from 'phaser';
import { Board } from '../board/Board';
import { CombatManager } from '../combat/CombatManager';
import type { CombatConfig, CombatResult } from '../combat/CombatManager';
import { EventBus, GameEvent } from '../EventBus';
import { GAME_WIDTH, GAME_HEIGHT } from '../GameConfig';
import { ACT1_ENEMIES } from '../../data/enemies';

/**
 * CombatScene: the main combat loop.
 * Owns the board, delegates combat flow to CombatManager,
 * and listens for board swap events to drive the turn sequence.
 */
export class CombatScene extends Phaser.Scene {
  board!: Board;
  combatManager!: CombatManager;

  constructor() {
    super({ key: 'CombatScene' });
  }

  create(data?: { config?: CombatConfig }): void {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Board: 8x8 of 32x32 tiles = 256x256, centered horizontally
    const boardX = Math.round((GAME_WIDTH - 256) / 2);
    const boardY = Math.round((GAME_HEIGHT - 256) / 2);
    this.board = new Board(this, boardX, boardY);

    // Build combat config from passed data or defaults
    const config: CombatConfig = data?.config ?? {
      enemies: [ACT1_ENEMIES.coyote],
      playerHealth: 100,
      playerMaxHealth: 100,
      playerGold: 0,
      activeTileTypes: ['bullet', 'iron', 'gold'],
      tileUpgrades: {},
      abilityCharge: 0,
    };

    this.combatManager = new CombatManager(this.board, config);

    // Wire board swap completion to combat manager
    this.setupSwapListener();

    // Start the first turn
    this.combatManager.startTurn();

    // Listen for combat end
    EventBus.on(GameEvent.COMBAT_END, this.onCombatEnd.bind(this) as (...args: unknown[]) => void);
  }

  /**
   * Override the board's input so that swaps route through CombatManager.
   * The board handles selection/adjacency; we intercept the trySwap result.
   */
  private setupSwapListener(): void {
    // The board already handles swap input internally via trySwap.
    // We listen for SWAPS_CHANGE events to track the flow.
    EventBus.on(GameEvent.SWAPS_CHANGE, (() => {
      // Board swap was attempted -- state update will propagate through CombatManager
    }) as (...args: unknown[]) => void);
  }

  private onCombatEnd(...args: unknown[]): void {
    const result = args[0] as CombatResult;
    if (result.victory) {
      // Disable board input on victory
      this.board.setInputEnabled(false);
    }
    // Scene transition handled by the higher-level game flow
  }

  update(_time: number, _delta: number): void {
    this.board.update();
  }

  shutdown(): void {
    EventBus.off(GameEvent.COMBAT_END, this.onCombatEnd.bind(this) as (...args: unknown[]) => void);
  }
}
