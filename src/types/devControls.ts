import type { TileHazardState } from './tiles';
import type { TileType } from './game';

export type DevBoardEditOperation =
  | { kind: 'set_tile'; tileType: TileType }
  | { kind: 'special'; special: 'explosive' | 'showdown' | 'shadow' | 'none' }
  | { kind: 'hazard'; hazard: TileHazardState }
  | { kind: 'clear_effects' };
