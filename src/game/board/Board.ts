import Phaser from 'phaser';
import { Tile, TILE_SIZE, type TileEffectFrame } from './Tile';
import { MatchDetector } from './MatchDetector';
import { CascadeResolver } from './CascadeResolver';
import type { GravityDirection } from './CascadeResolver';
import type { TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import type { GridPosition, MatchResult, DestroyedTileInfo } from '../../types/combat';
import type { SerializedBoard, SerializedTile } from '../../types/combatSnapshot';
import { EventBus, GameEvent } from '../EventBus';
import { TILE_COLORS } from '../../data/tiles';
import { playMatch } from '../../services/sfx';
import { useMetaStore } from '../../store/metaStore';

const BOARD_SIZE = 8;

export interface SwapResult {
  valid: boolean;
  matches: MatchResult[];
}

/**
 * Board: 8x8 grid manager.
 * Handles tile creation, swap input, match detection, cascade resolution,
 * explosive/showdown spawning, and no-valid-moves reshuffling.
 */
export class Board {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private grid: (Tile | null)[][] = [];
  private matchDetector: MatchDetector;
  private cascadeResolver: CascadeResolver;
  private activeTileTypes: TileType[] = ['bullet', 'iron', 'gold'];
  /** Explosive tile radius (1 = 3x3, 2 = 5x5). Set by Sapper trait. */
  private _explosiveRadius = 1;
  /** Bag-based tile generation: one of each active type, shuffled. Refilled when empty. */
  private tileTypeBag: TileType[] = [];
  /** If mirage is active, the type it transformed into for this combat. */
  private mirageReplacementType: TileType | null = null;
  private effectTiles = new Set<Tile>();

  getMirageType(): TileType | null {
    return this.mirageReplacementType;
  }
  private isResolving = false;
  private selectedTile: GridPosition | null = null;
  private inputEnabled = true;

  /** Mask graphics that clips tiles to the board bounds. */
  private boardMask: Phaser.Display.Masks.GeometryMask;

  constructor(scene: Phaser.Scene, x: number, y: number, tileTypes?: TileType[]) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.matchDetector = new MatchDetector();
    this.cascadeResolver = new CascadeResolver();
    if (tileTypes) this.activeTileTypes = tileTypes;

    // Create a rectangle mask so tiles outside the board bounds are clipped
    const maskShape = scene.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(x, y, BOARD_SIZE * TILE_SIZE, BOARD_SIZE * TILE_SIZE);
    maskShape.setVisible(false);
    this.boardMask = new Phaser.Display.Masks.GeometryMask(scene, maskShape);

    this.initGrid();
    this.setupInput();
  }

  // -- Grid initialization --

  /** Create a tile and apply the board mask to it. */
  private createTile(x: number, y: number, type: TileType, row: number, col: number): Tile {
    const tile = new Tile(this.scene, x, y, type, row, col, this.setEffectTileActive);
    tile.setMask(this.boardMask);
    return tile;
  }

  private setEffectTileActive = (tile: Tile, active: boolean): void => {
    if (active) {
      this.effectTiles.add(tile);
    } else {
      this.effectTiles.delete(tile);
    }
  };

  private initGrid(): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tileType = this.randomTileType();
        const tile = this.createTile(this.tileX(col), this.tileY(row), tileType, row, col);
        this.grid[row][col] = tile;
      }
    }
    this.removeInitialMatches();
  }

  /**
   * Break any 3+ matches on the board by swapping tiles with other unlocked tiles.
   * Does not introduce new tile types -- only rearranges what's already there.
   * Used during reshuffle; initial board gen still uses randomTileTypeExcluding.
   */
  private removeInitialMatchesBySwapping(): void {
    // Collect all unlocked positions for swap candidates
    const unlocked: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        if (tile.hazard?.type !== 'lock') unlocked.push({ row, col });
      }
    }

    let safety = 500;
    let matches = this.findMatches();
    while (matches.length > 0 && safety-- > 0) {
      let broke = false;
      for (const match of matches) {
        // Find an unlocked tile in the match to swap out
        const swappable = match.tiles.find(pos => {
          const t = this.grid[pos.row]?.[pos.col];
          return t && t.hazard?.type !== 'lock';
        });
        if (!swappable) continue;

        const tile = this.grid[swappable.row][swappable.col]!;
        const candidates = unlocked.filter(p =>
          !(p.row === swappable.row && p.col === swappable.col) &&
          this.grid[p.row][p.col]!.type !== tile.type,
        );
        if (candidates.length === 0) continue;

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const other = this.grid[pick.row][pick.col]!;
        const tmpType = tile.type;
        const tmpExplosive = tile.isExplosive;
        const tmpShowdown = tile.isShowdown;
        const tmpShadow = tile.isShadow;
        const tmpHazard = tile.hazard;
        tile.setType(other.type); tile.isExplosive = other.isExplosive; tile.isShowdown = other.isShowdown; tile.isShadow = other.isShadow; tile.hazard = other.hazard; tile.refreshStatusIndicator();
        other.setType(tmpType); other.isExplosive = tmpExplosive; other.isShowdown = tmpShowdown; other.isShadow = tmpShadow; other.hazard = tmpHazard; other.refreshStatusIndicator();
        broke = true;
        break;
      }
      if (!broke) break;
      matches = this.findMatches();
    }
  }

  /** Break initial matches by replacing with random types. Used only for initial board generation. */
  private removeInitialMatches(): void {
    let hasMatches = true;
    while (hasMatches) {
      hasMatches = false;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const tile = this.grid[row][col];
          if (!tile) continue;
          if (col >= 2) {
            const t1 = this.grid[row][col - 1];
            const t2 = this.grid[row][col - 2];
            if (t1 && t2 && t1.type === tile.type && t2.type === tile.type) {
              tile.setType(this.randomTileTypeExcluding(tile.type));
              hasMatches = true;
            }
          }
          if (row >= 2) {
            const t1 = this.grid[row - 1][col];
            const t2 = this.grid[row - 2][col];
            if (t1 && t2 && t1.type === tile.type && t2.type === tile.type) {
              tile.setType(this.randomTileTypeExcluding(tile.type));
              hasMatches = true;
            }
          }
        }
      }
    }
  }

  // -- Input handling --

  private dragStart: GridPosition | null = null;
  private devPaintActive = false;
  private devPaintLastKey: string | null = null;

  /** Whether deadeye targeting mode is active (clicks shoot instead of swap). */
  private deadeyeMode = false;
  /** Whether dev board-edit targeting mode is active. */
  private devBoardEditMode = false;
  /** Whether lasso mode is active (clicks can target non-adjacent tiles). */
  private lassoMode = false;

  // -- Hint system --
  private hintTimer = 0;
  private hintTriggered = false;
  private hintCachedMove: { from: GridPosition; to: GridPosition } | null = null;
  private static readonly HINT_INTERVAL = 10000; // 10 seconds
  private static readonly HINT_BREATHE_DURATION = 1500; // how long the hint breathes
  /** Whether shuffle hold mode is active (clicks toggle hold). */
  private shuffleHoldMode = false;
  /** Set of held position keys ("row,col") during False Shuffle. */
  private shuffleHeldKeys = new Set<string>();

  setDeadeyeMode(active: boolean): void {
    this.deadeyeMode = active;
    if (active) this.clearSelection();
  }

  setDevBoardEditMode(active: boolean): void {
    this.devBoardEditMode = active;
    this.devPaintActive = false;
    this.devPaintLastKey = null;
    if (active) this.clearSelection();
  }

  setLassoMode(active: boolean): void {
    this.lassoMode = active;
  }

  setShuffleHoldMode(active: boolean): void {
    this.shuffleHoldMode = active;
    if (!active) {
      // Clear held tile visuals
      for (const key of this.shuffleHeldKeys) {
        const [r, c] = key.split(',').map(Number);
        const tile = this.grid[r]?.[c];
        if (tile) tile.clearTint();
      }
      this.shuffleHeldKeys.clear();
    }
    if (active) this.clearSelection();
  }

  /** Toggle hold on a tile during False Shuffle. Returns new held count. */
  toggleShuffleHold(row: number, col: number): number {
    const key = `${row},${col}`;
    const tile = this.grid[row]?.[col];
    if (this.shuffleHeldKeys.has(key)) {
      this.shuffleHeldKeys.delete(key);
      if (tile) tile.clearTint();
    } else {
      this.shuffleHeldKeys.add(key);
      if (tile) tile.setTint(0xffd700); // Gold tint for held tiles
    }
    return this.shuffleHeldKeys.size;
  }

  /** Shuffle all non-held tiles to random positions. */
  shuffleNonHeld(): void {
    const nonHeldPositions: GridPosition[] = [];
    const nonHeldTypes: TileType[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const key = `${row},${col}`;
        const tile = this.grid[row]?.[col];
        if (!tile) continue;
        if (this.shuffleHeldKeys.has(key)) continue;
        nonHeldPositions.push({ row, col });
        nonHeldTypes.push(tile.type);
      }
    }

    // Fisher-Yates shuffle of types
    for (let i = nonHeldTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonHeldTypes[i], nonHeldTypes[j]] = [nonHeldTypes[j], nonHeldTypes[i]];
    }

    // Reassign types to positions
    for (let i = 0; i < nonHeldPositions.length; i++) {
      const pos = nonHeldPositions[i];
      const tile = this.grid[pos.row]?.[pos.col];
      if (tile) tile.setType(nonHeldTypes[i]);
    }

    // Clear held visuals
    for (const key of this.shuffleHeldKeys) {
      const [r, c] = key.split(',').map(Number);
      const t = this.grid[r]?.[c];
      if (t) t.clearTint();
    }
    this.shuffleHeldKeys.clear();
  }

  private setupInput(): void {
    const emitDevPaint = (pos: GridPosition): void => {
      const key = `${pos.row},${pos.col}`;
      if (key === this.devPaintLastKey) return;
      this.devPaintLastKey = key;
      EventBus.emit(GameEvent.DEV_BOARD_CELL_CLICKED, pos.row, pos.col);
    };

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inputEnabled || this.isResolving) return;
      const pos = this.pointerToGrid(pointer);
      if (!pos) return;

      if (this.devBoardEditMode) {
        this.devPaintActive = true;
        this.devPaintLastKey = null;
        emitDevPaint(pos);
        return;
      }

      // Deadeye mode: click to shoot a tile (pass pointer position for VFX)
      if (this.deadeyeMode) {
        EventBus.emit(GameEvent.DEADEYE_SHOOT, pos.row, pos.col, pointer.x, pointer.y);
        return;
      }

      // Start tracking drag from this tile
      this.dragStart = pos;

      if (this.selectedTile) {
        if (
          pos.row === this.selectedTile.row &&
          pos.col === this.selectedTile.col
        ) {
          // Clicked same tile: deselect
          this.clearSelection();
          this.dragStart = null;
        } else if (this.isAdjacent(this.selectedTile, pos) || this.lassoMode) {
          // Clicked adjacent tile (or any tile in lasso mode): route through CombatManager
          const from = { ...this.selectedTile };
          this.clearSelection();
          this.dragStart = null;
          EventBus.emit(
            GameEvent.SWAP_REQUESTED,
            from.row, from.col, pos.row, pos.col,
          );
        } else {
          // Clicked non-adjacent: select the new tile
          this.clearSelection();
          this.selectTile(pos);
        }
      } else {
        this.selectTile(pos);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.inputEnabled || this.isResolving || !this.devBoardEditMode || !this.devPaintActive) return;
      const pos = this.pointerToGrid(pointer);
      if (!pos) return;
      emitDevPaint(pos);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.devBoardEditMode) {
        this.devPaintActive = false;
        this.devPaintLastKey = null;
        return;
      }
      if (!this.inputEnabled || this.isResolving || !this.dragStart) return;

      // Compute drag direction from pixel distance, not grid position.
      // This way the player doesn't need to release on the exact target tile.
      const startCX = this.originX + this.dragStart.col * TILE_SIZE + TILE_SIZE / 2;
      const startCY = this.originY + this.dragStart.row * TILE_SIZE + TILE_SIZE / 2;
      const dx = pointer.x - startCX;
      const dy = pointer.y - startCY;
      const threshold = TILE_SIZE * 0.3; // ~10px minimum drag

      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        // Determine primary drag direction
        let targetRow = this.dragStart.row;
        let targetCol = this.dragStart.col;
        if (Math.abs(dx) >= Math.abs(dy)) {
          targetCol += dx > 0 ? 1 : -1;
        } else {
          targetRow += dy > 0 ? 1 : -1;
        }

        // Validate target is on the board
        if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
          const from = { ...this.dragStart };
          this.clearSelection();
          this.dragStart = null;
          EventBus.emit(
            GameEvent.SWAP_REQUESTED,
            from.row, from.col, targetRow, targetCol,
          );
          return;
        }
      }

      this.dragStart = null;
    });

    this.scene.input.on('pointerupoutside', () => {
      this.devPaintActive = false;
      this.devPaintLastKey = null;
    });
  }

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridPosition | null {
    const col = Math.floor((pointer.x - this.originX) / TILE_SIZE);
    const row = Math.floor((pointer.y - this.originY) / TILE_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null;
    }
    return { row, col };
  }

  private selectTile(pos: GridPosition): void {
    const tile = this.grid[pos.row]?.[pos.col];
    if (!tile) return;

    // Don't allow selecting locked tiles (regular or hardened)
    if (tile.hazard?.type === 'lock') return;

    this.selectedTile = pos;
    tile.setSelected(true);
  }

  private clearSelection(): void {
    if (this.selectedTile) {
      const tile = this.grid[this.selectedTile.row]?.[this.selectedTile.col];
      tile?.setSelected(false);
      this.selectedTile = null;
    }
  }

  // -- Swap logic --

  isAdjacent(a: GridPosition, b: GridPosition): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  private isLocked(pos: GridPosition): boolean {
    return this.grid[pos.row]?.[pos.col]?.hazard?.type === 'lock';
  }

  private isLegalAdjacentSwap(a: GridPosition, b: GridPosition): boolean {
    if (!this.isAdjacent(a, b)) return false;
    const tileA = this.grid[a.row]?.[a.col];
    const tileB = this.grid[b.row]?.[b.col];
    if (!tileA || !tileB) return false;
    if (this.isLocked(a) || this.isLocked(b)) return false;

    const aShowdown = tileA.isShowdown || tileA.type === 'showdown';
    const bShowdown = tileB.isShowdown || tileB.type === 'showdown';
    const aExplosive = tileA.isExplosive;
    const bExplosive = tileB.isExplosive;

    if (aShowdown || bShowdown) return true;
    if (aExplosive && bExplosive) return true;

    return this.matchDetector.wouldMatch(this.grid, BOARD_SIZE, a, b);
  }

  /** Duration for the swap animation in ms (before speed multiplier). */
  private static readonly SWAP_DURATION = 180;

  /**
   * Attempt to swap two tiles. Validates adjacency and match production.
   * Returns the result including all matches from the full cascade chain.
   * Plays a visible swap animation. If the swap is invalid, animates the
   * tiles swapping and then swapping back (bounce-back).
   */
  async trySwap(
    from: GridPosition,
    to: GridPosition,
    onCascadeStep?: (matches: MatchResult[]) => void | Promise<void>,
    isLasso = false,
  ): Promise<SwapResult> {
    if (this.isResolving) return { valid: false, matches: [] };
    this.resetHintTimer();

    const tileA = this.grid[from.row]?.[from.col];
    const tileB = this.grid[to.row]?.[to.col];
    if (!tileA || !tileB) return { valid: false, matches: [] };

    // Don't allow swapping locked tiles (no animation either)
    const aLock = tileA.hazard?.type === 'lock';
    const bLock = tileB.hazard?.type === 'lock';
    if (aLock || bLock) {
      return { valid: false, matches: [] };
    }

    // Special combo swaps between showdown and/or explosive tiles
    const aShowdown = tileA.isShowdown || tileA.type === 'showdown';
    const bShowdown = tileB.isShowdown || tileB.type === 'showdown';
    const aExplosive = tileA.isExplosive;
    const bExplosive = tileB.isExplosive;

    if (aShowdown && bShowdown) {
      return this.resolveDoubleShowdownSwap(from, to, onCascadeStep);
    }
    if (aExplosive && bExplosive) {
      return this.resolveDoubleExplosiveSwap(from, to, onCascadeStep);
    }
    if ((aShowdown && bExplosive) || (aExplosive && bShowdown)) {
      return this.resolveShowdownExplosiveSwap(from, to, onCascadeStep);
    }

    // Handle showdown tile swap: destroy all tiles of the adjacent type
    if (tileA.type === 'showdown' || tileB.type === 'showdown') {
      return this.resolveShowdownSwap(from, to, onCascadeStep);
    }

    // Block input during swap animation
    this.isResolving = true;

    // Animate: non-adjacent lasso swaps scale down/up; adjacent swaps slide
    const isNonAdjacent = !this.isAdjacent(from, to);
    if (isNonAdjacent) {
      await Promise.all([tileA.tweenScale(0, 150), tileB.tweenScale(0, 150)]);
      this.swapTilesInGrid(from, to);
      tileA.setPosition(this.tileX(to.col), this.tileY(to.row));
      tileB.setPosition(this.tileX(from.col), this.tileY(from.row));
      await Promise.all([tileA.tweenScale(1, 150), tileB.tweenScale(1, 150)]);
    } else {
      const dur = Board.SWAP_DURATION;
      await Promise.all([
        tileA.tweenToPosition(this.tileX(to.col), this.tileY(to.row), dur),
        tileB.tweenToPosition(this.tileX(from.col), this.tileY(from.row), dur),
      ]);
      this.swapTilesInGrid(from, to);
    }

    // Check if swap produces matches
    const matches = this.findMatches();
    if (matches.length === 0) {
      if (isLasso) {
        // Lasso: no-match swap is still valid (just no cascades)
        if (!this.hasValidMoves()) {
          await this.reshuffleAnimated();
        }
        this.isResolving = false;
        return { valid: true, matches: [] };
      }
      // No match: animate swap back (bounce-back)
      if (isNonAdjacent) {
        await Promise.all([tileA.tweenScale(0, 150), tileB.tweenScale(0, 150)]);
        this.swapTilesInGrid(from, to);
        tileA.setPosition(this.tileX(from.col), this.tileY(from.row));
        tileB.setPosition(this.tileX(to.col), this.tileY(to.row));
        await Promise.all([tileA.tweenScale(1, 150), tileB.tweenScale(1, 150)]);
      } else {
        const dur = Board.SWAP_DURATION;
        this.swapTilesInGrid(from, to);
        await Promise.all([
          tileA.tweenToPosition(this.tileX(from.col), this.tileY(from.row), dur),
          tileB.tweenToPosition(this.tileX(to.col), this.tileY(to.row), dur),
        ]);
      }
      this.isResolving = false;
      return { valid: false, matches: [] };
    }

    // Valid swap: resolve all cascades. Pass BOTH swap endpoints so special
    // tiles spawn at the player's intended position regardless of which end
    // of the swap ended up in the forming match. Prefer `to` (destination)
    // when both are in the match.
    const allMatches = await this.cascadeResolver.resolve(this, onCascadeStep, [to, from]);

    // After cascade: check for no valid moves
    if (!this.hasValidMoves()) {
      await this.reshuffleAnimated();
    }

    this.isResolving = false;
    return { valid: true, matches: allMatches };
  }

  /** Swap grid positions of two tiles. Does NOT update visual positions. */
  private swapTilesInGrid(a: GridPosition, b: GridPosition): void {
    const tileA = this.grid[a.row][a.col];
    const tileB = this.grid[b.row][b.col];

    this.grid[a.row][a.col] = tileB;
    this.grid[b.row][b.col] = tileA;

    if (tileA) {
      tileA.row = b.row;
      tileA.col = b.col;
    }
    if (tileB) {
      tileB.row = a.row;
      tileB.col = a.col;
    }
  }

  // -- Showdown tile resolution --

  /**
   * Resolve a swap involving a showdown tile.
   * The showdown tile is consumed; all tiles of the swapped tile's type are
   * triggered (their damage/effects apply at 1x per tile) and removed from
   * the board. Returns a MatchResult for CombatManager to process via
   * processMatches, followed by any cascade matches from the refilled board.
   */
  private async resolveShowdownSwap(
    from: GridPosition,
    to: GridPosition,
    onCascadeStep?: (matches: MatchResult[]) => void | Promise<void>,
  ): Promise<SwapResult> {
    const tileA = this.grid[from.row][from.col]!;
    const tileB = this.grid[to.row][to.col]!;

    const isAShowdown = tileA.type === 'showdown';
    const targetTile = isAShowdown ? tileB : tileA;
    const targetType = targetTile.type;
    const showdownPos = isAShowdown ? from : to;

    this.isResolving = true;

    // Consume the showdown tile first so it is excluded from the type scan below
    const showdownTile = isAShowdown ? tileA : tileB;
    showdownTile.destroy();
    this.grid[showdownPos.row][showdownPos.col] = null;

    // Flash lines from showdown to each target before clearing
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === targetType) {
          EventBus.emit(GameEvent.FLASH_LINE, showdownPos, { row, col }, targetType);
        }
      }
    }

    // Collect all positions of the target type, then destroy with effects
    const targetPositions: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === targetType) {
          targetPositions.push({ row, col });
        }
      }
    }

    const destroyed = await this.destroyTilesWithEffects(targetPositions, { staggerMs: 100 });

    // Build MatchResults for resource generation, grouped by type.
    const byType = new Map<TileType, { count: number; shadowCount: number }>();
    for (const info of destroyed) {
      const bucket = byType.get(info.type) ?? { count: 0, shadowCount: 0 };
      bucket.count++;
      if (info.isShadow) bucket.shadowCount++;
      byType.set(info.type, bucket);
    }
    const matchResults: MatchResult[] = [];
    for (const [tType, { count, shadowCount }] of byType) {
      matchResults.push({
        tiles: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
        tileType: tType,
        length: count,
        isExplosive: false,
        isShowdown: tType === targetType,
        isShadow: false,
        isCross: false,
        crossIntersections: [],
        matchBonus: 1.0,
        isChainDestruction: true,
        consumesAce: tType === targetType,
        shadowCount: shadowCount > 0 ? shadowCount : undefined,
      });
    }

    // Apply showdown effects immediately so the player sees them right away
    if (onCascadeStep) {
      await onCascadeStep(matchResults);
    }

    // Apply gravity with animation, then fill
    const gravMoves = this.cascadeResolver.applyGravityTracked(this);
    await this.animateGravityDrop(gravMoves);
    await this.fillEmptyTilesAnimated();

    // Resolve any new matches that form after the board refills
    const cascadeMatches = await this.cascadeResolver.resolve(this, onCascadeStep);
    const allMatches = [...matchResults, ...cascadeMatches];

    if (!this.hasValidMoves()) {
      await this.reshuffleAnimated();
    }

    this.isResolving = false;
    return { valid: true, matches: allMatches };
  }

  // -- Special combo swaps --

  /**
   * Double showdown: clear every tile on the board left-to-right, top-to-bottom.
   */
  private async resolveDoubleShowdownSwap(
    from: GridPosition,
    to: GridPosition,
    onCascadeStep?: (matches: MatchResult[]) => void | Promise<void>,
  ): Promise<SwapResult> {
    this.isResolving = true;

    // Destroy both showdown tiles first
    this.grid[from.row][from.col]?.destroy();
    this.grid[from.row][from.col] = null;
    this.grid[to.row][to.col]?.destroy();
    this.grid[to.row][to.col] = null;

    EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');

    // Collect all remaining tile positions
    const allPositions: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this.grid[row][col]) allPositions.push({ row, col });
      }
    }

    const destroyed = await this.destroyTilesWithEffects(allPositions, { staggerMs: 20 });

    // Build match results grouped by type
    const byType = new Map<TileType, { count: number; shadowCount: number }>();
    for (const info of destroyed) {
      const bucket = byType.get(info.type) ?? { count: 0, shadowCount: 0 };
      bucket.count++;
      if (info.isShadow) bucket.shadowCount++;
      byType.set(info.type, bucket);
    }
    const matchResults: MatchResult[] = [];
    for (const [tType, { count, shadowCount }] of byType) {
      matchResults.push({
        tiles: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
        tileType: tType,
        length: count,
        isExplosive: false,
        isShowdown: true,
        isShadow: false,
        isCross: false,
        crossIntersections: [],
        matchBonus: 1.0,
        isChainDestruction: true,
        shadowCount: shadowCount > 0 ? shadowCount : undefined,
      });
    }

    if (onCascadeStep) await onCascadeStep(matchResults);

    // Gravity + fill + cascade
    const gravMoves = this.cascadeResolver.applyGravityTracked(this);
    await this.animateGravityDrop(gravMoves);
    await this.fillEmptyTilesAnimated();
    const cascadeMatches = await this.cascadeResolver.resolve(this, onCascadeStep);

    if (!this.hasValidMoves()) await this.reshuffleAnimated();
    this.isResolving = false;
    return { valid: true, matches: [...matchResults, ...cascadeMatches] };
  }

  /**
   * Double explosive: both tiles explode at 5x5 radius instead of 3x3.
   */
  private async resolveDoubleExplosiveSwap(
    from: GridPosition,
    to: GridPosition,
    onCascadeStep?: (matches: MatchResult[]) => void | Promise<void>,
  ): Promise<SwapResult> {
    this.isResolving = true;

    EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');

    // Collect all positions in (5+bonus)x(5+bonus) radius around both centers (deduped)
    const doubleRadius = 2 + (this._explosiveRadius - 1);
    const posSet = new Set<string>();
    const positions: GridPosition[] = [];
    for (const center of [from, to]) {
      for (let dr = -doubleRadius; dr <= doubleRadius; dr++) {
        for (let dc = -doubleRadius; dc <= doubleRadius; dc++) {
          const r = center.row + dr;
          const c = center.col + dc;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
          const key = `${r},${c}`;
          if (posSet.has(key)) continue;
          if (!this.grid[r]?.[c]) continue;
          posSet.add(key);
          positions.push({ row: r, col: c });
        }
      }
    }

    const destroyed = await this.destroyTilesWithEffects(positions);

    // Build match results grouped by type. Track shadow tiles caught in the
    // blast so each fires a shadow bolt via the standard shadowCount path.
    const byType = new Map<TileType, { count: number; shadowCount: number }>();
    for (const info of destroyed) {
      const bucket = byType.get(info.type) ?? { count: 0, shadowCount: 0 };
      bucket.count++;
      if (info.isShadow) bucket.shadowCount++;
      byType.set(info.type, bucket);
    }
    const matchResults: MatchResult[] = [];
    for (const [tType, { count, shadowCount }] of byType) {
      matchResults.push({
        tiles: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
        tileType: tType,
        length: count,
        isExplosive: false,
        isShowdown: false,
        isShadow: false,
        isCross: false,
        crossIntersections: [],
        isChainDestruction: true,
        matchBonus: 1.0,
        shadowCount: shadowCount > 0 ? shadowCount : undefined,
      });
    }

    if (onCascadeStep) await onCascadeStep(matchResults);

    const gravMoves = this.cascadeResolver.applyGravityTracked(this);
    await this.animateGravityDrop(gravMoves);
    await this.fillEmptyTilesAnimated();
    const cascadeMatches = await this.cascadeResolver.resolve(this, onCascadeStep);

    if (!this.hasValidMoves()) await this.reshuffleAnimated();
    this.isResolving = false;
    return { valid: true, matches: [...matchResults, ...cascadeMatches] };
  }

  /**
   * Showdown + Explosive: convert all tiles of the explosive's type into
   * explosive tiles, then detonate them all (3x3 each, chained).
   */
  private async resolveShowdownExplosiveSwap(
    from: GridPosition,
    to: GridPosition,
    onCascadeStep?: (matches: MatchResult[]) => void | Promise<void>,
  ): Promise<SwapResult> {
    const tileA = this.grid[from.row][from.col]!;
    const tileB = this.grid[to.row][to.col]!;

    const isAShowdown = tileA.isShowdown || tileA.type === 'showdown';
    const explosiveTile = isAShowdown ? tileB : tileA;
    const targetType = explosiveTile.type;

    this.isResolving = true;

    // Destroy both swapped tiles
    this.grid[from.row][from.col]?.destroy();
    this.grid[from.row][from.col] = null;
    this.grid[to.row][to.col]?.destroy();
    this.grid[to.row][to.col] = null;

    // Convert tiles of the explosive's type one by one (showdown style)
    const targets: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === targetType) {
          targets.push({ row, col });
        }
      }
    }

    // Staggered conversion: each tile becomes explosive with a brief delay
    for (const pos of targets) {
      const tile = this.grid[pos.row]?.[pos.col];
      if (tile) {
        tile.setExplosive(true);
        const center = tile.getWorldCenter();
        EventBus.emit(GameEvent.TILE_PARTICLES, center.x, center.y, TILE_COLORS[targetType] ?? '#ffffff');
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Brief pause after all conversions before detonation
    await new Promise((r) => setTimeout(r, 150));
    EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');

    // Detonate all targets via centralized destruction (handles chain explosions)
    const destroyed = await this.destroyTilesWithEffects(targets);

    // Build match results grouped by type
    const byType = new Map<TileType, { count: number; shadowCount: number }>();
    for (const info of destroyed) {
      const bucket = byType.get(info.type) ?? { count: 0, shadowCount: 0 };
      bucket.count++;
      if (info.isShadow) bucket.shadowCount++;
      byType.set(info.type, bucket);
    }
    const matchResults: MatchResult[] = [];
    for (const [tType, { count, shadowCount }] of byType) {
      matchResults.push({
        tiles: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
        tileType: tType,
        length: count,
        isExplosive: false,
        isShowdown: true,
        isShadow: false,
        isCross: false,
        crossIntersections: [],
        matchBonus: 1.0,
        isChainDestruction: true,
        shadowCount: shadowCount > 0 ? shadowCount : undefined,
      });
    }

    if (onCascadeStep) await onCascadeStep(matchResults);

    const gravMoves = this.cascadeResolver.applyGravityTracked(this);
    await this.animateGravityDrop(gravMoves);
    await this.fillEmptyTilesAnimated();
    const cascadeMatches = await this.cascadeResolver.resolve(this, onCascadeStep);

    if (!this.hasValidMoves()) await this.reshuffleAnimated();
    this.isResolving = false;
    return { valid: true, matches: [...matchResults, ...cascadeMatches] };
  }

  // -- Centralized tile destruction --

  /**
   * Central method for ALL tile destruction. Handles explosive chain detonation
   * and showdown clear-all-of-type automatically. Callers just pass positions
   * and get back a list of everything that was destroyed.
   */
  async destroyTilesWithEffects(
    positions: GridPosition[],
    opts?: { staggerMs?: number; detonated?: Set<string>; explosiveRadius?: number; animDuration?: number },
  ): Promise<DestroyedTileInfo[]> {
    const results: DestroyedTileInfo[] = [];
    const detonated = opts?.detonated ?? new Set<string>();
    const staggerMs = opts?.staggerMs ?? 0;
    const explosiveRadius = opts?.explosiveRadius ?? this._explosiveRadius;
    const animDuration = opts?.animDuration ?? 150;
    const posKey = (r: number, c: number) => `${r},${c}`;

    let explosiveQueue: GridPosition[] = [];
    const showdownQueue: GridPosition[] = [];
    const tilesToAnimate: Tile[] = [];

    // Step 1: Process each input position
    for (const pos of positions) {
      const key = posKey(pos.row, pos.col);
      if (detonated.has(key)) continue;
      const tile = this.grid[pos.row]?.[pos.col];
      if (!tile) continue;

      // Locked tiles: decrement lock. If hits remain, tile stays.
      if (tile.hazard?.type === 'lock') {
        tile.hazard.hits--;
        if (tile.hazard.hits > 0) {
          detonated.add(key);
          tile.refreshStatusIndicator();
          continue;
        }
        tile.hazard = null;
        tile.refreshStatusIndicator();
      }

      detonated.add(key);
      results.push({ type: tile.type, row: pos.row, col: pos.col, isShadow: tile.isShadow });

      if (tile.isExplosive) explosiveQueue.push(pos);
      if (tile.isShowdown || tile.type === 'showdown') showdownQueue.push(pos);

      this.grid[pos.row][pos.col] = null;
      tilesToAnimate.push(tile);
    }

    // Step 2: Animate the initial destruction.
    // Stagger path plays per-tile SFX at a reduced volume so chain-destruction
    // (double-showdown, showdown clear-all-of-type, ricochet → showdown) doesn't
    // stack up into an overwhelming wall of sound.
    if (staggerMs > 0) {
      for (const tile of tilesToAnimate) {
        playMatch(1, 0.25);
        const center = tile.getWorldCenter();
        EventBus.emit(GameEvent.TILE_PARTICLES, center.x, center.y, TILE_COLORS[tile.type] ?? '#ffffff');
        tile.destroy();
        await new Promise(r => setTimeout(r, staggerMs));
      }
    } else {
      await this.animateTileClear(tilesToAnimate, animDuration);
    }

    // Step 3: BFS explosive chain detonation (wave by wave)
    while (explosiveQueue.length > 0) {
      const currentWave = explosiveQueue;
      explosiveQueue = [];
      const waveTiles: Tile[] = [];

      for (const pos of currentWave) {
        for (let dr = -explosiveRadius; dr <= explosiveRadius; dr++) {
          for (let dc = -explosiveRadius; dc <= explosiveRadius; dc++) {
            const r = pos.row + dr;
            const c = pos.col + dc;
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
            const key = posKey(r, c);
            if (detonated.has(key)) continue;
            const tile = this.grid[r]?.[c];
            if (!tile) continue;

            // Locked tiles: decrement lock. If hits remain, tile stays.
            if (tile.hazard?.type === 'lock') {
              tile.hazard.hits--;
              if (tile.hazard.hits > 0) {
                detonated.add(key);
                tile.refreshStatusIndicator();
                continue;
              }
              tile.hazard = null;
              tile.refreshStatusIndicator();
            }

            detonated.add(key);
            results.push({ type: tile.type, row: r, col: c, isShadow: tile.isShadow });

            if (tile.isExplosive) explosiveQueue.push({ row: r, col: c });
            if (tile.isShowdown || tile.type === 'showdown') showdownQueue.push({ row: r, col: c });

            this.grid[r][c] = null;
            waveTiles.push(tile);
          }
        }
      }

      if (waveTiles.length > 0) {
        playMatch(1);
        await this.animateTileClear(waveTiles);
        EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
      }
    }

    // Step 4: Showdown triggers -- each clears all tiles of a random type
    for (const _pos of showdownQueue) {
      const types = this.getActiveTileTypes();
      const randomType = types[Math.floor(Math.random() * types.length)];

      // Collect all positions of the chosen type
      const typePositions: GridPosition[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const tile = this.grid[row]?.[col];
          if (tile && tile.type === randomType) {
            typePositions.push({ row, col });
          }
        }
      }

      if (typePositions.length > 0) {
        const subResults = await this.destroyTilesWithEffects(
          typePositions,
          { staggerMs: 100, detonated },
        );
        results.push(...subResults);
        EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
      }
    }

    return results;
  }

  // -- Special tile spawning --

  /**
   * Spawn an explosive or showdown tile at the given position.
   * If the cell is already occupied, it overwrites (shouldn't happen
   * since the match just cleared it).
   */
  spawnSpecialTile(
    row: number,
    col: number,
    type: TileType,
    kind: 'explosive' | 'showdown' | 'shadow' | 'none',
  ): void {
    // Destroy existing tile if present
    const existing = this.grid[row][col];
    if (existing) existing.destroy();

    const tile = this.createTile(this.tileX(col), this.tileY(row), type, row, col);

    if (kind === 'explosive') {
      tile.setExplosive(true);
    } else if (kind === 'showdown') {
      tile.setShowdown(true);
      useMetaStore.getState().discoverTile('showdown');
    } else if (kind === 'shadow') {
      tile.setShadow(true);
    }

    this.grid[row][col] = tile;
  }

  /** Apply Shadow augment to N random non-hazarded, non-special tiles. */
  applyShadowToRandomTiles(count: number): void {
    const candidates: { row: number; col: number }[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && !tile.hazard && !tile.isExplosive && !tile.isShowdown && !tile.isShadow) {
          candidates.push({ row, col });
        }
      }
    }
    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const pos = candidates.splice(idx, 1)[0];
      const tile = this.grid[pos.row][pos.col];
      if (tile) tile.setShadow(true);
    }
  }

  /** Prairie Fire spread: each prairie_fire tile has a 1-in-4 chance to convert 1 adjacent tile. Returns true if any spread. */
  spreadPrairieFire(): boolean {
    return this.cascadeResolver.applyFireSpread(this);
  }

  /** Make 1 random non-special tile explosive. */
  spawnExplosiveOnRandomTile(): void {
    const candidates: { row: number; col: number }[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && !tile.hazard && !tile.isExplosive && !tile.isShowdown && !tile.isShadow) {
          candidates.push({ row, col });
        }
      }
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const tile = this.grid[pick.row][pick.col];
      if (tile) tile.setExplosive(true);
    }
  }

  // -- Fill empty cells --

  fillEmptyTiles(): void {
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (this.grid[row][col] === null) {
          const type = this.randomTileType();
          const tile = this.createTile(this.tileX(col), this.tileY(row), type, row, col);
          this.grid[row][col] = tile;
        }
      }
    }
  }

  /**
   * Fill empty cells and animate new tiles dropping from above.
   * Tiles fall one by one per column, staggered sequentially.
   */
  async fillEmptyTilesAnimated(): Promise<void> {
    const tweens: Promise<void>[] = [];
    let globalIndex = 0;

    const gravDir = this.cascadeResolver.getGravityDirection();
    if (gravDir === 'left') {
      // Gravity left: new tiles enter from the right edge
      for (let row = 0; row < BOARD_SIZE; row++) {
        let emptyCount = 0;
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (this.grid[row][col] === null) emptyCount++;
        }
        let spawnIndex = 0;
        for (let col = BOARD_SIZE - 1; col >= 0; col--) {
          if (this.grid[row][col] === null) {
            const type = this.randomTileType();
            const startX = this.originX + BOARD_SIZE * TILE_SIZE + (emptyCount - spawnIndex) * TILE_SIZE;
            const tile = this.createTile(startX, this.tileY(row), type, row, col);
            this.grid[row][col] = tile;
            tweens.push(tile.tweenToPosition(this.tileX(col), this.tileY(row), 200, globalIndex * 25, true));
            spawnIndex++;
            globalIndex++;
          }
        }
      }
    } else if (gravDir === 'right') {
      // Gravity right: new tiles enter from the left edge
      for (let row = 0; row < BOARD_SIZE; row++) {
        let emptyCount = 0;
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (this.grid[row][col] === null) emptyCount++;
        }
        let spawnIndex = 0;
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (this.grid[row][col] === null) {
            const type = this.randomTileType();
            const startX = this.originX - (emptyCount - spawnIndex) * TILE_SIZE;
            const tile = this.createTile(startX, this.tileY(row), type, row, col);
            this.grid[row][col] = tile;
            tweens.push(tile.tweenToPosition(this.tileX(col), this.tileY(row), 200, globalIndex * 25, true));
            spawnIndex++;
            globalIndex++;
          }
        }
      }
    } else if (gravDir === 'up') {
      // Gravity up: new tiles enter from the bottom edge
      for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyCount = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
          if (this.grid[row][col] === null) emptyCount++;
        }
        let spawnIndex = 0;
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
          if (this.grid[row][col] === null) {
            const type = this.randomTileType();
            const startY = this.originY + BOARD_SIZE * TILE_SIZE + (emptyCount - spawnIndex) * TILE_SIZE;
            const tile = this.createTile(this.tileX(col), startY, type, row, col);
            this.grid[row][col] = tile;
            tweens.push(tile.tweenToPosition(this.tileX(col), this.tileY(row), 200, globalIndex * 25, true));
            spawnIndex++;
            globalIndex++;
          }
        }
      }
    } else {
      // Gravity down: new tiles enter from the top edge
      for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyCount = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
          if (this.grid[row][col] === null) emptyCount++;
        }

        let spawnIndex = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
          if (this.grid[row][col] === null) {
            const type = this.randomTileType();
            const startY = this.originY - (emptyCount - spawnIndex) * TILE_SIZE;
            const tile = this.createTile(this.tileX(col), startY, type, row, col);
            this.grid[row][col] = tile;
            tweens.push(tile.tweenToPosition(this.tileX(col), this.tileY(row), 200, globalIndex * 25, true));
            spawnIndex++;
            globalIndex++;
          }
        }
      }
    }

    if (tweens.length > 0) {
      await Promise.all(tweens);
    }
  }

  // -- Animation helpers --

  /**
   * Animate tiles that were cleared: pop + fade out + destroy.
   * Also emits particle burst events at each cleared tile's position.
   * Grid cells should already be nulled before calling this.
   */
  async animateTileClear(tiles: Tile[], duration = 150): Promise<void> {
    if (tiles.length === 0) return;

    // Emit particle bursts at each tile's world position
    for (const tile of tiles) {
      const center = tile.getWorldCenter();
      const colorHex = TILE_COLORS[tile.type] ?? '#ffffff';
      EventBus.emit(GameEvent.TILE_PARTICLES, center.x, center.y, colorHex);
    }

    // Screen shake scales with the number of tiles cleared
    if (tiles.length >= 8) {
      EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
    } else if (tiles.length >= 5) {
      EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
    }

    await Promise.all(tiles.map(t => t.animateClear(duration)));
  }

  /**
   * Animate gravity drop for tiles that have moved.
   * Each entry: the tile and its new target position.
   * Uses bounce easing for a satisfying landing feel.
   */
  async animateGravityDrop(
    moves: Array<{ tile: Tile; toX: number; toY: number }>,
  ): Promise<void> {
    if (moves.length === 0) return;
    await Promise.all(
      moves.map(m => m.tile.tweenToPosition(m.toX, m.toY, 250, 0, true)),
    );
  }

  /**
   * Play intro animation: all tiles start stacked above the board
   * and drop into place simultaneously, same as gravity drop.
   */
  async playIntroAnimation(): Promise<void> {
    // Each column falls with a slightly random delay for an organic feel
    const columnDelays: number[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      columnDelays.push(Math.random() * 120); // 0-120ms random offset per column
    }

    const tweens: Promise<void>[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const startY = this.originY - (BOARD_SIZE - row) * TILE_SIZE;
        tile.setPosition(this.tileX(col), startY);
        tweens.push(
          tile.tweenToPosition(
            this.tileX(col),
            this.tileY(row),
            250,
            Math.round(columnDelays[col]),
            true,
          ),
        );
      }
    }

    if (tweens.length > 0) {
      await Promise.all(tweens);
    }
  }

  // -- Valid move detection --

  /**
   * Check if any adjacent swap on the board produces a match.
   * Returns true if at least one valid move exists.
   */
  hasValidMoves(): boolean {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Check right neighbor
        if (col < BOARD_SIZE - 1) {
          const a: GridPosition = { row, col };
          const b: GridPosition = { row, col: col + 1 };
          if (this.isLegalAdjacentSwap(a, b)) return true;
        }
        // Check bottom neighbor
        if (row < BOARD_SIZE - 1) {
          const a: GridPosition = { row, col };
          const b: GridPosition = { row: row + 1, col };
          if (this.isLegalAdjacentSwap(a, b)) return true;
        }
      }
    }
    return false;
  }

  /**
   * Reshuffle the board until at least one valid move exists.
   * Preserves tile types but randomizes positions. Avoids initial matches.
   */
  /** Collect full state (type + effects) from unlocked tiles and shuffle. */
  private collectAndShuffleUnlocked(): {
    unlocked: GridPosition[];
    states: Array<{ type: TileType; isExplosive: boolean; isShowdown: boolean; isShadow: boolean; hazard: TileHazardState | null }>;
  } | null {
    const unlocked: GridPosition[] = [];
    const states: Array<{ type: TileType; isExplosive: boolean; isShowdown: boolean; isShadow: boolean; hazard: TileHazardState | null }> = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const isLocked = tile.hazard?.type === 'lock';
        if (!isLocked) {
          unlocked.push({ row, col });
          states.push({
            type: tile.type,
            isExplosive: tile.isExplosive,
            isShowdown: tile.isShowdown,
            isShadow: tile.isShadow,
            hazard: tile.hazard,
          });
        }
      }
    }

    if (unlocked.length === 0) return null;

    // Fisher-Yates shuffle
    for (let i = states.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [states[i], states[j]] = [states[j], states[i]];
    }

    return { unlocked, states };
  }

  /** Apply shuffled state to unlocked tile positions. */
  private applyShuffledState(
    unlocked: GridPosition[],
    states: Array<{ type: TileType; isExplosive: boolean; isShowdown: boolean; isShadow: boolean; hazard: TileHazardState | null }>,
  ): void {
    for (let i = 0; i < unlocked.length; i++) {
      const tile = this.grid[unlocked[i].row]?.[unlocked[i].col];
      if (!tile || i >= states.length) continue;
      const s = states[i];
      tile.setType(s.type);
      tile.isExplosive = s.isExplosive;
      tile.isShowdown = s.isShowdown;
      tile.isShadow = s.isShadow;
      tile.hazard = s.hazard;
      tile.refreshStatusIndicator();
    }
  }

  reshuffle(): void {
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const result = this.collectAndShuffleUnlocked();
      if (!result) {
        this.rebuildBoardWithoutHazards();
        return;
      }
      this.applyShuffledState(result.unlocked, result.states);
      this.removeInitialMatchesBySwapping();
      attempts++;
    } while (!this.hasValidMoves() && attempts < maxAttempts);

    if (!this.hasValidMoves()) {
      this.rebuildBoardWithoutHazards();
    }
  }

  /** Animated reshuffle for no-valid-moves: breaks matches, guarantees valid moves. */
  async reshuffleAnimated(): Promise<void> {
    const result = this.collectAndShuffleUnlocked();
    if (!result) {
      this.rebuildBoardWithoutHazards();
      return;
    }

    const tiles = result.unlocked
      .map(pos => this.grid[pos.row]?.[pos.col])
      .filter((t): t is Tile => t != null);

    await Promise.all(tiles.map(t => t.tweenScale(0, 150)));

    let attempts = 0;
    this.applyShuffledState(result.unlocked, result.states);
    this.removeInitialMatchesBySwapping();
    attempts++;

    while (!this.hasValidMoves() && attempts < 100) {
      const retry = this.collectAndShuffleUnlocked();
      if (!retry) break;
      this.applyShuffledState(retry.unlocked, retry.states);
      this.removeInitialMatchesBySwapping();
      attempts++;
    }

    if (!this.hasValidMoves()) {
      this.rebuildBoardWithoutHazards();
      return;
    }

    await Promise.all(tiles.map(t => t.tweenScale(1, 150)));
  }

  private rebuildBoardWithoutHazards(): void {
    this.destroyAllTiles();
    this.initGrid();
    this.resetHintTimer();
  }

  /** Animated reshuffle that allows matches to remain (for Reno ability / consumables). */
  async reshuffleAnimatedWithCascades(): Promise<void> {
    const result = this.collectAndShuffleUnlocked();
    if (!result) return;

    const tiles = result.unlocked
      .map(pos => this.grid[pos.row]?.[pos.col])
      .filter((t): t is Tile => t != null);

    await Promise.all(tiles.map(t => t.tweenScale(0, 150)));
    this.applyShuffledState(result.unlocked, result.states);
    await Promise.all(tiles.map(t => t.tweenScale(1, 150)));
  }

  private destroyAllTiles(): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile) {
          tile.destroy();
          this.grid[row][col] = null;
        }
      }
    }
  }

  // -- Coordinate helpers --

  tileX(col: number): number {
    return this.originX + col * TILE_SIZE;
  }

  tileY(row: number): number {
    return this.originY + row * TILE_SIZE;
  }

  updateTilePosition(tile: Tile): void {
    tile.setPosition(this.tileX(tile.col), this.tileY(tile.row));
  }

  /**
   * Draw the next tile type from a shuffled bag containing one of each
   * active type. Guarantees even distribution across all active tile types
   * (critical for 5-6 types in Acts 2-3 where pure random causes uneven boards).
   */
  private randomTileType(): TileType {
    if (this.tileTypeBag.length === 0) {
      this.refillBag();
    }
    const type = this.tileTypeBag.pop()!;
    // Mirage tiles that spawn mid-combat use the transformed type
    if (type === 'mirage' && this.mirageReplacementType) {
      return this.mirageReplacementType;
    }
    return type;
  }

  /** Fill the bag with one of each active tile type, then shuffle. */
  private refillBag(): void {
    this.tileTypeBag = [...this.activeTileTypes];
    // Fisher-Yates shuffle
    for (let i = this.tileTypeBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tileTypeBag[i], this.tileTypeBag[j]] = [this.tileTypeBag[j], this.tileTypeBag[i]];
    }
  }

  private randomTileTypeExcluding(exclude: TileType): TileType {
    const types = this.activeTileTypes.filter((t) => t !== exclude);
    let type = types[Math.floor(Math.random() * types.length)];
    if (type === 'mirage' && this.mirageReplacementType) {
      type = this.mirageReplacementType;
    }
    return type;
  }

  // -- Public API --

  setActiveTileTypes(types: TileType[]): void {
    this.activeTileTypes = types;
    this.tileTypeBag = [];
  }

  setExplosiveRadius(radius: number): void {
    this._explosiveRadius = radius;
  }

  setThreeMatchExplosive(value: boolean): void {
    this.cascadeResolver.threeMatchSpawnsExplosive = value;
  }

  resetTurn(): void {
    this.cascadeResolver.resetTurn();
  }

  /** Animated shuffle of tiles within specific rows (for Dust Devil Boots / Dust Devil enemy).
   *  Reshuffles until no matches are created, matching the out-of-moves reshuffle behavior. */
  async shuffleRowsAnimated(rows: number[]): Promise<void> {
    const positions: { row: number; col: number }[] = [];
    const states: { type: TileType; isExplosive: boolean; isShowdown: boolean; isShadow: boolean }[] = [];
    for (const row of rows) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row]?.[col];
        if (tile && tile.hazard?.type !== 'lock') {
          positions.push({ row, col });
          states.push({ type: tile.type, isExplosive: tile.isExplosive, isShowdown: tile.isShowdown, isShadow: tile.isShadow });
        }
      }
    }
    if (positions.length <= 1) return;

    // Collect tile objects for animation
    const tiles = positions
      .map(pos => this.grid[pos.row]?.[pos.col])
      .filter((t): t is Tile => t != null);

    // Scale down
    await Promise.all(tiles.map(t => t.tweenScale(0, 150)));

    // Try Fisher-Yates shuffles until no matches are created on the board
    let attempts = 0;
    const MAX_ATTEMPTS = 100;
    while (attempts < MAX_ATTEMPTS) {
      // Fisher-Yates shuffle
      for (let i = states.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [states[i], states[j]] = [states[j], states[i]];
      }
      // Apply shuffled state
      for (let i = 0; i < positions.length; i++) {
        const tile = this.grid[positions[i].row]?.[positions[i].col];
        if (tile && i < states.length) {
          tile.setType(states[i].type);
          tile.isExplosive = states[i].isExplosive;
          tile.isShowdown = states[i].isShowdown;
          tile.isShadow = states[i].isShadow;
          tile.refreshStatusIndicator();
        }
      }
      attempts++;
      if (this.findMatches().length === 0) break;
    }

    // Fallback: break any remaining matches by swapping with other unlocked tiles
    if (this.findMatches().length > 0) {
      this.removeInitialMatchesBySwapping();
    }

    // Scale up
    await Promise.all(tiles.map(t => t.tweenScale(1, 150)));
  }

  getTileAt(pos: GridPosition): Tile | null {
    return this.grid[pos.row]?.[pos.col] ?? null;
  }

  findMatches(): MatchResult[] {
    return this.matchDetector.findMatches(this.grid, BOARD_SIZE);
  }

  async resolveMatches(): Promise<MatchResult[]> {
    return this.cascadeResolver.resolve(this);
  }

  /** Resolve matches with the full onStep callback (hazards, resources, etc). */
  async resolveMatchesFull(onStep: (matches: MatchResult[]) => void): Promise<MatchResult[]> {
    return this.cascadeResolver.resolve(this, onStep);
  }

  getIsResolving(): boolean {
    return this.isResolving;
  }

  setIsResolving(value: boolean): void {
    this.isResolving = value;
  }

  getGrid(): (Tile | null)[][] {
    return this.grid;
  }

  getBoardSize(): number {
    return BOARD_SIZE;
  }

  getOrigin(): { x: number; y: number } {
    return { x: this.originX, y: this.originY };
  }

  getActiveTileTypes(): TileType[] {
    return [...this.activeTileTypes];
  }

  getScene(): Phaser.Scene {
    return this.scene;
  }

  /**
   * Pick a random tile from the board, remove it, and return its type + position.
   * Returns null if the board has no tiles. Used by the Ricochet mechanic.
   */
  async pickAndRemoveRandomTile(animDuration = 150): Promise<{ type: TileType; position: GridPosition; destroyed: DestroyedTileInfo[] } | null> {
    const candidates: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this.grid[row][col] !== null) {
          candidates.push({ row, col });
        }
      }
    }
    if (candidates.length === 0) return null;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const tile = this.grid[pick.row][pick.col]!;
    const type = tile.type;
    const destroyed = await this.destroyTilesWithEffects([pick], { animDuration });
    return { type, position: pick, destroyed };
  }

  /**
   * Clear all tiles of a given type from the board (no animation).
   * Returns the number of tiles cleared.
   */
  clearAllOfType(type: TileType): number {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === type) {
          tile.destroy();
          this.grid[row][col] = null;
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Clear all tiles of a given type with animation and chain effects.
   * Returns tile types cleared (for resource generation).
   */
  async clearAllOfTypeAnimated(type: TileType): Promise<TileType[]> {
    // Collect positions of tiles matching the type
    const positions: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === type) {
          positions.push({ row, col });
        }
      }
    }

    const destroyed = await this.destroyTilesWithEffects(positions, { staggerMs: 100 });
    return destroyed.map(info => info.type);
  }

  /**
   * Apply gravity and fill empty cells (no animation). Used after Deadeye
   * destroys tiles, before cascade resolution.
   */
  applyGravityAndFill(): void {
    this.cascadeResolver.applyGravity(this);
    this.fillEmptyTiles();
  }

  /** Apply gravity only (no fill). Used when animated fill follows. */
  applyGravityOnly(): void {
    this.cascadeResolver.applyGravity(this);
  }

  /** Apply gravity with drop animation. Returns when all tiles have landed. */
  async applyGravityAnimated(): Promise<void> {
    const moves = this.cascadeResolver.applyGravityTracked(this);
    await this.animateGravityDrop(moves);
  }

  setGravityDirection(direction: GravityDirection): void {
    this.cascadeResolver.setGravityDirection(direction);
    this.showGravityArrow(direction);
  }

  /** Show a large translucent arrow that slides across the board twice in the gravity direction. */
  private showGravityArrow(direction: GravityDirection): void {
    const boardW = BOARD_SIZE * TILE_SIZE;
    const boardH = BOARD_SIZE * TILE_SIZE;
    const centerX = this.originX + boardW / 2;
    const centerY = this.originY + boardH / 2;
    const margin = 90; // extra margin so arrow fully enters/exits the masked area

    const arrowChars: Record<string, string> = {
      down: '\u25BC', left: '\u25C0', up: '\u25B2', right: '\u25B6',
    };

    // Start and end positions: from one edge to the opposite, with margin
    const isH = direction === 'left' || direction === 'right';
    const sign = direction === 'right' || direction === 'down' ? 1 : -1;
    const half = (isH ? boardW : boardH) / 2 + margin;

    const startX = isH ? centerX - sign * half : centerX;
    const startY = isH ? centerY : centerY - sign * half;
    const endX = isH ? centerX + sign * half : centerX;
    const endY = isH ? centerY : centerY + sign * half;

    const arrow = this.scene.add
      .text(startX, startY, arrowChars[direction], {
        fontSize: '120px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.6)
      .setDepth(10);
    if (this.boardMask) arrow.setMask(this.boardMask);

    // Slide across twice, fading on the second pass
    const slideDuration = 800;
    this.scene.tweens.add({
      targets: arrow,
      x: endX,
      y: endY,
      duration: slideDuration,
      ease: 'Linear',
      onComplete: () => {
        // Reset to start for second pass, same opacity
        arrow.setPosition(startX, startY);
        arrow.setAlpha(0.6);
        this.scene.tweens.add({
          targets: arrow,
          x: endX,
          y: endY,
          alpha: 0.6,
          duration: slideDuration,
          ease: 'Linear',
          onComplete: () => arrow.destroy(),
        });
      },
    });
  }

  getGravityDirection(): GravityDirection {
    return this.cascadeResolver.getGravityDirection();
  }

  /** Transform all mirage tiles into a random tile the player doesn't own. Called once at combat start. */
  transformMirageTiles(allTileTypes: TileType[]): void {
    const owned = new Set(this.activeTileTypes);
    const unowned = allTileTypes.filter(t => !owned.has(t) && t !== 'mirage' && t !== 'showdown' && t !== 'tumbleweed' && t !== 'fools_gold');
    if (unowned.length === 0) return;
    // Pick one random unowned type for all mirages this combat
    const chosenType = unowned[Math.floor(Math.random() * unowned.length)];
    this.mirageReplacementType = chosenType;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === 'mirage') {
          tile.setType(chosenType);
        }
      }
    }
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) this.clearSelection();
    if (enabled) this.resetHintTimer();
  }

  getSelectedTile(): GridPosition | null {
    return this.selectedTile ? { ...this.selectedTile } : null;
  }

  /**
   * Clear all hazards of a given type from the board.
   * Used by consumables (Skeleton Key, Bandage, Signal Flare).
   */
  clearHazardsByType(hazardType: 'lock' | 'poison' | 'bomb' | 'sand'): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.hazard?.type === hazardType) {
          tile.hazard = null;
        }
      }
    }
  }

  // -- Serialization --

  /**
   * Serialize the full board state for mid-combat saves.
   * Captures every tile's type, position, special flags, and hazard.
   */
  serialize(): SerializedBoard {
    const tiles: (SerializedTile | null)[][] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      tiles[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile) {
          tiles[row][col] = {
            type: tile.type,
            row: tile.row,
            col: tile.col,
            isExplosive: tile.isExplosive,
            isShowdown: tile.isShowdown,
            isShadow: tile.isShadow,
            hazard: tile.hazard ? { ...tile.hazard } : null,
          };
        } else {
          tiles[row][col] = null;
        }
      }
    }
    return {
      tiles,
      activeTileTypes: [...this.activeTileTypes],
      gravityDirection: this.cascadeResolver.getGravityDirection(),
      mirageReplacementType: this.mirageReplacementType,
    };
  }

  /**
   * Restore board state from a snapshot. Destroys the current grid
   * and rebuilds from serialized data.
   */
  restoreFromSnapshot(snapshot: SerializedBoard): void {
    this.destroyAllTiles();
    this.activeTileTypes = snapshot.activeTileTypes;
    this.tileTypeBag = [];
    this.mirageReplacementType = snapshot.mirageReplacementType ?? null;
    this.cascadeResolver.setGravityDirection(snapshot.gravityDirection);

    for (let row = 0; row < BOARD_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const data = snapshot.tiles[row]?.[col];
        if (data) {
          const tile = this.createTile(this.tileX(col), this.tileY(row), data.type, row, col);
          if (data.isExplosive) tile.setExplosive(true);
          if (data.isShowdown) tile.setShowdown(true);
          if (data.isShadow) tile.setShadow(true);
          if (data.hazard) tile.hazard = { ...data.hazard };
          this.grid[row][col] = tile;
        } else {
          this.grid[row][col] = null;
        }
      }
    }
  }

  /**
   * Destroy the board and all tiles. Called on scene shutdown.
   */
  destroy(): void {
    this.destroyAllTiles();
  }

  /** Reset the hint timer and clear cached hint (call on swap or turn start). */
  resetHintTimer(): void {
    this.hintTimer = this.scene.time.now;
    this.hintTriggered = false;
    this.hintCachedMove = null;
  }

  /** Find a random legal adjacent swap. Caches the move, but revalidates it before reuse. */
  private findHintMove(): { from: GridPosition; to: GridPosition } | null {
    if (this.hintCachedMove && this.isLegalAdjacentSwap(this.hintCachedMove.from, this.hintCachedMove.to)) {
      return this.hintCachedMove;
    }
    this.hintCachedMove = null;

    const candidates: Array<{ from: GridPosition; to: GridPosition }> = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (col < BOARD_SIZE - 1) {
          const from: GridPosition = { row, col };
          const to: GridPosition = { row, col: col + 1 };
          if (this.isLegalAdjacentSwap(from, to)) candidates.push({ from, to });
        }
        if (row < BOARD_SIZE - 1) {
          const from: GridPosition = { row, col };
          const to: GridPosition = { row: row + 1, col };
          if (this.isLegalAdjacentSwap(from, to)) candidates.push({ from, to });
        }
      }
    }

    if (candidates.length === 0) return null;
    this.hintCachedMove = candidates[Math.floor(Math.random() * candidates.length)];
    return this.hintCachedMove;
  }

  update(): void {
    // Drive tile effect overlays (breathing animations)
    const time = this.scene.time.now;
    const effectFrame: TileEffectFrame = {
      breath: 0.5 + 0.5 * Math.sin(time / 400),
      sandBreath: 0.5 + 0.5 * Math.sin(time / 600),
      slowBreath: 0.5 + 0.5 * Math.sin(time / 600),
      showdownTint: Phaser.Display.Color.HSLToColor(((time / 20) % 360) / 360, 0.8, 0.5).color,
    };

    for (const tile of [...this.effectTiles]) {
      if (tile.needsEffectUpdate()) {
        tile.updateEffects(time, effectFrame);
      } else {
        this.effectTiles.delete(tile);
      }
    }

    // Hint system: after 15s of inactivity, breathe-flash a valid move tile
    if (!this.isResolving && this.inputEnabled && !this.deadeyeMode && !this.shuffleHoldMode) {
      const elapsed = time - this.hintTimer;
      if (elapsed >= Board.HINT_INTERVAL && !this.hintTriggered) {
        this.hintTriggered = true;
        const move = this.findHintMove();
        if (move) {
          const fromTile = this.grid[move.from.row]?.[move.from.col];
          const toTile = this.grid[move.to.row]?.[move.to.col];
          if (fromTile) fromTile.startHint(Board.HINT_BREATHE_DURATION);
          if (toTile) toTile.startHint(Board.HINT_BREATHE_DURATION);
        }
        // Reset timer for next hint cycle
        this.hintTimer = time;
        this.hintTriggered = false;
      }
    }
  }
}
