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
      this.applyGravity(board);
      this.fillEmpty(board);
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

  private applyGravity(board: Board): void {
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
            const origin = board.getOrigin();
            tile.setPosition(origin.x + col * 32, origin.y + writeRow * 32);
          }
          writeRow--;
        }
      }
    }
  }

  private fillEmpty(board: Board): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();

    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) {
        if (grid[row][col] === null) {
          // Tile creation requires a Phaser scene reference.
          // This is wired through Board.fillEmptyTiles() in the full implementation.
          // For now, leave empty cells as null -- Board handles fill after cascade.
        }
      }
    }
  }
}
