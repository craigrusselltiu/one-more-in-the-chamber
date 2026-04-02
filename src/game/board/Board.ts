import Phaser from 'phaser';
import { Tile, TILE_SIZE } from './Tile';
import { MatchDetector } from './MatchDetector';
import { CascadeResolver } from './CascadeResolver';
import type { GravityDirection } from './CascadeResolver';
import type { TileType } from '../../types/game';
import type { GridPosition, MatchResult } from '../../types/combat';
import type { SerializedBoard, SerializedTile } from '../../types/combatSnapshot';
import { EventBus, GameEvent } from '../EventBus';
import { TILE_COLORS } from '../../data/tiles';

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
  /** Bag-based tile generation: one of each active type, shuffled. Refilled when empty. */
  private tileTypeBag: TileType[] = [];
  private isResolving = false;
  private selectedTile: GridPosition | null = null;
  private inputEnabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, tileTypes?: TileType[]) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.matchDetector = new MatchDetector();
    this.cascadeResolver = new CascadeResolver();
    if (tileTypes) this.activeTileTypes = tileTypes;
    this.initGrid();
    this.setupInput();
  }

  // -- Grid initialization --

  private initGrid(): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tileType = this.randomTileType();
        const tile = new Tile(
          this.scene,
          this.tileX(col),
          this.tileY(row),
          tileType,
          row,
          col,
        );
        this.grid[row][col] = tile;
      }
    }
    this.removeInitialMatches();
  }

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

  private setupInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inputEnabled || this.isResolving) return;
      const pos = this.pointerToGrid(pointer);
      if (!pos) return;

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
        } else if (this.isAdjacent(this.selectedTile, pos)) {
          // Clicked adjacent tile: route through CombatManager
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

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
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
    if (tile.hazard?.type === 'lock' || tile.hazard?.type === 'hardened_lock') return;

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
    onCascadeStep?: (matches: MatchResult[]) => void,
  ): Promise<SwapResult> {
    if (this.isResolving) return { valid: false, matches: [] };

    const tileA = this.grid[from.row]?.[from.col];
    const tileB = this.grid[to.row]?.[to.col];
    if (!tileA || !tileB) return { valid: false, matches: [] };

    // Don't allow swapping locked tiles (no animation either)
    const aLock = tileA.hazard?.type === 'lock' || tileA.hazard?.type === 'hardened_lock';
    const bLock = tileB.hazard?.type === 'lock' || tileB.hazard?.type === 'hardened_lock';
    if (aLock || bLock) {
      return { valid: false, matches: [] };
    }

    // Handle showdown tile swap: destroy all tiles of the adjacent type
    if (tileA.isShowdown || tileB.isShowdown) {
      return this.resolveShowdownSwap(from, to, onCascadeStep);
    }

    // Block input during swap animation
    this.isResolving = true;

    // Animate the swap visually
    const dur = Board.SWAP_DURATION;
    await Promise.all([
      tileA.tweenToPosition(this.tileX(to.col), this.tileY(to.row), dur),
      tileB.tweenToPosition(this.tileX(from.col), this.tileY(from.row), dur),
    ]);

    // Update grid positions
    this.swapTilesInGrid(from, to);

    // Check if swap produces matches
    const matches = this.findMatches();
    if (matches.length === 0) {
      // No match: animate swap back (bounce-back)
      this.swapTilesInGrid(from, to);
      await Promise.all([
        tileA.tweenToPosition(this.tileX(from.col), this.tileY(from.row), dur),
        tileB.tweenToPosition(this.tileX(to.col), this.tileY(to.row), dur),
      ]);
      this.isResolving = false;
      return { valid: false, matches: [] };
    }

    // Valid swap: resolve all cascades
    EventBus.emit(GameEvent.SWAPS_CHANGE);
    const allMatches = await this.cascadeResolver.resolve(this, onCascadeStep);

    // After cascade: check for no valid moves
    if (!this.hasValidMoves()) {
      this.reshuffle();
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
    onCascadeStep?: (matches: MatchResult[]) => void,
  ): Promise<SwapResult> {
    const tileA = this.grid[from.row][from.col]!;
    const tileB = this.grid[to.row][to.col]!;

    const showdownTile = tileA.isShowdown ? tileA : tileB;
    const targetTile = tileA.isShowdown ? tileB : tileA;
    const targetType = targetTile.type;
    const showdownPos = tileA.isShowdown ? from : to;

    this.isResolving = true;

    // Consume the showdown tile first so it is excluded from the type scan below
    showdownTile.destroy();
    this.grid[showdownPos.row][showdownPos.col] = null;

    // Trigger all tiles of the target type: collect positions, then destroy
    const triggered: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === targetType) {
          triggered.push({ row, col });
          tile.destroy();
          this.grid[row][col] = null;
        }
      }
    }

    // Flash lines from showdown tile to each triggered tile
    for (const pos of triggered) {
      EventBus.emit(GameEvent.FLASH_LINE, showdownPos, pos, targetType);
    }

    // Build a MatchResult so CombatManager.processMatches applies effects
    // (damage, block, gold, etc.) for every triggered tile at 1.0x per tile.
    const showdownMatch: MatchResult = {
      tiles: triggered,
      tileType: targetType,
      length: triggered.length,
      isExplosive: false,
      isShowdown: true,
      isCross: false,
      crossIntersections: [],
      matchBonus: 1.0,
    };

    // Apply showdown effects immediately so the player sees them right away
    if (onCascadeStep) {
      onCascadeStep([showdownMatch]);
    }

    // Apply gravity and fill so cascades resolve from a stable board state
    this.cascadeResolver.applyGravity(this);
    this.fillEmptyTiles();

    // Resolve any new matches that form after the board refills
    const cascadeMatches = await this.cascadeResolver.resolve(this, onCascadeStep);
    const allMatches = [showdownMatch, ...cascadeMatches];

    if (!this.hasValidMoves()) {
      this.reshuffle();
    }

    this.isResolving = false;
    return { valid: true, matches: allMatches };
  }

  // -- Explosive tile detonation --

  /**
   * Detonate an explosive tile at the given position.
   * Clears a 3x3 area around it. Called during match resolution
   * when an explosive tile is part of a match.
   */
  detonateExplosive(row: number, col: number): GridPosition[] {
    const cleared: GridPosition[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
        const tile = this.grid[r][c];
        if (tile) {
          cleared.push({ row: r, col: c });
          tile.destroy();
          this.grid[r][c] = null;
        }
      }
    }
    return cleared;
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
    kind: 'explosive' | 'showdown',
  ): void {
    // Destroy existing tile if present
    const existing = this.grid[row][col];
    if (existing) existing.destroy();

    const tile = new Tile(
      this.scene,
      this.tileX(col),
      this.tileY(row),
      type,
      row,
      col,
    );

    if (kind === 'explosive') {
      tile.setExplosive(true);
    } else {
      tile.setShowdown(true);
    }

    this.grid[row][col] = tile;
  }

  // -- Fill empty cells --

  fillEmptyTiles(): void {
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (this.grid[row][col] === null) {
          const type = this.randomTileType();
          const tile = new Tile(
            this.scene,
            this.tileX(col),
            this.tileY(row),
            type,
            row,
            col,
          );
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

    if (this.cascadeResolver.getGravityDirection() === 'left') {
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
            const tile = new Tile(this.scene, startX, this.tileY(row), type, row, col);
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
            const tile = new Tile(this.scene, this.tileX(col), startY, type, row, col);
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
  async animateTileClear(tiles: Tile[]): Promise<void> {
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

    await Promise.all(tiles.map(t => t.animateClear(150)));
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
    const moves: Array<{ tile: Tile; toX: number; toY: number }> = [];

    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        const startY = this.originY - (BOARD_SIZE - row) * TILE_SIZE;
        tile.setPosition(this.tileX(col), startY);
        moves.push({ tile, toX: this.tileX(col), toY: this.tileY(row) });
      }
    }

    await this.animateGravityDrop(moves);
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
          this.swapTilesInGrid(a, b);
          const has = this.findMatches().length > 0;
          this.swapTilesInGrid(a, b); // revert
          if (has) return true;
        }
        // Check bottom neighbor
        if (row < BOARD_SIZE - 1) {
          const a: GridPosition = { row, col };
          const b: GridPosition = { row: row + 1, col };
          this.swapTilesInGrid(a, b);
          const has = this.findMatches().length > 0;
          this.swapTilesInGrid(a, b); // revert
          if (has) return true;
        }
      }
    }
    return false;
  }

  /**
   * Reshuffle the board until at least one valid move exists.
   * Preserves tile types but randomizes positions. Avoids initial matches.
   */
  reshuffle(): void {
    // Collect all current tile types (preserve distribution)
    const types: TileType[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile) types.push(tile.type);
      }
    }

    let attempts = 0;
    const maxAttempts = 100;

    do {
      // Fisher-Yates shuffle
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }

      // Reassign types to grid
      let idx = 0;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const tile = this.grid[row][col];
          if (tile && idx < types.length) {
            tile.setType(types[idx]);
            idx++;
          }
        }
      }

      // Remove any initial matches
      this.removeInitialMatches();
      attempts++;
    } while (!this.hasValidMoves() && attempts < maxAttempts);

    // If we still have no valid moves after max attempts, regenerate the grid
    if (!this.hasValidMoves()) {
      this.destroyAllTiles();
      this.initGrid();
    }
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
    return this.tileTypeBag.pop()!;
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
    return types[Math.floor(Math.random() * types.length)];
  }

  // -- Public API --

  setActiveTileTypes(types: TileType[]): void {
    this.activeTileTypes = types;
    this.tileTypeBag = [];
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
  pickAndRemoveRandomTile(): { type: TileType; position: GridPosition } | null {
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
    tile.destroy();
    this.grid[pick.row][pick.col] = null;
    return { type, position: pick };
  }

  /**
   * Clear all tiles of a given type from the board.
   * Returns the number of tiles cleared. Used by Deadeye + Showdown.
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
   * Apply gravity and fill empty cells. Used after Deadeye
   * destroys tiles, before cascade resolution.
   */
  applyGravityAndFill(): void {
    this.cascadeResolver.applyGravity(this);
    this.fillEmptyTiles();
  }

  setGravityDirection(direction: GravityDirection): void {
    this.cascadeResolver.setGravityDirection(direction);
  }

  getGravityDirection(): GravityDirection {
    return this.cascadeResolver.getGravityDirection();
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) this.clearSelection();
  }

  getSelectedTile(): GridPosition | null {
    return this.selectedTile ? { ...this.selectedTile } : null;
  }

  /**
   * Clear all hazards of a given type from the board.
   * Used by consumables (Skeleton Key, Bandage, Signal Flare).
   */
  clearHazardsByType(hazardType: 'lock' | 'hardened_lock' | 'poison' | 'bomb' | 'sand'): void {
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
    this.cascadeResolver.setGravityDirection(snapshot.gravityDirection);

    for (let row = 0; row < BOARD_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const data = snapshot.tiles[row]?.[col];
        if (data) {
          const tile = new Tile(
            this.scene,
            this.tileX(col),
            this.tileY(row),
            data.type,
            row,
            col,
          );
          if (data.isExplosive) tile.setExplosive(true);
          if (data.isShowdown) tile.setShowdown(true);
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

  update(): void {
    // Per-frame updates (animations, etc.)
  }
}
