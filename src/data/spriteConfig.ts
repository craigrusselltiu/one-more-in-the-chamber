import type { TileType } from '../types/game';

/**
 * Unified sprite configuration.
 * All sprite frame indices reference the items_sheet.png (16x16 grid, 36 columns).
 * Use tools/sprite-picker.html to browse and identify frames.
 */

/** Tile sprite frames (from items_sheet.png). */
export const TILE_FRAMES: Record<TileType, number> = {
  // Core
  bullet: 1244,
  iron: 565,
  gold: 1158,
  // Starter
  ricochet: 907,
  stampede: 268,
  buckshot: 908,
  battery: 945,
  venom: 762,
  prairie_fire: 719,
  // Additional
  chain: 730,
  whiskey: 666,
  ace: 792,
  horseshoe: 689,
  fifty_cal: 906,
  tombstone: 824,
  saloon: 715,
  wanted: 648,
  rattler: 1241,
  barricade: 198,
  cavalry: 786,
  duel: 211,
  mirage: 1004,
  // Special
  showdown: 819,
  tumbleweed: 1098,
  fools_gold: 1155,
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
  block: 196,
  ace: 792,
  lucky: 1012,
  barricade: 198,
  crit: 1080,
  thorns: 1006,
  venom: 828,
  vulnerable: 770,
};

/** Map node type icons. */
export const NODE_FRAMES: Record<string, number> = {
  combat: 1166,
  elite: 1167,
  shop: 1159,
  rest: 720,
  event: 648,
  treasure: 717,
  boss: 206,
};

/** Trait icons (by trait ID). */
export const TRAIT_FRAMES: Record<string, number> = {
  outlaw: 1244,
  sheriff: 565,
  rattlesnake: 762,
  prospector: 1158,
  sapper: 722,
  mustang: 268,
  gunslinger: 906,
};

/** Trait breakpoint thresholds (in order). */
export const TRAIT_BREAKPOINTS: Record<string, number[]> = {
  outlaw: [2, 4, 6],
  sheriff: [2, 5],
  rattlesnake: [1, 3],
  prospector: [2, 4, 6],
  sapper: [1, 2, 3],
  mustang: [4],
  gunslinger: [2, 4],
};

/** UI button icons for the top bar. */
export const UI_FRAMES: Record<string, number> = {
  tiles: 625,
  map: 659,
  settings: 933,
  health: 687,
  gold: 1162,
};
