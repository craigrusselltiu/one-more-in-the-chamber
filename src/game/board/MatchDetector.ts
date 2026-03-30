import type { Tile } from './Tile';
import type { MatchResult, GridPosition } from '../../types/combat';

/**
 * MatchDetector: scans the board grid for matches of 3+.
 * Detects horizontal, vertical, and cross (L/T/+) patterns.
 */
export class MatchDetector {
  findMatches(grid: (Tile | null)[][], size: number): MatchResult[] {
    const horizontal = this.findLineMatches(grid, size, 'horizontal');
    const vertical = this.findLineMatches(grid, size, 'vertical');
    return this.mergeAndClassify([...horizontal, ...vertical]);
  }

  private findLineMatches(
    grid: (Tile | null)[][],
    size: number,
    direction: 'horizontal' | 'vertical',
  ): MatchResult[] {
    const results: MatchResult[] = [];

    for (let outer = 0; outer < size; outer++) {
      let runStart = 0;
      for (let inner = 1; inner <= size; inner++) {
        const getCell = (idx: number) =>
          direction === 'horizontal'
            ? grid[outer]?.[idx]
            : grid[idx]?.[outer];

        const current = inner < size ? getCell(inner) : null;
        const prev = getCell(inner - 1);

        if (inner < size && current && prev && current.type === prev.type) {
          continue;
        }

        const runLength = inner - runStart;
        if (runLength >= 3 && prev) {
          const tiles: GridPosition[] = [];
          for (let i = runStart; i < inner; i++) {
            tiles.push(
              direction === 'horizontal'
                ? { row: outer, col: i }
                : { row: i, col: outer },
            );
          }
          results.push({
            tiles,
            tileType: prev.type,
            length: runLength,
            isExplosive: runLength === 4,
            isShowdown: runLength >= 5,
            isCross: false,
            matchBonus: runLength === 4 ? 1.5 : runLength >= 5 ? 2.0 : 1.0,
          });
        }
        runStart = inner;
      }
    }
    return results;
  }

  private mergeAndClassify(matches: MatchResult[]): MatchResult[] {
    // TODO: detect cross/L/T patterns from overlapping horizontal+vertical matches
    return matches;
  }
}
