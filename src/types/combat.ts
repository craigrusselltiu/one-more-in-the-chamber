import type { TileType } from './game';

/** Combat-specific types. */

export interface CombatState {
  turnNumber: number;
  swapsRemaining: number;
  swapsPerTurn: number;
  playerBlock: number;
  dodgeChance: number;
  aceMultiplier: number;
  critChance: number;
  thorns: number;
  enemies: EnemyState[];
  targetedEnemyIndex: number;
  phase: CombatPhase;
  abilityCharge: number;
  abilityThreshold: number;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  /** Turn limit for timed encounters (e.g. Mine Cart). 0 = no limit. */
  turnLimit: number;
  /** Tile types currently suppressed by warrants (produce no output when matched). */
  suppressedTileTypes: TileType[];
}

export type CombatPhase =
  | 'turn-start'
  | 'consumable-window'
  | 'swap-phase'
  | 'resolving'
  | 'turn-end'
  | 'enemy-turn'
  | 'combat-end';

export interface EnemyState {
  id: string;
  enemyType: string;
  health: number;
  maxHealth: number;
  block: number;
  venomStacks: number;
  vulnerable: number;
  intent: EnemyIntent;
  isDead: boolean;
}

export type EnemyIntentType =
  | 'attack'
  | 'block'
  | 'ability'
  | 'summon'
  | 'board-manipulation';

export interface EnemyIntent {
  type: EnemyIntentType;
  value?: number;
  description: string;
}

export type PlayerStatusEffect =
  | { type: 'block'; value: number }
  | { type: 'dodge'; value: number }
  | { type: 'ace'; value: number }
  | { type: 'crit'; value: number }
  | { type: 'thorns'; value: number };

export type EnemyStatusEffect =
  | { type: 'block'; value: number }
  | { type: 'venom'; value: number }
  | { type: 'vulnerable'; value: number };

export interface MatchResult {
  tiles: GridPosition[];
  tileType: TileType;
  length: number;
  isExplosive: boolean;
  isShowdown: boolean;
  isCross: boolean;
  /** Intersection points for cross clears (L/T/+ patterns). */
  crossIntersections: GridPosition[];
  matchBonus: number;
  /** Number of fool's gold tiles in this match (set by CascadeResolver before clearing). */
  foolsGoldCount?: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface BoardHazard {
  position: GridPosition;
  type: 'lock' | 'poison' | 'bomb' | 'sand' | 'fools_gold';
  countdown?: number;
}

/** Static definition for an enemy type. */
export interface EnemyDefinition {
  type: string;
  name: string;
  health: number;
  minDamage: number;
  maxDamage: number;
  abilities: string[];
}
