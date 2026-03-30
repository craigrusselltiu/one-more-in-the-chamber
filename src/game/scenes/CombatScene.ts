import Phaser from 'phaser';
import { Board } from '../board/Board';
import { CombatManager } from '../combat/CombatManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../GameConfig';

/**
 * CombatScene: the main combat loop.
 * Owns the board, player/enemy sprites, and combat flow.
 */
export class CombatScene extends Phaser.Scene {
  board!: Board;
  combatManager!: CombatManager;

  constructor() {
    super({ key: 'CombatScene' });
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Background fill
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Board: 8x8 of 32x32 tiles = 256x256, centered horizontally
    const boardX = Math.round((GAME_WIDTH - 256) / 2);
    const boardY = Math.round((GAME_HEIGHT - 256) / 2);
    this.board = new Board(this, boardX, boardY);

    this.combatManager = new CombatManager(this, this.board);
  }

  update(_time: number, _delta: number): void {
    this.board.update();
  }
}
