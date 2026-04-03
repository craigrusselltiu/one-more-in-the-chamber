import Phaser from 'phaser';
import { Board } from '../board/Board';
import { CombatManager } from '../combat/CombatManager';
import type { CombatConfig, CombatResult } from '../combat/CombatManager';
import type { CombatSnapshot } from '../../types/combatSnapshot';
import { EventBus, GameEvent } from '../EventBus';
import { GAME_WIDTH, GAME_HEIGHT } from '../GameConfig';
import { TILE_SIZE } from '../board/Tile';
import { TILE_COLORS, STARTER_POOL, ADDITIONAL_POOL } from '../../data/tiles';
import { ACT1_ENEMIES } from '../../data/enemies';
import { ScreenShake } from '../effects/ScreenShake';
import type { ShakeIntensity } from '../effects/ScreenShake';
import type { GridPosition } from '../../types/combat';
import type { TileType } from '../../types/game';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * CombatScene: the main combat loop.
 * Owns the board, delegates combat flow to CombatManager,
 * and listens for board swap events to drive the turn sequence.
 *
 * Started on demand when navigating to a combat node.
 * Stopped when combat ends and the player returns to the map.
 *
 * Supports two modes:
 *   - Fresh start: `data.config` provided, board and combat init from scratch.
 *   - Restore: `data.snapshot` provided, combat state rebuilt from mid-combat save.
 */
export class CombatScene extends Phaser.Scene {
  board!: Board;
  combatManager!: CombatManager;
  private screenShake!: ScreenShake;
  private boundOnCombatEnd: (...args: unknown[]) => void;
  private boundOnFlashLine: (...args: unknown[]) => void;
  private boundOnFlashLineToEnemy: (...args: unknown[]) => void;
  private boundOnScreenShake: (...args: unknown[]) => void;
  private boundOnTileParticles: (...args: unknown[]) => void;

  constructor() {
    super({ key: 'CombatScene' });
    this.boundOnCombatEnd = this.onCombatEnd.bind(this);
    this.boundOnFlashLine = this.onFlashLine.bind(this);
    this.boundOnFlashLineToEnemy = this.onFlashLineToEnemy.bind(this);
    this.boundOnScreenShake = this.onScreenShake.bind(this);
    this.boundOnTileParticles = this.onTileParticles.bind(this);
  }

  create(data?: { config?: CombatConfig; snapshot?: CombatSnapshot }): void {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Combat background image (boss uses dusty_bg, regular uses act bg)
    const isBoss = data?.config?.isBoss || data?.snapshot?.isBoss;
    const bgKey = isBoss && this.textures.exists('dusty_bg') ? 'dusty_bg' : 'act1_bg';
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(-10);
      bg.setAlpha(0.4);
    }

    this.screenShake = new ScreenShake(this);

    // Clean up EventBus listeners when scene is stopped/restarted
    this.events.on('shutdown', this.shutdown, this);

    // Listen for events
    EventBus.on(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.on(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.on(GameEvent.FLASH_LINE_TO_ENEMY, this.boundOnFlashLineToEnemy);
    EventBus.on(GameEvent.SCREEN_SHAKE, this.boundOnScreenShake);
    EventBus.on(GameEvent.TILE_PARTICLES, this.boundOnTileParticles);

    // Spacebar activates deadeye ability.
    // Also prevent default so space doesn't trigger focused UI buttons.
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    });

