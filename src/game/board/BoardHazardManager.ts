import type { Board } from './Board';
import type { GridPosition } from '../../types/combat';
import type { TileHazardState } from '../../types/tiles';

const BOARD_SIZE = 8;

export interface HazardPlacement {
  position: GridPosition;
  hazard: TileHazardState;
}

/**
 * BoardHazardManager: places, ticks, and removes hazards on the board.
 *
 * Hazard types (from SPEC):
 *   Lock          -- can't swap. Match adjacent to free.
 *   Hardened lock -- can't swap. Needs 2 adjacent matches to free (Iron Eye Isabella Phase 2).
 *   Poison        -- hurts player or debuffs on match.
 *   Bomb          -- countdown timer. Detonates (damages player) if not matched. Matching defuses.
 *   Sand          -- hidden tile. Match adjacent to reveal.
 */
export class BoardHazardManager {
  private board: Board;

  constructor(board: Board) {
    this.board = board;
  }

  // ---------------------------------------------------------------------------
  // Placement
  // ---------------------------------------------------------------------------

  /** Lock N random non-hazarded tiles. */
  placeRandomLocks(count: number): HazardPlacement[] {
    return this.placeRandomHazard({ type: 'lock' }, count);
  }

  /** Place hardened locks on N random non-hazarded tiles. Requires `hits` adjacent matches to free. */
  placeRandomHardenedLocks(count: number, hits = 2): HazardPlacement[] {
    return this.placeRandomHazard({ type: 'hardened_lock', hits }, count);
  }

  /** Poison N random non-hazarded tiles. */
  placeRandomPoison(count: number): HazardPlacement[] {
    return this.placeRandomHazard({ type: 'poison' }, count);
  }

  /** Place a bomb on N random non-hazarded tiles with a countdown. */
  placeRandomBombs(count: number, countdown = 3): HazardPlacement[] {
    return this.placeRandomHazard({ type: 'bomb', countdown }, count);
  }

  /** Bury (sand) N random non-hazarded tiles. */
  placeRandomSand(count: number): HazardPlacement[] {
    return this.placeRandomHazard({ type: 'sand' }, count);
  }

  /**
   * Place fool's gold on N random non-gold, non-hazarded tiles.
   * Converts the tile's type to 'gold' so it looks identical, then marks
   * it with a hidden fools_gold hazard. When matched, gold output is zeroed.
   */
  placeRandomFoolsGold(count: number): HazardPlacement[] {
    const candidates = this.getNonGoldFreeTiles();
    const placements: HazardPlacement[] = [];

    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const pos = candidates.splice(idx, 1)[0];
      const tile = this.board.getGrid()[pos.row][pos.col];
      if (tile) {
        tile.setType('gold');
        tile.hazard = { type: 'fools_gold' };
        placements.push({ position: pos, hazard: { type: 'fools_gold' } });
      }
    }

