import type { CombatSnapshot, SerializedBoard, SerializedPlayer } from '../types/combatSnapshot';
import type { RunState, TileType } from '../types/game';

export const CHARCOAL_OBSIDIAN_LEVEL = 9; // Stored level 9 is displayed as Lv 10.

function hasCharcoal(types: TileType[]): boolean {
  return types.includes('charcoal');
}

function boardHasCharcoal(board: SerializedBoard): boolean {
  return board.tiles.some((row) => row.some((tile) => tile?.type === 'charcoal'));
}

function transformTypes(types: TileType[]): TileType[] {
  return Array.from(new Set(types.map((type) => (type === 'charcoal' ? 'obsidian' : type))));
}

function shouldTransform(level: number, hasTransformTarget: boolean): boolean {
  return level >= CHARCOAL_OBSIDIAN_LEVEL && hasTransformTarget;
}

function transformUpgrades(
  upgrades: Partial<Record<TileType, number>>,
): Partial<Record<TileType, number>> {
  const charcoalLevel = upgrades.charcoal ?? 0;
  const tileUpgrades = { ...upgrades };
  tileUpgrades.obsidian = Math.max(tileUpgrades.obsidian ?? 0, charcoalLevel);
  delete tileUpgrades.charcoal;
  return tileUpgrades;
}

export function transformCharcoalRunIfReady(run: RunState): RunState {
  const charcoalLevel = run.tileUpgrades.charcoal ?? 0;
  if (!shouldTransform(charcoalLevel, hasCharcoal(run.activeTileTypes))) return run;

  return {
    ...run,
    activeTileTypes: transformTypes(run.activeTileTypes),
    tileUpgrades: transformUpgrades(run.tileUpgrades),
  };
}

function transformPlayerIfReady(player: SerializedPlayer, forceUpgradeTransfer: boolean): SerializedPlayer {
  const charcoalLevel = player.tileUpgrades.charcoal ?? 0;
  const hasActiveCharcoal = hasCharcoal(player.activeTileTypes);
  if (!shouldTransform(charcoalLevel, hasActiveCharcoal || forceUpgradeTransfer)) return player;

  return {
    ...player,
    activeTileTypes: hasActiveCharcoal ? transformTypes(player.activeTileTypes) : player.activeTileTypes,
    tileUpgrades: transformUpgrades(player.tileUpgrades),
  };
}

function transformBoardIfReady(board: SerializedBoard, charcoalLevel: number): SerializedBoard {
  const hasActiveCharcoal = hasCharcoal(board.activeTileTypes);
  const hasTileCharcoal = boardHasCharcoal(board);
  if (!shouldTransform(charcoalLevel, hasActiveCharcoal || hasTileCharcoal)) return board;

  return {
    ...board,
    activeTileTypes: hasActiveCharcoal ? transformTypes(board.activeTileTypes) : board.activeTileTypes,
    tiles: board.tiles.map((row) =>
      row.map((tile) => (tile?.type === 'charcoal' ? { ...tile, type: 'obsidian' } : tile)),
    ),
  };
}

export function transformCharcoalSnapshotIfReady(snapshot: CombatSnapshot): CombatSnapshot {
  const charcoalLevel = snapshot.player.tileUpgrades.charcoal ?? 0;
  const hasSnapshotCharcoal = hasCharcoal(snapshot.player.activeTileTypes)
    || hasCharcoal(snapshot.board.activeTileTypes)
    || boardHasCharcoal(snapshot.board);
  if (
    charcoalLevel < CHARCOAL_OBSIDIAN_LEVEL
    || !hasSnapshotCharcoal
  ) {
    return snapshot;
  }

  return {
    ...snapshot,
    board: transformBoardIfReady(snapshot.board, charcoalLevel),
    player: transformPlayerIfReady(snapshot.player, hasSnapshotCharcoal),
  };
}