    if (data?.snapshot) {
      this.restoreFromSnapshot(data.snapshot);
    } else {
      this.startFresh(data?.config);
    }
  }

  /** Normal combat start: init board, run intro animation, start turn 1. */
  private startFresh(config?: CombatConfig): void {
    const combatConfig: CombatConfig = config ?? {
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

    const boardSize = 8 * TILE_SIZE;
    const boardX = Math.round((GAME_WIDTH - boardSize) / 2);
    // Offset board below the top bar area (~10px in Phaser coords)
    const topOffset = 10;
    const boardY = Math.round(topOffset + (GAME_HEIGHT - topOffset - boardSize) / 2);

    // Checkered grid background behind the board
    this.drawCheckerboard(boardX, boardY, boardSize);

    this.board = new Board(this, boardX, boardY, combatConfig.activeTileTypes);

    // Transform mirage tiles into a random unowned tile type for this combat
    this.board.transformMirageTiles([...STARTER_POOL, ...ADDITIONAL_POOL]);

    this.combatManager = new CombatManager(this.board, combatConfig);

    // Disable input during intro, then start combat
    this.board.setInputEnabled(false);
    this.board.playIntroAnimation().then(() => {
      this.board.setInputEnabled(true);
      this.combatManager.startTurn();
    });
  }

  /**
   * Restore combat from a mid-combat save snapshot.
   * Rebuilds board and combat manager from serialized state.
   */
  private restoreFromSnapshot(snapshot: CombatSnapshot): void {
    const boardSize = 8 * TILE_SIZE;
    const boardX = Math.round((GAME_WIDTH - boardSize) / 2);
    // Offset board below the top bar area (~10px in Phaser coords)
    const topOffset = 10;
    const boardY = Math.round(topOffset + (GAME_HEIGHT - topOffset - boardSize) / 2);

    this.drawCheckerboard(boardX, boardY, boardSize);

    this.board = new Board(this, boardX, boardY, snapshot.board.activeTileTypes);

    // Create combat manager with a minimal config (state will be overwritten)
    const config: CombatConfig = {
      enemies: snapshot.enemies.map((e) => e.definition),
      playerHealth: snapshot.player.health,
      playerMaxHealth: snapshot.player.maxHealth,
      playerGold: snapshot.player.gold,
      activeTileTypes: snapshot.player.activeTileTypes,
      tileUpgrades: snapshot.player.tileUpgrades,
      abilityCharge: snapshot.player.abilityCharge,
      artifacts: snapshot.artifacts,
      traitCounts: snapshot.traitCounts,
      isBoss: snapshot.isBoss,
      turnLimit: snapshot.turnLimit,
      timedFailureDamage: snapshot.timedFailureDamage,
    };
    this.combatManager = new CombatManager(this.board, config);

    // Restore the full combat state from snapshot
    this.combatManager.restoreFromSnapshot(snapshot);

    // Board is ready immediately (no intro animation on restore)
    this.board.setInputEnabled(true);
  }

  private onCombatEnd(...args: unknown[]): void {
    const result = args[0] as CombatResult;
    if (result.victory) {
      // Disable board input on victory
      this.board.setInputEnabled(false);
    }
    // Scene transition handled by App.tsx
  }

  /** Draw an 8x8 checkered grid behind the board for visual clarity. */
  private drawCheckerboard(x: number, y: number, size: number): void {
    const cellSize = size / 8;
    const lightColor = 0xd2b48c; // tan
    const darkColor = 0xb8956a;  // slightly darker tan
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const color = (row + col) % 2 === 0 ? lightColor : darkColor;
        this.add
          .rectangle(
            Math.round(x + col * cellSize + cellSize / 2),
            Math.round(y + row * cellSize + cellSize / 2),
            cellSize,
            cellSize,
            color,
            0.3,
          )
          .setDepth(-1);
      }
    }
  }

  private onScreenShake(...args: unknown[]): void {
    if (!useSettingsStore.getState().screenShakeEnabled) return;
    const intensity = args[0] as ShakeIntensity;
    this.screenShake.shake(intensity);
  }

  update(_time: number, _delta: number): void {
    this.board?.update();
  }

  /** Flash a line between two board positions, colored by tile type. */
  private onFlashLine(...args: unknown[]): void {
    if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
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

  /** Flash a line from a board position to the targeted enemy's center. */
  private onFlashLineToEnemy(...args: unknown[]): void {
    if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
    const from = args[0] as GridPosition;
    const tileType = args[1] as TileType;
    const enemyIndex = (args[2] as number) ?? 0;
    const enemyCount = (args[3] as number) ?? 1;
    const origin = this.board.getOrigin();
    const x1 = origin.x + from.col * TILE_SIZE + TILE_SIZE / 2;
    const y1 = origin.y + from.row * TILE_SIZE + TILE_SIZE / 2;

    // Enemy area: centered between board right edge and screen right
    const boardRight = origin.x + 8 * TILE_SIZE;
    const x2 = Math.round((boardRight + GAME_WIDTH) / 2);

    // Enemies are stacked vertically, centered in the combat area.
    // Each panel is ~32px tall in Phaser coords with ~2px gap.
    const panelHeight = 32;
    const gap = 2;
    const totalHeight = enemyCount * panelHeight + (enemyCount - 1) * gap;
    const areaCenter = GAME_HEIGHT / 2;
    const stackTop = areaCenter - totalHeight / 2;
    const y2 = Math.round(stackTop + enemyIndex * (panelHeight + gap) + panelHeight / 2);

    this.drawFlashLine(x1, y1, x2, y2, tileType);
  }

  private drawFlashLine(x1: number, y1: number, x2: number, y2: number, tileType: TileType): void {
    const colorHex = TILE_COLORS[tileType] ?? '#ffffff';
    const color = parseInt(colorHex.replace('#', ''), 16);
    const line = this.add.line(0, 0, x1, y1, x2, y2, color, 0.8).setOrigin(0).setDepth(10);
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 1000,
      onComplete: () => line.destroy(),
    });
  }

  /**
   * Spawn a small burst of colored particles at the given world position.
   * Uses simple rectangles as particles for pixel-art consistency.
   */
  private onTileParticles(...args: unknown[]): void {
    if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
    const x = args[0] as number;
    const y = args[1] as number;
    const colorHex = args[2] as string;
    const color = parseInt(colorHex.replace('#', ''), 16);

    // Create 4-6 tiny rectangles that fly outward and fade
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.5 ? 2 : 1;
      const particle = this.add
        .rectangle(Math.round(x), Math.round(y), size, size, color, 1)
        .setDepth(5);

      // Random direction + distance
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist = 8 + Math.random() * 10;
      const targetX = Math.round(x + Math.cos(angle) * dist);
      const targetY = Math.round(y + Math.sin(angle) * dist);

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 200 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Floating numbers are rendered by React (FloatingNumbers component in CombatHUD)

  shutdown(): void {
    EventBus.off(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.off(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.off(GameEvent.FLASH_LINE_TO_ENEMY, this.boundOnFlashLineToEnemy);
    EventBus.off(GameEvent.SCREEN_SHAKE, this.boundOnScreenShake);
    EventBus.off(GameEvent.TILE_PARTICLES, this.boundOnTileParticles);
    this.screenShake?.destroy();
    this.combatManager?.destroy();
    this.board?.destroy();
  }
}
