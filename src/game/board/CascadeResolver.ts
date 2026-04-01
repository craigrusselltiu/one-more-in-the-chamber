import type { TileType } from '../../types/game';
import type { Board } from './Board';
import type { Tile } from './Tile';
import type { MatchResult, GridPosition } from '../../types/combat';

export type GravityDirection = 'down' | 'left';

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
  ): Promise<MatchResult[]> {
    const allMatches: MatchResult[] = [];
    const clearedEmberPositions: GridPosition[] = [];
    let matches = board.findMatches();

    while (matches.length > 0) {
      // Step 1: Collect tiles to clear and extra results, animate clear
      const { extraResults, tilesToAnimate, emberPositions } = this.prepareClear(board, matches);
      clearedEmberPositions.push(...emberPositions);
      await board.animateTileClear(tilesToAnimate);

      // Apply this step's effects immediately (damage, block, gold, etc.)
      const stepMatches = [...matches, ...extraResults];
      allMatches.push(...stepMatches);
      if (onStep) {
        onStep(stepMatches);
        // Brief pause so the player can see the effect applied
        await new Promise(r => setTimeout(r, 250));
      }

      // Step 2: Spawn special tiles at cleared positions
      this.spawnSpecials(board, matches);

      // Step 3: Apply gravity with animation
      const moves = this.applyGravityTracked(board);
      await board.animateGravityDrop(moves);

      // Step 4: Fill empty tiles with drop animation
      await board.fillEmptyTilesAnimated();

      matches = board.findMatches();
    }

    // Step 5: Ember spread — each cleared ember tile has 25% chance to
    // convert 1 adjacent non-ember tile into an ember tile.
    if (clearedEmberPositions.length > 0) {
      this.applyEmberSpread(board, clearedEmberPositions);
    }

    return allMatches;
  }

  /**
   * Collect all tiles that need clearing, null their grid cells,
   * and return the Tile objects for animation, any extra MatchResults,
   * and positions of cleared ember tiles (for ember spread).
   */
  private prepareClear(
    board: Board,
    matches: MatchResult[],
  ): { extraResults: MatchResult[]; tilesToAnimate: Tile[]; emberPositions: GridPosition[] } {
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
    const extraTiles = new Map<string, TileType>();

    for (const match of matches) {
      if (!match.isCross || match.crossIntersections.length === 0) continue;
      for (const inter of match.crossIntersections) {
        for (let c = 0; c < size; c++) {
          const key = posKey(inter.row, c);
          if (matchPositions.has(key) || extraTiles.has(key)) continue;
          const tile = grid[inter.row]?.[c];
          if (tile) extraTiles.set(key, tile.type);
        }
        for (let r = 0; r < size; r++) {
          const key = posKey(r, inter.col);
          if (matchPositions.has(key) || extraTiles.has(key)) continue;
          const tile = grid[r]?.[inter.col];
          if (tile) extraTiles.set(key, tile.type);
        }
      }
    }

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

    // Phase 3: Collect Tile references, track ember positions and fool's gold count,
    // then null grid cells.
    const tilesToAnimate: Tile[] = [];
    const emberPositions: GridPosition[] = [];

    for (const match of matches) {
      let fgCount = 0;
      for (const pos of match.tiles) {
        const tile = grid[pos.row]?.[pos.col];
        if (tile) {
          if (tile.type === 'ember') {
            emberPositions.push({ row: pos.row, col: pos.col });
          }
          if (tile.hazard?.type === 'fools_gold') fgCount++;
          tilesToAnimate.push(tile);
          grid[pos.row][pos.col] = null;
        }
      }
      if (fgCount > 0) match.foolsGoldCount = fgCount;
    }

    for (const [key, type] of extraTiles) {
      const parts = key.split(',');
      const r = Number(parts[0]);
      const c = Number(parts[1]);
      const tile = grid[r]?.[c];
      if (tile) {
        if (type === 'ember') {
          emberPositions.push({ row: r, col: c });
        }
        tilesToAnimate.push(tile);
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

    const extraResults: MatchResult[] = [];
    for (const [type, tiles] of byType) {
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

    return { extraResults, tilesToAnimate, emberPositions };
  }

  /**
   * Spawn explosive/showdown tiles after 4-match or 5-match.
   * Places the special tile at the center of the cleared match area.
   */
  private spawnSpecials(board: Board, matches: MatchResult[]): void {
    for (const match of matches) {
      if (match.isCross) continue;

      if (match.isShowdown && match.tiles.length > 0) {
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        board.spawnSpecialTile(mid.row, mid.col, match.tileType, 'showdown');
      } else if (match.isExplosive && match.tiles.length > 0) {
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        board.spawnSpecialTile(mid.row, mid.col, match.tileType, 'explosive');
      }
    }
  }

  /**
   * Ember spread: after cascade resolution, each cleared ember tile has a
   * 25% chance to convert 1 random adjacent non-ember tile into an ember tile.
   */
  private applyEmberSpread(board: Board, emberPositions: GridPosition[]): void {
    const grid = board.getGrid();
    const size = board.getBoardSize();
    const SPREAD_CHANCE = 0.25;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const pos of emberPositions) {
      if (Math.random() >= SPREAD_CHANCE) continue;

      // Collect adjacent non-ember tiles
      const candidates: GridPosition[] = [];
      for (const { dr, dc } of directions) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const tile = grid[r]?.[c];
        if (tile && tile.type !== 'ember') {
          candidates.push({ row: r, col: c });
        }
      }

      if (candidates.length === 0) continue;

      // Pick one random adjacent tile and convert it to ember
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const tile = grid[target.row][target.col];
      if (tile) {
        tile.setType('ember');
      }
    }
  }

  private applyGravityTracked(
    board: Board,
  ): Array<{ tile: Tile; toX: number; toY: number }> {
    if (this.gravityDirection === 'left') {
      return this.applyGravityLeftTracked(board);
    }
    return this.applyGravityDownTracked(board);
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
