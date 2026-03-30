import Phaser from 'phaser';
import { Tile, TILE_SIZE } from './Tile';
import { MatchDetector } from './MatchDetector';
import { CascadeResolver } from './CascadeResolver';
import type { TileType } from '../../types/game';
import type { GridPosition, MatchResult } from '../../types/combat';
import { EventBus, GameEvent } from '../EventBus';

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
  private isResolving = false;
  private selectedTile: GridPosition | null = null;
  private inputEnabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.matchDetector = new MatchDetector();
    this.cascadeResolver = new CascadeResolver();
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

  private setupInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inputEnabled || this.isResolving) return;
      const pos = this.pointerToGrid(pointer);
      if (!pos) return;

      if (this.selectedTile) {
        if (
          pos.row === this.selectedTile.row &&
          pos.col === this.selectedTile.col
        ) {
          // Clicked same tile: deselect
          this.clearSelection();
        } else if (this.isAdjacent(this.selectedTile, pos)) {
          // Clicked adjacent tile: attempt swap
          const from = { ...this.selectedTile };
          this.clearSelection();
          this.trySwap(from, pos);
        } else {
          // Clicked non-adjacent: select the new tile
          this.clearSelection();
          this.selectTile(pos);
        }
      } else {
        this.selectTile(pos);
      }
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

    // Don't allow selecting locked tiles
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

  /**
   * Attempt to swap two tiles. Validates adjacency and match production.
   * Returns the result including all matches from the full cascade chain.
   */
  async trySwap(from: GridPosition, to: GridPosition): Promise<SwapResult> {
    if (this.isResolving) return { valid: false, matches: [] };

    const tileA = this.grid[from.row]?.[from.col];
    const tileB = this.grid[to.row]?.[to.col];
    if (!tileA || !tileB) return { valid: false, matches: [] };

    // Don't allow swapping locked tiles
    if (tileA.hazard?.type === 'lock' || tileB.hazard?.type === 'lock') {
      return { valid: false, matches: [] };
    }

    // Handle showdown tile swap: destroy all tiles of the adjacent type
    if (tileA.isShowdown || tileB.isShowdown) {
      return this.resolveShowdownSwap(from, to);
    }

    // Perform the swap
    this.swapTilesInGrid(from, to);

    // Check if swap produces matches
    const matches = this.findMatches();
    if (matches.length === 0) {
      // No match: revert
      this.swapTilesInGrid(from, to);
      return { valid: false, matches: [] };
    }

    // Valid swap: resolve all cascades
    this.isResolving = true;
    EventBus.emit(GameEvent.SWAPS_CHANGE);
    const allMatches = await this.cascadeResolver.resolve(this);

    // After cascade: check for no valid moves
    if (!this.hasValidMoves()) {
      this.reshuffle();
    }

    this.isResolving = false;
    return { valid: true, matches: allMatches };
  }

  private swapTilesInGrid(a: GridPosition, b: GridPosition): void {
    const tileA = this.grid[a.row][a.col];
    const tileB = this.grid[b.row][b.col];

    this.grid[a.row][a.col] = tileB;
    this.grid[b.row][b.col] = tileA;

    if (tileA) {
      tileA.row = b.row;
      tileA.col = b.col;
      this.updateTilePosition(tileA);
    }
    if (tileB) {
      tileB.row = a.row;
      tileB.col = a.col;
      this.updateTilePosition(tileB);
    }
  }

  // -- Showdown tile resolution --

  private async resolveShowdownSwap(
    from: GridPosition,
    to: GridPosition,
  ): Promise<SwapResult> {
    const tileA = this.grid[from.row][from.col]!;
    const tileB = this.grid[to.row][to.col]!;

    // The showdown tile is destroyed; all tiles of the adjacent tile's type are cleared
    const showdownTile = tileA.isShowdown ? tileA : tileB;
    const targetTile = tileA.isShowdown ? tileB : tileA;
    const targetType = targetTile.type;
    const showdownPos = tileA.isShowdown ? from : to;

    this.isResolving = true;

    // Destroy the showdown tile
    showdownTile.destroy();
    this.grid[showdownPos.row][showdownPos.col] = null;

    // Destroy all tiles of the target type
    const cleared: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type === targetType) {
          cleared.push({ row, col });
          tile.destroy();
          this.grid[row][col] = null;
        }
      }
    }

    const showdownMatch: MatchResult = {
      tiles: cleared,
      tileType: targetType,
      length: cleared.length,
      isExplosive: false,
      isShowdown: true,
      isCross: false,
      crossIntersections: [],
      matchBonus: 1.0, // Each cleared tile generates 1.0x resource
    };

    // Apply gravity and fill
    this.cascadeResolver.applyGravity(this);
    this.fillEmptyTiles();

    // Continue resolving any new matches
    const cascadeMatches = await this.cascadeResolver.resolve(this);
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

  private randomTileType(): TileType {
    const types = this.activeTileTypes;
    return types[Math.floor(Math.random() * types.length)];
  }

  private randomTileTypeExcluding(exclude: TileType): TileType {
    const types = this.activeTileTypes.filter((t) => t !== exclude);
    return types[Math.floor(Math.random() * types.length)];
  }

  // -- Public API --

  setActiveTileTypes(types: TileType[]): void {
    this.activeTileTypes = types;
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

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) this.clearSelection();
  }

  getSelectedTile(): GridPosition | null {
    return this.selectedTile ? { ...this.selectedTile } : null;
  }

  update(): void {
    // Per-frame updates (animations, etc.)
  }
}
