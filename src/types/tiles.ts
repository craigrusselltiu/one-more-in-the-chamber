import type { TileType } from './game';

/** Per-tile base values and metadata. */

export interface TileDefinition {
  type: TileType;
  label: string;
  abbreviation: string;
  color: string;
  baseValue: number;
  upgradeValue: number;
  pool: 'core' | 'starter' | 'additional';
  description: string;
}

export interface TileState {
  type: TileType;
  row: number;
  col: number;
  isExplosive: boolean;
  isShowdown: boolean;
  hazard: TileHazardState | null;
}

export type TileHazardState =
  | { type: 'lock' }
  | { type: 'poison' }
  | { type: 'bomb'; countdown: number }
  | { type: 'sand' }
  | { type: 'fools_gold' };
