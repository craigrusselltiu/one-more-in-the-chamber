import type { TileType } from './game';

/** Per-tile base values and metadata. */

export interface TileDefinition {
  type: TileType;
  label: string;
  abbreviation: string;
  color: string;
  baseValue: number;
  upgradeValue: number;
  pool: 'exclusive' | 'starter' | 'additional' | 'special';
  description: string;
  flavor?: string;
  /** Upgrade description shown in campfire. Tiles without this can't be upgraded. */
  upgradeText?: string;
  /**
   * Resolution priority when multiple matches resolve in the same swap.
   * Lower numbers resolve first. Default 3.
   *   0 = buffs/stacks (ace, horseshoe, venom, bounty, shank)
   *   1 = block (iron, barricade)
   *   2 = healing (whiskey, saloon)
   *   3 = standard damage (bullet, buckshot, stampede, chain, etc.)
   *   4 = scaling damage (boulder, tombstone, duel)
   *   5 = resource/utility (gold, battery, cavalry)
   */
  resolveOrder?: number;
}

export interface TileState {
  type: TileType;
  row: number;
  col: number;
  isExplosive: boolean;
  isShowdown: boolean;
  isShadow: boolean;
  hazard: TileHazardState | null;
}

export type TileHazardState =
  | { type: 'lock'; hits: number }
  | { type: 'poison' }
  | { type: 'bomb'; countdown: number }
  | { type: 'sand' }
  | { type: 'fools_gold' };
