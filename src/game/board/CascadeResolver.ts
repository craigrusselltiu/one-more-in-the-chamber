import type { Board } from './Board';
import type { MatchResult } from '../../types/combat';

/**
 * CascadeResolver: gravity + chain resolution.
 * After matches clear, tiles fall and new tiles spawn. Repeat until stable.
 */
export class CascadeResolver {
  async resolve(board: Board): Promise<MatchResult[]> {
    const allMatches: MatchResult[] = [];
    let matches = board.findMatches();

    while (matches.length > 0) {
      allMatches.push(...matches);
      this.clearMatches(board, matches);
      this.spawnSpecials(board, matches);
      this.applyGravity(board);
      board.fillEmptyTiles();
      matches = board.findMatches();
    }

    return allMatches;
  }

  private clearMatches(board: Board, matches: MatchResult[]): void {
    const grid = board.getGrid();
    for (const match of matches) {
      for (const pos of match.tiles) {
        const tile = grid[pos.row]?.[pos.col];
        if (tile) {
          tile.destroy();
          grid[pos.row][pos.col] = null;
        }
      }
    }
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
}
