import type { TileType } from '../../types/game';
import type { Board } from './Board';
import type { Tile } from './Tile';
import type { MatchResult, GridPosition } from '../../types/combat';
import { getSpeedMultiplier } from '../../store/settingsStore';

export type GravityDirection = 'down' | 'left' | 'up' | 'right';

/**
 * CascadeResolver: gravity + chain resolution with animations.
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

  /**
   * Resolve all cascades with animations.
   * @param onStep Called after each cascade step with that step's matches,
   *               so effects (damage, block, etc.) can be applied mid-cascade.
   */
  async resolve(
    board: Board,
    onStep?: (matches: MatchResult[]) => void,
    swapTarget?: GridPosition,
  ): Promise<MatchResult[]> {
    const allMatches: MatchResult[] = [];
    let matches = board.findMatches();
    let isFirstStep = true;

    while (matches.length > 0) {
      // Step 1: Collect positions and match metadata, then destroy with effects
      const { allPositions, firePositions, matchMetadata } = this.prepareClear(board, matches);
      const destroyed = await board.destroyTilesWithEffects(allPositions);

      // Build extra match results from tiles destroyed by explosive/showdown chain
      // (tiles not in the original match positions)
      const matchPosKeys = new Set(allPositions.map(p => `${p.row},${p.col}`));
      const extraByType = new Map<TileType, GridPosition[]>();
      for (const info of destroyed) {
        const key = `${info.row},${info.col}`;
        if (!matchPosKeys.has(key)) {
          const list = extraByType.get(info.type) ?? [];
          list.push({ row: info.row, col: info.col });
          extraByType.set(info.type, list);
        }
      }
      const extraResults: MatchResult[] = [];
      for (const [type, tiles] of extraByType) {
        extraResults.push({
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

      // Apply match metadata (fool's gold, poison counts) from prepareClear
      for (const { matchIndex, foolsGoldCount, poisonCount } of matchMetadata) {
        if (foolsGoldCount > 0) matches[matchIndex].foolsGoldCount = foolsGoldCount;
        if (poisonCount > 0) matches[matchIndex].poisonCount = poisonCount;
      }

      // Apply this step's effects immediately (damage, block, gold, etc.)
      const stepMatches = [...matches, ...extraResults];
      allMatches.push(...stepMatches);
      if (onStep) {
        onStep(stepMatches);
        // Brief pause so the player can see the effect applied
        await new Promise(r => setTimeout(r, Math.round(250 / getSpeedMultiplier())));
      }

      // Step 2: Spawn special tiles at cleared positions
      this.spawnSpecials(board, matches, isFirstStep ? swapTarget : undefined);
      isFirstStep = false;

      // Step 2.5: Prairie Fire spread -- happens per match step, not at end.
      if (firePositions.length > 0) {
        this.applyFireSpread(board, firePositions);
      }

      // Step 3: Apply gravity with animation
      const moves = this.applyGravityTracked(board);
      await board.animateGravityDrop(moves);

      // Step 4: Fill empty tiles with drop animation
      await board.fillEmptyTilesAnimated();

      matches = board.findMatches();
    }

    return allMatches;
  }

  /**
   * Collect all positions that need clearing for the given matches,
   * including cross-clear expansions. Tracks prairie_fire positions
   * and fool's gold/poison metadata per match.
   *
   * Does NOT null grid cells or collect tile refs -- that's handled
   * by Board.destroyTilesWithEffects().
   */
  private prepareClear(
    board: Board,
    matches: MatchResult[],
  ): {
    allPositions: GridPosition[];
    firePositions: GridPosition[];
    matchMetadata: Array<{ matchIndex: number; foolsGoldCount: number; poisonCount: number }>;
  } {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const posKey = (r: number, c: number) => `${r},${c}`;

    // Collect all positions from original matches
    const collected = new Set<string>();
    const allPositions: GridPosition[] = [];
    const firePositions: GridPosition[] = [];
    const matchMetadata: Array<{ matchIndex: number; foolsGoldCount: number; poisonCount: number }> = [];

    const addPos = (r: number, c: number) => {
      const key = posKey(r, c);
      if (collected.has(key)) return;
      const tile = grid[r]?.[c];
      if (!tile) return;
      collected.add(key);
      allPositions.push({ row: r, col: c });
      if (tile.type === 'prairie_fire') firePositions.push({ row: r, col: c });
    };

    // Add match positions and track hazard metadata
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      let fgCount = 0;
      let poisonCount = 0;
      for (const pos of match.tiles) {
        addPos(pos.row, pos.col);
        const tile = grid[pos.row]?.[pos.col];
        if (tile) {
          if (tile.hazard?.type === 'fools_gold') fgCount++;
          if (tile.hazard?.type === 'poison') poisonCount++;
        }
      }
      if (fgCount > 0 || poisonCount > 0) {
        matchMetadata.push({ matchIndex: i, foolsGoldCount: fgCount, poisonCount });
      }
    }

    // Cross clears: clear entire row + column at intersection points
    for (const match of matches) {
      if (!match.isCross || match.crossIntersections.length === 0) continue;
      for (const inter of match.crossIntersections) {
        for (let c = 0; c < size; c++) addPos(inter.row, c);
        for (let r = 0; r < size; r++) addPos(r, inter.col);
      }
    }

    return { allPositions, firePositions, matchMetadata };
  }

  /**
   * Spawn explosive/showdown tiles after 4-match or 5-match.
   * Places the special tile at the center of the cleared match area.
   */
  /**
   * Choose where to spawn a special tile within a match.
   * If swapTarget is set and is part of this match, spawn there (player swap).
   * Otherwise pick a random position in the match (cascade).
   */
  private pickSpawnPosition(tiles: GridPosition[], swapTarget?: GridPosition): GridPosition {
    if (swapTarget) {
      const atSwap = tiles.find(t => t.row === swapTarget.row && t.col === swapTarget.col);
      if (atSwap) return atSwap;
    }
    return tiles[Math.floor(Math.random() * tiles.length)];
  }

  private spawnSpecials(board: Board, matches: MatchResult[], swapTarget?: GridPosition): void {
    for (const match of matches) {
      if (match.isCross) {
        if (match.crossIntersections.length > 0) {
          const inter = swapTarget
            ? (match.crossIntersections.find(
                i => i.row === swapTarget.row && i.col === swapTarget.col,
              ) ?? match.crossIntersections[0])
            : match.crossIntersections[0];
          // 5+ in the cross group -> showdown tile; otherwise -> explosive
          if (match.isShowdown) {
            board.spawnSpecialTile(inter.row, inter.col, 'showdown', 'showdown');
          } else {
            board.spawnSpecialTile(inter.row, inter.col, match.tileType, 'explosive');
          }
        }
        continue;
      }

      if (match.isShowdown && match.tiles.length > 0) {
        const pos = this.pickSpawnPosition(match.tiles, swapTarget);
        board.spawnSpecialTile(pos.row, pos.col, 'showdown', 'showdown');
      } else if (match.isExplosive && match.tiles.length > 0) {
        const pos = this.pickSpawnPosition(match.tiles, swapTarget);
        board.spawnSpecialTile(pos.row, pos.col, match.tileType, 'explosive');
      }
    }
  }

  /**
   * Prairie Fire spread: after cascade resolution, each cleared ember tile has a
   * 25% chance to convert 1 random adjacent non-prairie_fire tile into an ember tile.
   */
  private applyFireSpread(board: Board, firePositions: GridPosition[]): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const SPREAD_CHANCE = 0.10;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const pos of firePositions) {
      if (Math.random() >= SPREAD_CHANCE) continue;

      // Collect adjacent non-prairie_fire tiles
      const candidates: GridPosition[] = [];
      for (const { dr, dc } of directions) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const tile = grid[r]?.[c];
        if (tile && tile.type !== 'prairie_fire') {
          candidates.push({ row: r, col: c });
        }
      }

      if (candidates.length === 0) continue;

      // Pick one random adjacent tile and convert it to ember
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const tile = grid[target.row][target.col];
      if (tile) {
        tile.setType('prairie_fire');
      }
    }
  }

  applyGravityTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    switch (this.gravityDirection) {
      case 'left': return this.applyGravityLeftTracked(board);
      case 'up': return this.applyGravityUpTracked(board);
      case 'right': return this.applyGravityRightTracked(board);
      default: return this.applyGravityDownTracked(board);
    }
  }

  private applyGravityDownTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const moves: Array<{ tile: Tile; toX: number; toY: number }> = [];

    for (let col = 0; col < size; col++) {
      let writeRow = size - 1;
      for (let row = size - 1; row >= 0; row--) {
        if (grid[row][col] !== null) {
          if (row !== writeRow) {
            const tile = grid[row][col]!;
            grid[writeRow][col] = tile;
            grid[row][col] = null;
            tile.row = writeRow;
            tile.col = col;
            moves.push({ tile, toX: board.tileX(col), toY: board.tileY(writeRow) });
          }
          writeRow--;
        }
      }
    }

    return moves;
  }

  private applyGravityLeftTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const moves: Array<{ tile: Tile; toX: number; toY: number }> = [];

    for (let row = 0; row < size; row++) {
      let writeCol = 0;
      for (let col = 0; col < size; col++) {
        if (grid[row][col] !== null) {
          if (col !== writeCol) {
            const tile = grid[row][col]!;
            grid[row][writeCol] = tile;
            grid[row][col] = null;
            tile.row = row;
            tile.col = writeCol;
            moves.push({ tile, toX: board.tileX(writeCol), toY: board.tileY(row) });
          }
          writeCol++;
        }
      }
    }

    return moves;
  }

  /** Non-animated gravity for use in non-cascade contexts (showdown, etc.) */
  applyGravity(board: Board): void {
    switch (this.gravityDirection) {
      case 'left': this.applyGravityLeft(board); break;
      case 'up': this.applyGravityUp(board); break;
      case 'right': this.applyGravityRight(board); break;
      default: this.applyGravityDown(board); break;
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

  private applyGravityUpTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const moves: Array<{ tile: Tile; toX: number; toY: number }> = [];

    for (let col = 0; col < size; col++) {
      let writeRow = 0;
      for (let row = 0; row < size; row++) {
        if (grid[row][col] !== null) {
          if (row !== writeRow) {
            const tile = grid[row][col]!;
            grid[writeRow][col] = tile;
            grid[row][col] = null;
            tile.row = writeRow;
            tile.col = col;
            moves.push({ tile, toX: board.tileX(col), toY: board.tileY(writeRow) });
          }
          writeRow++;
        }
      }
    }

    return moves;
  }

  private applyGravityUp(board: Board): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();

    for (let col = 0; col < size; col++) {
      let writeRow = 0;
      for (let row = 0; row < size; row++) {
        if (grid[row][col] !== null) {
          if (row !== writeRow) {
            grid[writeRow][col] = grid[row][col];
            grid[row][col] = null;
            const tile = grid[writeRow][col]!;
            tile.row = writeRow;
            tile.col = col;
            board.updateTilePosition(tile);
          }
          writeRow++;
        }
      }
    }
  }

  private applyGravityRightTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const moves: Array<{ tile: Tile; toX: number; toY: number }> = [];

    for (let row = 0; row < size; row++) {
      let writeCol = size - 1;
      for (let col = size - 1; col >= 0; col--) {
        if (grid[row][col] !== null) {
          if (col !== writeCol) {
            const tile = grid[row][col]!;
            grid[row][writeCol] = tile;
            grid[row][col] = null;
            tile.row = row;
            tile.col = writeCol;
            moves.push({ tile, toX: board.tileX(writeCol), toY: board.tileY(row) });
          }
          writeCol--;
        }
      }
    }

    return moves;
  }

  private applyGravityRight(board: Board): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();

    for (let row = 0; row < size; row++) {
      let writeCol = size - 1;
      for (let col = size - 1; col >= 0; col--) {
        if (grid[row][col] !== null) {
          if (col !== writeCol) {
            grid[row][writeCol] = grid[row][col];
            grid[row][col] = null;
            const tile = grid[row][writeCol]!;
            tile.row = row;
            tile.col = writeCol;
            board.updateTilePosition(tile);
          }
          writeCol--;
        }
      }
    }
  }
}
