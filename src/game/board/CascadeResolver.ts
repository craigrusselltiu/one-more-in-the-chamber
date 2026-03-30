import type { TileType } from '../../types/game';
import type { Board } from './Board';
import type { MatchResult, GridPosition } from '../../types/combat';

export type GravityDirection = 'down' | 'left';

/**
 * CascadeResolver: gravity + chain resolution.
 * After matches clear, tiles fall and new tiles spawn. Repeat until stable.
 *
 * Handles special tile mechanics during clearing:
 * - Explosive tiles: when matched, detonate 3x3 area around them
 * - Cross clear (L/T/+): clear full row + column from intersection point(s)
 *
 * Supports gravity direction override (e.g. Dusty Dan Phase 2: gravity shifts left).
 */
export class CascadeResolver {
  private gravityDirection: GravityDirection = 'down';

  setGravityDirection(direction: GravityDirection): void {
    this.gravityDirection = direction;
  }

  getGravityDirection(): GravityDirection {
    return this.gravityDirection;
  }

  async resolve(board: Board): Promise<MatchResult[]> {
    const allMatches: MatchResult[] = [];
    let matches = board.findMatches();

    while (matches.length > 0) {
      allMatches.push(...matches);
      const extraResults = this.clearMatches(board, matches);
      allMatches.push(...extraResults);
      this.spawnSpecials(board, matches);
      this.applyGravity(board);
      board.fillEmptyTiles();
      matches = board.findMatches();
    }

    return allMatches;
  }

  /**
   * Clear all tiles from matches plus any tiles from explosive detonation
   * and cross clear expansion. Returns additional MatchResult entries
   * for tiles cleared by these special mechanics (grouped by type).
   */
  private clearMatches(board: Board, matches: MatchResult[]): MatchResult[] {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const posKey = (r: number, c: number) => `${r},${c}`;

    // Phase 1: Collect all positions from original matches
    const matchPositions = new Set<string>();
    for (const match of matches) {
      for (const pos of match.tiles) {
        matchPositions.add(posKey(pos.row, pos.col));
      }
    }

    // Phase 2: Expand for cross clears and explosive detonations
    // Capture tile types before any destruction
    const extraTiles = new Map<string, TileType>();

    // Cross clear expansion: clear full row + column from each intersection
    for (const match of matches) {
      if (!match.isCross || match.crossIntersections.length === 0) continue;
      for (const inter of match.crossIntersections) {
        // Entire row through intersection
        for (let c = 0; c < size; c++) {
          const key = posKey(inter.row, c);
          if (matchPositions.has(key) || extraTiles.has(key)) continue;
          const tile = grid[inter.row]?.[c];
          if (tile) extraTiles.set(key, tile.type);
        }
        // Entire column through intersection
        for (let r = 0; r < size; r++) {
          const key = posKey(r, inter.col);
          if (matchPositions.has(key) || extraTiles.has(key)) continue;
          const tile = grid[r]?.[inter.col];
          if (tile) extraTiles.set(key, tile.type);
        }
      }
    }

    // Explosive detonation: 3x3 area around explosive tiles that are part of a match
    // Per SPEC: explosive tiles "must be matched to detonate"
    for (const match of matches) {
      for (const pos of match.tiles) {
        const tile = grid[pos.row]?.[pos.col];
        if (!tile?.isExplosive) continue;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = pos.row + dr;
            const c = pos.col + dc;
            if (r < 0 || r >= size || c < 0 || c >= size) continue;
            const key = posKey(r, c);
            if (matchPositions.has(key) || extraTiles.has(key)) continue;
            const adjTile = grid[r]?.[c];
            if (adjTile) extraTiles.set(key, adjTile.type);
          }
        }
      }
    }

    // Phase 3: Destroy all tiles (match tiles first, then extras)
    for (const match of matches) {
      for (const pos of match.tiles) {
        const tile = grid[pos.row]?.[pos.col];
        if (tile) {
          tile.destroy();
          grid[pos.row][pos.col] = null;
        }
      }
    }

    for (const [key] of extraTiles) {
      const parts = key.split(',');
      const r = Number(parts[0]);
      const c = Number(parts[1]);
      const tile = grid[r]?.[c];
      if (tile) {
        tile.destroy();
        grid[r][c] = null;
      }
    }

    // Phase 4: Group extra tiles by type into additional MatchResults
    const byType = new Map<TileType, GridPosition[]>();
    for (const [key, type] of extraTiles) {
      const parts = key.split(',');
      const pos: GridPosition = { row: Number(parts[0]), col: Number(parts[1]) };
      const list = byType.get(type) ?? [];
      list.push(pos);
      byType.set(type, list);
    }

    const additionalResults: MatchResult[] = [];
    for (const [type, tiles] of byType) {
      additionalResults.push({
        tiles,
        tileType: type,
        length: tiles.length,
        isExplosive: false,
        isShowdown: false,
        isCross: false,
        crossIntersections: [],
        matchBonus: 1.0,
      });
    }

    return additionalResults;
  }

  /**
   * Spawn explosive/showdown tiles after 4-match or 5-match.
   * Places the special tile at the center of the cleared match area.
   */
  private spawnSpecials(board: Board, matches: MatchResult[]): void {
    for (const match of matches) {
      if (match.isCross) continue; // Cross clears don't spawn specials

      if (match.isShowdown && match.tiles.length > 0) {
        // 5-match: spawn showdown tile at midpoint
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        board.spawnSpecialTile(mid.row, mid.col, match.tileType, 'showdown');
      } else if (match.isExplosive && match.tiles.length > 0) {
        // 4-match: spawn explosive tile at midpoint
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        board.spawnSpecialTile(mid.row, mid.col, match.tileType, 'explosive');
      }
    }
  }

  applyGravity(board: Board): void {
    if (this.gravityDirection === 'left') {
      this.applyGravityLeft(board);
    } else {
      this.applyGravityDown(board);
    }
  }

  private applyGravityDown(board: Board): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();

    for (let col = 0; col < size; col++) {
      let writeRow = size - 1;
      for (let row = size - 1; row >= 0; row--) {
        if (grid[row][col] !== null) {
          if (row !== writeRow) {
            grid[writeRow][col] = grid[row][col];
            grid[row][col] = null;
            const tile = grid[writeRow][col]!;
            tile.row = writeRow;
            tile.col = col;
            board.updateTilePosition(tile);
          }
          writeRow--;
        }
      }
    }
  }

  /** Gravity shifts left: tiles fall to the left instead of down. */
  private applyGravityLeft(board: Board): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();

    for (let row = 0; row < size; row++) {
      let writeCol = 0;
      for (let col = 0; col < size; col++) {
        if (grid[row][col] !== null) {
          if (col !== writeCol) {
            grid[row][writeCol] = grid[row][col];
            grid[row][col] = null;
            const tile = grid[row][writeCol]!;
            tile.row = row;
            tile.col = writeCol;
            board.updateTilePosition(tile);
          }
          writeCol++;
        }
      }
    }
  }
}
