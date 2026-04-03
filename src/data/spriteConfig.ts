import type { TileType } from '../types/game';

/**
 * Unified sprite configuration.
 * All sprite frame indices reference the items_sheet.png (16x16 grid, 36 columns).
 * Use tools/sprite-picker.html to browse and identify frames.
 */

/** Tile sprite frames (from items_sheet.png). */
export const TILE_FRAMES: Record<TileType, number> = {
  bullet: 1244,
  iron: 565,
  gold: 1158,
  ricochet: 907,
  dynamite: 722,
  stampede: 268,
  whiskey: 499,
  buckshot: 908,
  ace: 792,
  venom: 762,
  ember: 720,
  horseshoe: 689,
  fifty_cal: 906,
  showdown: 599,
  tumbleweed: 996,
};

/** Artifact sprite frames (by artifact ID). */
export const ARTIFACT_FRAMES: Record<string, number> = {
  // Add artifact frame indices here as they are assigned
};

/** Consumable sprite frames (by consumable ID). */
export const CONSUMABLE_FRAMES: Record<string, number> = {
  // Add consumable frame indices here as they are assigned
};

/** Status effect / buff / debuff sprite frames. */
export const STATUS_FRAMES: Record<string, number> = {
  block: 198,
  ace: 0,
  crit: 0,
  thorns: 0,
  venom: 0,
  vulnerable: 0,
};

/** Map node type icons. */
export const NODE_FRAMES: Record<string, number> = {
  combat: 1166,
  elite: 207,
  shop: 1159,
  rest: 720,
  event: 648,
  treasure: 714,
  boss: 206,
};

/** UI button icons for the top bar. */
export const UI_FRAMES: Record<string, number> = {
  tiles: 648,
  map: 714,
  settings: 1159,
};
