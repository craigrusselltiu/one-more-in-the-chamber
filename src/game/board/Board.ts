import Phaser from 'phaser';
import { Tile } from './Tile';
import { MatchDetector } from './MatchDetector';
import { CascadeResolver } from './CascadeResolver';
import type { TileType } from '../../types/game';
import type { GridPosition, MatchResult } from '../../types/combat';

const BOARD_SIZE = 8;
const TILE_SIZE = 32;

/**
 * Board: 8x8 grid manager.
 * Handles tile creation, swap input, match detection, and cascade resolution.
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.matchDetector = new MatchDetector();
    this.cascadeResolver = new CascadeResolver();
    this.initGrid();
  }

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
    // Remove any initial matches by re-rolling
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
          // Check horizontal
          if (col >= 2) {
            const t1 = this.grid[row][col - 1];
            const t2 = this.grid[row][col - 2];
            if (t1 && t2 && t1.type === tile.type && t2.type === tile.type) {
              tile.setType(this.randomTileTypeExcluding(tile.type));
              hasMatches = true;
            }
          }
          // Check vertical
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

  private randomTileType(): TileType {
    const types = this.activeTileTypes;
    return types[Math.floor(Math.random() * types.length)];
  }

  private randomTileTypeExcluding(exclude: TileType): TileType {
    const types = this.activeTileTypes.filter((t) => t !== exclude);
    return types[Math.floor(Math.random() * types.length)];
  }

  private tileX(col: number): number {
    return this.originX + col * TILE_SIZE;
  }

  private tileY(row: number): number {
    return this.originY + row * TILE_SIZE;
  }

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

  update(): void {
    // Per-frame updates (animations, etc.)
  }
}
