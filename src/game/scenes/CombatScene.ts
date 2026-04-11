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

/** Get the center position of an enemy slot in the 960x540 virtual space. */
function getEnemySlotPosition(aliveIndex: number): { x: number; y: number } {
  // Alive index -> visual slot: 0->center(1), 1->top(0), 2->bottom(2)
  const SLOT_MAP = [1, 0, 2];
  const slot = SLOT_MAP[aliveIndex] ?? 1;
  const SLOT_X = [772, 920, 772];
  const SLOT_Y = [150, 280, 410];
  return { x: SLOT_X[slot] ?? 900, y: SLOT_Y[slot] ?? 280 };
}
import { useCombatStore } from '../../store/combatStore';
import { useRunStore } from '../../store/runStore';

/**
 * Workaround for Phaser scene.start() not reliably passing data to create()
 * when restarting a previously-stopped scene. Store data before starting,
 * read in create() if the parameter is missing.
 */
let pendingSceneData: { config?: CombatConfig; snapshot?: CombatSnapshot } | null = null;

/** Set scene data before calling game.scene.start('CombatScene'). */
export function setCombatSceneData(data: { config?: CombatConfig; snapshot?: CombatSnapshot }): void {
  pendingSceneData = data;
}

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
  private boundOnDeadeyeShotVfx: (...args: unknown[]) => void;

  constructor() {
    super({ key: 'CombatScene' });
    this.boundOnCombatEnd = this.onCombatEnd.bind(this);
    this.boundOnFlashLine = this.onFlashLine.bind(this);
    this.boundOnFlashLineToEnemy = this.onFlashLineToEnemy.bind(this);
    this.boundOnScreenShake = this.onScreenShake.bind(this);
    this.boundOnTileParticles = this.onTileParticles.bind(this);
    this.boundOnDeadeyeShotVfx = this.onDeadeyeShotVfx.bind(this);
  }

  create(data?: { config?: CombatConfig; snapshot?: CombatSnapshot }): void {
    // Phaser may not pass data on scene restart; use module-level fallback
    if (!data?.config && !data?.snapshot && pendingSceneData) {
      data = pendingSceneData;
    }
    pendingSceneData = null;

    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2a1a0e');

    // Combat background: boss-specific bg per act, regular uses act bg
    const isBoss = data?.config?.isBoss || data?.snapshot?.isBoss;
    const act = useRunStore.getState().run?.currentAct ?? 1;
    const actBg = `act${act}_bg`;
    const bossBgMap: Record<number, string> = { 1: 'dusty_bg', 2: 'copperhead_bg', 3: 'ironeye_bg' };
    const bgCandidates = isBoss ? [bossBgMap[act], actBg] : [actBg, 'act1_bg'];
    const bgKey = bgCandidates.find(k => this.textures.exists(k));
    if (bgKey) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(-10);
      bg.setAlpha(0.4);
    } else {
      // Fallback: solid color rectangle if no background texture loaded
      const fallback = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x3a2a1e);
      fallback.setDepth(-10);
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
    EventBus.on(GameEvent.DEADEYE_SHOT_VFX, this.boundOnDeadeyeShotVfx);

    // Spacebar activates deadeye ability.
    // Also prevent default so space doesn't trigger focused UI buttons.
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    });

    // Tab cycles enemy targets
    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      const store = useCombatStore.getState();
      const alive = store.enemies.filter((e) => !e.isDead);
      if (alive.length <= 1) return;
      const currentIdx = store.targetedEnemyIndex;
      const nextIdx = (currentIdx + 1) % store.enemies.length;
      // Skip dead enemies
      let idx = nextIdx;
      for (let i = 0; i < store.enemies.length; i++) {
        if (!store.enemies[idx]?.isDead) break;
        idx = (idx + 1) % store.enemies.length;
      }
      EventBus.emit(GameEvent.TARGET_ENEMY, idx);
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
      character: 'red_panda',
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
    }).catch(() => {
      // Fallback: if intro animation fails (e.g. scene restarted mid-tween),
      // still enable input and start the turn so the player isn't stuck.
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
      character: snapshot.character ?? 'red_panda',
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
    // Board background image behind the checkerboard
    if (this.textures.exists('board_bg')) {
      const bg = this.add.image(Math.round(x + size / 2), Math.round(y + size / 2), 'board_bg');
      bg.setDisplaySize(size + 72, size + 72);
      bg.setDepth(-2);
    }

    const cellSize = size / 8;
    const lightColor = 0xd2b48c; // tan
    const darkColor = 0x4a3520;  // dark brown
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
    const origin = this.board.getOrigin();
    const x1 = origin.x + from.col * TILE_SIZE + TILE_SIZE / 2;
    const y1 = origin.y + from.row * TILE_SIZE + TILE_SIZE / 2;

    const pos = getEnemySlotPosition(enemyIndex);
    this.drawFlashLine(x1, y1, pos.x, pos.y, tileType);
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

  /**
   * Enhanced VFX for a Deadeye shot:
   *  - Bigger particle burst (more particles, mix of tile color + white)
   *  - Bullet hole at tile position that fades after ~1s
   *  - Light screen shake
   */
  private onDeadeyeShotVfx(...args: unknown[]): void {
    if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
    const x = args[0] as number;
    const y = args[1] as number;
    const colorHex = args[2] as string;
    const color = parseInt(colorHex.replace('#', ''), 16);

    // Enhanced particle burst: 10-14 particles (vs 4-6 for standard clears)
    const count = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      // Alternate between tile color and white for the "mix" effect
      const useWhite = i % 3 === 0;
      const particleColor = useWhite ? 0xffffff : color;
      const size = 1 + Math.floor(Math.random() * 3); // 1-3px (bigger than standard 1-2px)
      const particle = this.add
        .rectangle(Math.round(x), Math.round(y), size, size, particleColor, 1)
        .setDepth(5);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist = 12 + Math.random() * 16; // farther spread than standard (8-18 -> 12-28)
      const targetX = Math.round(x + Math.cos(angle) * dist);
      const targetY = Math.round(y + Math.sin(angle) * dist);

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 250 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    // Bullet hole: dark circle that fades after ~1s
    const hole = this.add
      .circle(Math.round(x), Math.round(y), 3, 0x222222, 0.8)
      .setDepth(4);
    this.tweens.add({
      targets: hole,
      alpha: 0,
      duration: 1000,
      delay: 200,
      ease: 'Power2',
      onComplete: () => hole.destroy(),
    });

    // Light screen shake
    this.screenShake.shake('light');
  }

  // Floating numbers are rendered by React (FloatingNumbers component in CombatHUD)

  shutdown(): void {
    EventBus.off(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.off(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.off(GameEvent.FLASH_LINE_TO_ENEMY, this.boundOnFlashLineToEnemy);
    EventBus.off(GameEvent.SCREEN_SHAKE, this.boundOnScreenShake);
    EventBus.off(GameEvent.TILE_PARTICLES, this.boundOnTileParticles);
    EventBus.off(GameEvent.DEADEYE_SHOT_VFX, this.boundOnDeadeyeShotVfx);
    this.screenShake?.destroy();
    this.combatManager?.destroy();
    this.board?.destroy();
  }
}
