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
 *
 * Started on demand when navigating to a combat node.
 * Stopped when combat ends and the player returns to the map.
 */
export class CombatScene extends Phaser.Scene {
  board!: Board;
  combatManager!: CombatManager;
  private boundOnCombatEnd: (...args: unknown[]) => void;

  constructor() {
    super({ key: 'CombatScene' });
    this.boundOnCombatEnd = this.onCombatEnd.bind(this);
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

    // Board: 8x8 of 32x32 tiles = 256x256, centered horizontally
    const boardX = Math.round((GAME_WIDTH - 256) / 2);
    const boardY = Math.round((GAME_HEIGHT - 256) / 2);
    this.board = new Board(this, boardX, boardY, config.activeTileTypes);

    this.combatManager = new CombatManager(this.board, config);

    // Listen for combat end
    EventBus.on(GameEvent.COMBAT_END, this.boundOnCombatEnd);

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

  shutdown(): void {
    EventBus.off(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    this.combatManager?.destroy();
    this.board?.destroy();
  }
}
