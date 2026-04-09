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

  /**
   * Check if swapping two positions would produce at least one match.
   * Does NOT mutate the grid -- performs a virtual swap check.
   */
  wouldMatch(
    grid: (Tile | null)[][],
    size: number,
    a: GridPosition,
    b: GridPosition,
  ): boolean {
    const tileA = grid[a.row]?.[a.col];
    const tileB = grid[b.row]?.[b.col];
    if (!tileA || !tileB) return false;

    // Virtual swap: check each position with the other's type
    return (
      this.countsAtPosition(grid, size, a, tileB.type) >= 3 ||
      this.countsAtPosition(grid, size, b, tileA.type) >= 3
    );
  }

  /**
   * Count the longest run through a position if it held the given type.
   * Checks both horizontal and vertical axes, returns the max.
   */
  private countsAtPosition(
    grid: (Tile | null)[][],
    size: number,
    pos: GridPosition,
    type: string,
  ): number {
    let best = 0;

    // Horizontal run through pos
    let count = 1;
    for (let c = pos.col - 1; c >= 0; c--) {
      const t = grid[pos.row][c];
      if (c === pos.col) continue;
      if (t && t.type === type) count++;
      else break;
    }
    for (let c = pos.col + 1; c < size; c++) {
      const t = grid[pos.row][c];
      if (t && t.type === type) count++;
      else break;
    }
    best = Math.max(best, count);

    // Vertical run through pos
    count = 1;
    for (let r = pos.row - 1; r >= 0; r--) {
      const t = grid[r][pos.col];
      if (t && t.type === type) count++;
      else break;
    }
    for (let r = pos.row + 1; r < size; r++) {
      const t = grid[r][pos.col];
      if (t && t.type === type) count++;
      else break;
    }
    best = Math.max(best, count);

    return best;
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
            isShadow: false,
            isCross: false,
            crossIntersections: [],
            matchBonus: 1.0,
          });
        }
        runStart = inner;
      }
    }
    return results;
  }

  /**
   * Merge overlapping horizontal + vertical matches of the same type
   * into cross (L/T/+) patterns.
   */
  private mergeAndClassify(matches: MatchResult[]): MatchResult[] {
    if (matches.length <= 1) return matches;

    // Build a map of position -> which match indices include it
    const posKey = (p: GridPosition) => `${p.row},${p.col}`;
    const posToMatchIndices = new Map<string, number[]>();

    for (let i = 0; i < matches.length; i++) {
      for (const tile of matches[i].tiles) {
        const key = posKey(tile);
        const list = posToMatchIndices.get(key) ?? [];
        list.push(i);
        posToMatchIndices.set(key, list);
      }
    }

    // Find groups of matches that share at least one tile (same type)
    const visited = new Set<number>();
    const result: MatchResult[] = [];

    for (let i = 0; i < matches.length; i++) {
      if (visited.has(i)) continue;

      // BFS to find all connected matches of the same type
      const group = new Set<number>();
      const queue = [i];
      while (queue.length > 0) {
        const idx = queue.pop()!;
        if (group.has(idx)) continue;
        group.add(idx);
        visited.add(idx);

        for (const tile of matches[idx].tiles) {
          const key = posKey(tile);
          const overlapping = posToMatchIndices.get(key) ?? [];
          for (const other of overlapping) {
            if (
              !group.has(other) &&
              matches[other].tileType === matches[idx].tileType
            ) {
              queue.push(other);
            }
          }
        }
      }

      if (group.size === 1) {
        // Single match, no cross
        result.push(matches[i]);
      } else {
        // Merged cross pattern: union all tiles
        const allTiles = new Map<string, GridPosition>();
        for (const idx of group) {
          for (const tile of matches[idx].tiles) {
            allTiles.set(posKey(tile), tile);
          }
        }
        const mergedTiles = [...allTiles.values()];
        const totalLength = mergedTiles.length;

        // Find intersection points: positions that appear in 2+ original matches
        const posCount = new Map<string, number>();
        for (const idx of group) {
          for (const tile of matches[idx].tiles) {
            const key = posKey(tile);
            posCount.set(key, (posCount.get(key) ?? 0) + 1);
          }
        }
        const intersections: GridPosition[] = [];
        for (const [key, count] of posCount) {
          if (count > 1) {
            const parts = key.split(',');
            intersections.push({ row: Number(parts[0]), col: Number(parts[1]) });
          }
        }

        // If any constituent match is 5+, prioritize showdown over cross bomb
        let hasShowdownMatch = false;
        for (const idx of group) {
          if (matches[idx].length >= 5) {
            hasShowdownMatch = true;
            break;
          }
        }

        result.push({
          tiles: mergedTiles,
          tileType: matches[i].tileType,
          length: totalLength,
          isExplosive: false,
          isShowdown: hasShowdownMatch,
          isShadow: false,
          isCross: true,
          crossIntersections: intersections,
          matchBonus: 1.0,
        });
      }
    }

    return result;
  }
}
