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
import { useCombatStore } from '../../store/combatStore';
import { useRunStore } from '../../store/runStore';

const BOARD_TOP_OFFSET = 15;
const BOARD_Y_NUDGE = 8;

/**
 * Workaround for scene restart paths not reliably passing data to create().
 * Store data before requesting a run/restart, read in create() if the
 * parameter is missing.
 */
let pendingSceneData: { config?: CombatConfig; snapshot?: CombatSnapshot } | null = null;

/** Set scene data before requesting CombatScene to run or restart. */
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
  private boundOnScreenShake: (...args: unknown[]) => void;
  private boundOnTileParticles: (...args: unknown[]) => void;
  private boundOnDeadeyeShotVfx: (...args: unknown[]) => void;
  private particleBurstWindowStart = 0;
  private particleBurstsThisWindow = 0;

  constructor() {
    super({ key: 'CombatScene' });
    this.boundOnCombatEnd = this.onCombatEnd.bind(this);
    this.boundOnFlashLine = this.onFlashLine.bind(this);
    this.boundOnScreenShake = this.onScreenShake.bind(this);
    this.boundOnTileParticles = this.onTileParticles.bind(this);
    this.boundOnDeadeyeShotVfx = this.onDeadeyeShotVfx.bind(this);
  }

  create(data?: { config?: CombatConfig; snapshot?: CombatSnapshot }): void {
    const hadCreateArgData = !!data?.config || !!data?.snapshot;
    const hadPendingSceneData = !!pendingSceneData;
    const resolvedData = hadCreateArgData ? data : pendingSceneData ?? data;
    pendingSceneData = null;

    const act = useRunStore.getState().run?.currentAct ?? 1;
    const bootstrapMeta = {
      source: hadCreateArgData ? 'create-arg' : hadPendingSceneData ? 'pending-scene-data' : 'none',
      hasConfig: !!resolvedData?.config,
      hasSnapshot: !!resolvedData?.snapshot,
      sceneStatus: this.sys.settings.status,
      isSceneActive: this.scene.isActive(),
      act,
      hasActBackground: this.textures.exists(`act${act}_bg`),
      hasBoardBackground: this.textures.exists('board_bg'),
    };

    console.info('[combat] bootstrap start', bootstrapMeta);

    try {
      data = resolvedData;

      this.cameras.main.setRoundPixels(true);
      this.cameras.main.setBackgroundColor('#2a1a0e');

      // Combat background: boss-specific bg per act, regular uses act bg
      const isBoss = data?.config?.isBoss || data?.snapshot?.isBoss;
      const actBg = `act${act}_bg`;
      const bossBgMap: Record<number, string> = { 1: 'dusty_bg', 2: 'copperhead_bg', 3: 'ironeye_bg' };
      const bgCandidates = isBoss ? [bossBgMap[act], actBg] : [actBg, 'act1_bg'];
      const bgKey = bgCandidates.find(k => this.textures.exists(k));
      if (bgKey) {
        const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
        bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        bg.setDepth(-10);
        bg.setAlpha(0.4);
        // Photographic backgrounds look aliased under nearest-neighbor sampling
        // (pixelArt is scene-global); force LINEAR for this sprite only.
        bg.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else {
        // Fallback: solid color rectangle if no background texture loaded
        const fallback = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x3a2a1e);
        fallback.setDepth(-10);
      }

      this.screenShake = new ScreenShake(this);
      this.particleBurstWindowStart = 0;
      this.particleBurstsThisWindow = 0;

      // Clean up EventBus listeners when scene is stopped/restarted
      this.events.once('shutdown', this.shutdown, this);

      // Listen for events
      EventBus.on(GameEvent.COMBAT_END, this.boundOnCombatEnd);
      EventBus.on(GameEvent.FLASH_LINE, this.boundOnFlashLine);
      EventBus.on(GameEvent.SCREEN_SHAKE, this.boundOnScreenShake);
      EventBus.on(GameEvent.TILE_PARTICLES, this.boundOnTileParticles);
      EventBus.on(GameEvent.DEADEYE_SHOT_VFX, this.boundOnDeadeyeShotVfx);

      // Spacebar activates deadeye ability.
      // Also prevent default so space doesn't trigger focused UI buttons.
      this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
        event.preventDefault();
        if (useCombatStore.getState().uiOverlayOpen) return;
        EventBus.emit(GameEvent.ACTIVATE_ABILITY);
      });

      // Tab cycles enemy targets
      this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
        event.preventDefault();
        if (useCombatStore.getState().uiOverlayOpen) return;
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
    } catch (error) {
      console.error('[combat] bootstrap failed', bootstrapMeta, error);
      throw error;
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

    const { boardX, boardY, boardSize } = this.getBoardLayout();

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
    const { boardX, boardY, boardSize } = this.getBoardLayout();

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
    };
    this.combatManager = new CombatManager(this.board, config);

    // Restore the full combat state from snapshot
    this.combatManager.restoreFromSnapshot(snapshot);

    // Board is ready immediately (no intro animation on restore)
    this.board.setInputEnabled(true);
  }

  private getBoardLayout(): { boardX: number; boardY: number; boardSize: number } {
    const boardSize = 8 * TILE_SIZE;
    const boardX = Math.round((GAME_WIDTH - boardSize) / 2);
    const centeredY = BOARD_TOP_OFFSET + (GAME_HEIGHT - BOARD_TOP_OFFSET - boardSize) / 2;
    const boardY = Math.round(centeredY + BOARD_Y_NUDGE);
    return { boardX, boardY, boardSize };
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
    // Board background image behind the checkerboard, with a 2px black outline
    // via Phaser's preFX Glow pipeline (single FX, no duplicated sprites).
    if (this.textures.exists('board_bg')) {
      const bg = this.add.image(
        Math.round(x + size / 2),
        Math.round(y + size / 2),
        'board_bg',
      );
      bg.setDisplaySize(size + 114, size + 114);
      bg.setDepth(-2);
      // color, outerStrength, innerStrength, knockout, quality, distance
      bg.preFX?.addGlow(0x000000, 2, 0, false, 0.1, 2);
    }

    const cellSize = size / 8;
    const lightColor = 0xd2b48c; // tan
    const darkColor = 0x4a3520;  // dark brown
    const checker = this.add.graphics().setDepth(-1);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const color = (row + col) % 2 === 0 ? lightColor : darkColor;
        checker.fillStyle(color, 0.3);
        checker.fillRect(
          Math.round(x + col * cellSize),
          Math.round(y + row * cellSize),
          cellSize,
          cellSize,
        );
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

    const now = this.time.now;
    if (now - this.particleBurstWindowStart > 80) {
      this.particleBurstWindowStart = now;
      this.particleBurstsThisWindow = 0;
    }
    this.particleBurstsThisWindow++;

    const burstCount = this.particleBurstsThisWindow;
    const count = burstCount > 20
      ? 1
      : burstCount > 12
        ? 2
        : 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.5 ? 3 : 2;
      const particle = this.add
        .rectangle(Math.round(x), Math.round(y), size, size, color, 1)
        .setDepth(5);

      // Random direction + distance
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist = 12 + Math.random() * 15;
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
      const size = 2 + Math.floor(Math.random() * 4);
      const particle = this.add
        .rectangle(Math.round(x), Math.round(y), size, size, particleColor, 1)
        .setDepth(5);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const dist = 18 + Math.random() * 24;
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
      .circle(Math.round(x), Math.round(y), 5, 0x222222, 0.8)
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
    console.info('[combat] shutdown', {
      sceneStatus: this.sys.settings.status,
      isSceneActive: this.scene.isActive(),
    });
    EventBus.off(GameEvent.COMBAT_END, this.boundOnCombatEnd);
    EventBus.off(GameEvent.FLASH_LINE, this.boundOnFlashLine);
    EventBus.off(GameEvent.SCREEN_SHAKE, this.boundOnScreenShake);
    EventBus.off(GameEvent.TILE_PARTICLES, this.boundOnTileParticles);
    EventBus.off(GameEvent.DEADEYE_SHOT_VFX, this.boundOnDeadeyeShotVfx);
    this.screenShake?.destroy();
    this.combatManager?.destroy();
    this.board?.destroy();
  }
}
