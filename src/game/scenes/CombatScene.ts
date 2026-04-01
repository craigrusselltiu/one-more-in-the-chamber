import Phaser from 'phaser';
import { Board } from '../board/Board';
import { CombatManager } from '../combat/CombatManager';
import type { CombatConfig, CombatResult } from '../combat/CombatManager';
import { EventBus, GameEvent } from '../EventBus';
import { GAME_WIDTH, GAME_HEIGHT } from '../GameConfig';
import { TILE_SIZE } from '../board/Tile';
import { TILE_COLORS } from '../../data/tiles';
import { ACT1_ENEMIES } from '../../data/enemies';
import type { GridPosition } from '../../types/combat';
import type { TileType } from '../../types/game';

/**
 * CombatScene: the main combat loop.
 * Owns the board, delegates combat flow to CombatManager,
 * and listens for board swap events to drive the turn sequence.
 *
 * Started on demand when navigating to a combat node.
 * Stopped when combat ends and the player returns to the map.
 */
export class CombatScene extends Phaser.Scene {
  board!: Board;
  combatManager!: CombatManager;
  private boundOnCombatEnd: (...args: unknown[]) => void;
  private boundOnFlashLine: (...args: unknown[]) => void;
  private boundOnFlashLineToEnemy: (...args: unknown[]) => void;

  constructor() {
    super({ key: 'CombatScene' });
    this.boundOnCombatEnd = this.onCombatEnd.bind(this);
    this.boundOnFlashLine = this.onFlashLine.bind(this);
    this.boundOnFlashLineToEnemy = this.onFlashLineToEnemy.bind(this);
  }

  create(data?: { config?: CombatConfig }): void {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Build combat config from passed data or defaults
    const config: CombatConfig = data?.config ?? {
      enemies: [ACT1_ENEMIES.coyote],
      playerHealth: 100,
      playerMaxHealth: 100,
      playerGold: 0,
      activeTileTypes: ['bullet', 'iron', 'gold'],
      tileUpgrades: {},
      abilityCharge: 0,
      artifacts: [],
      traitCounts: {},
    };

    // Board: 8x8 of 28x28 tiles = 224x224, centered
    const boardX = Math.round((GAME_WIDTH - 224) / 2);
    const boardY = Math.round((GAME_HEIGHT - 224) / 2);
    this.board = new Board(this, boardX, boardY, config.activeTileTypes);

    this.combatManager = new CombatManager(this.board, config);

    // Listen for events
    EventBus.on(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.on(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.on(GameEvent.FLASH_LINE_TO_ENEMY, this.boundOnFlashLineToEnemy);

    // Disable input during intro, then start combat
    this.board.setInputEnabled(false);
    this.board.playIntroAnimation().then(() => {
      this.board.setInputEnabled(true);
      this.combatManager.startTurn();
    });
  }

  private onCombatEnd(...args: unknown[]): void {
    const result = args[0] as CombatResult;
    if (result.victory) {
      // Disable board input on victory
      this.board.setInputEnabled(false);
    }
    // Scene transition handled by App.tsx
  }

  update(_time: number, _delta: number): void {
    this.board?.update();
  }

  /** Flash a line between two board positions, colored by tile type. */
  private onFlashLine(...args: unknown[]): void {
    const from = args[0] as GridPosition;
    const to = args[1] as GridPosition;
    const tileType = args[2] as TileType;
    const origin = this.board.getOrigin();
    const x1 = origin.x + from.col * TILE_SIZE + TILE_SIZE / 2;
    const y1 = origin.y + from.row * TILE_SIZE + TILE_SIZE / 2;
    const x2 = origin.x + to.col * TILE_SIZE + TILE_SIZE / 2;
    const y2 = origin.y + to.row * TILE_SIZE + TILE_SIZE / 2;
    this.drawFlashLine(x1, y1, x2, y2, tileType);
  }

  /** Flash a line from a board position toward the right side (enemy area). */
  private onFlashLineToEnemy(...args: unknown[]): void {
    const from = args[0] as GridPosition;
    const tileType = args[1] as TileType;
    const origin = this.board.getOrigin();
    const x1 = origin.x + from.col * TILE_SIZE + TILE_SIZE / 2;
    const y1 = origin.y + from.row * TILE_SIZE + TILE_SIZE / 2;
    // Target: right edge of board area
    const x2 = origin.x + 8 * TILE_SIZE + 16;
    const y2 = y1;
    this.drawFlashLine(x1, y1, x2, y2, tileType);
  }

  private drawFlashLine(x1: number, y1: number, x2: number, y2: number, tileType: TileType): void {
    const colorHex = TILE_COLORS[tileType] ?? '#ffffff';
    const color = parseInt(colorHex.replace('#', ''), 16);
    const line = this.add.line(0, 0, x1, y1, x2, y2, color, 0.8).setOrigin(0).setDepth(10);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 500,
      onComplete: () => line.destroy(),
    });
  }

  shutdown(): void {
    EventBus.off(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.off(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.off(GameEvent.FLASH_LINE_TO_ENEMY, this.boundOnFlashLineToEnemy);
    this.combatManager?.destroy();
    this.board?.destroy();
  }
}