    return placements;
  }

  /** Lock an entire column. */
  lockColumn(col: number): HazardPlacement[] {
    const placements: HazardPlacement[] = [];
    const grid = this.board.getGrid();
    for (let row = 0; row < BOARD_SIZE; row++) {
      const tile = grid[row]?.[col];
      if (tile && !tile.hazard) {
        tile.hazard = { type: 'lock' };
        placements.push({ position: { row, col }, hazard: { type: 'lock' } });
      }
    }
    return placements;
  }

  /** Lock the bottom row. */
  lockBottomRow(): HazardPlacement[] {
    const placements: HazardPlacement[] = [];
    const grid = this.board.getGrid();
    const row = BOARD_SIZE - 1;
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = grid[row]?.[col];
      if (tile && !tile.hazard) {
        tile.hazard = { type: 'lock' };
        placements.push({ position: { row, col }, hazard: { type: 'lock' } });
      }
    }
    return placements;
  }

  /** Lock an entire row. */
  lockRow(row: number): HazardPlacement[] {
    const placements: HazardPlacement[] = [];
    const grid = this.board.getGrid();
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = grid[row]?.[col];
      if (tile && !tile.hazard) {
        tile.hazard = { type: 'lock' };
        placements.push({ position: { row, col }, hazard: { type: 'lock' } });
      }
    }
    return placements;
  }

  // ---------------------------------------------------------------------------
  // Bomb ticking
  // ---------------------------------------------------------------------------

  /**
   * Tick all bomb countdowns down by 1. Returns positions of detonated bombs
   * (countdown reached 0) and the damage they deal.
   */
  tickBombs(): { detonations: GridPosition[]; totalDamage: number } {
    const grid = this.board.getGrid();
    const detonations: GridPosition[] = [];
    const BOMB_DAMAGE = 10;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = grid[row][col];
        if (!tile || !tile.hazard || tile.hazard.type !== 'bomb') continue;

        tile.hazard.countdown--;
        if (tile.hazard.countdown <= 0) {
          detonations.push({ row, col });
          tile.hazard = null;
        } else {
          // In-place mutation: nudge the setter to refresh the countdown display
          tile.refreshStatusIndicator();
        }
      }
    }

    return { detonations, totalDamage: detonations.length * BOMB_DAMAGE };
  }

  // ---------------------------------------------------------------------------
  // Hazard clearing (called when adjacent matches occur)
  // ---------------------------------------------------------------------------

  /**
   * After a match resolves, check if any hazarded tiles are adjacent to
   * matched tiles and should be freed. Call this after each match step.
   */
  resolveAdjacentHazards(matchedPositions: GridPosition[]): GridPosition[] {
    const grid = this.board.getGrid();
    const freed: GridPosition[] = [];
    const seen = new Set<string>();

    for (const pos of matchedPositions) {
      const neighbors = this.getNeighbors(pos);
      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const tile = grid[n.row]?.[n.col];
        if (!tile || !tile.hazard) continue;

        const hazType = tile.hazard.type;
        // Lock: match adjacent to free
        // Hardened lock: decrement hits; free when hits reach 0
        // Sand: match adjacent to reveal
        // Bomb: matching the bomb tile itself defuses; adjacent matches don't defuse
        if (hazType === 'lock' || hazType === 'sand') {
          tile.hazard = null;
          freed.push(n);
        } else if (hazType === 'hardened_lock') {
          tile.hazard.hits--;
          if (tile.hazard.hits <= 0) {
            tile.hazard = null;
            freed.push(n);
          } else {
            tile.refreshStatusIndicator();
          }
        }
      }
    }

    return freed;
  }

  /** Remove all hazards of a specific type from the board. */
  clearAllOfType(type: TileHazardState['type']): GridPosition[] {
    const grid = this.board.getGrid();
    const cleared: GridPosition[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = grid[row][col];
        if (tile?.hazard?.type === type) {
          tile.hazard = null;
          cleared.push({ row, col });
        }
      }
    }

    return cleared;
  }

  /** Count tiles with a specific hazard type. */
  countHazards(type: TileHazardState['type']): number {
    const grid = this.board.getGrid();
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (grid[row][col]?.hazard?.type === type) count++;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private placeRandomHazard(hazard: TileHazardState, count: number): HazardPlacement[] {
    const candidates = this.getFreeTiles();
    const placements: HazardPlacement[] = [];

    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const pos = candidates.splice(idx, 1)[0];
      const tile = this.board.getGrid()[pos.row][pos.col];
      if (tile) {
        tile.hazard = { ...hazard };
        placements.push({ position: pos, hazard: { ...hazard } });
      }
    }

    return placements;
  }

  private getFreeTiles(): GridPosition[] {
    const grid = this.board.getGrid();
    const free: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = grid[row][col];
        if (tile && !tile.hazard && !tile.isExplosive && !tile.isShowdown) {
          free.push({ row, col });
        }
      }
    }
    return free;
  }

  /** Free tiles that are NOT already gold (used for fool's gold placement). */
  private getNonGoldFreeTiles(): GridPosition[] {
    const grid = this.board.getGrid();
    const free: GridPosition[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = grid[row][col];
        if (tile && !tile.hazard && !tile.isExplosive && !tile.isShowdown && tile.type !== 'gold') {
          free.push({ row, col });
        }
      }
    }
    return free;
  }

  private getNeighbors(pos: GridPosition): GridPosition[] {
    const neighbors: GridPosition[] = [];
    const { row, col } = pos;
    if (row > 0) neighbors.push({ row: row - 1, col });
    if (row < BOARD_SIZE - 1) neighbors.push({ row: row + 1, col });
    if (col > 0) neighbors.push({ row, col: col - 1 });
    if (col < BOARD_SIZE - 1) neighbors.push({ row, col: col + 1 });
    return neighbors;
  }
}
