import type { TileType, CharacterId } from './game';

/** Combat-specific types. */

export interface CombatState {
  character: CharacterId;
  turnNumber: number;
  swapsRemaining: number;
  swapsPerTurn: number;
  playerBlock: number;
  aceStacks: number;
  aceMultiplier: number;
  luckyStacks: number;
  barricadeStacks: number;
  ragefulStacks: number;
  sturdyStacks: number;
  venomousStacks: number;
  thorns: number;
  enemies: EnemyState[];
  targetedEnemyIndex: number;
  phase: CombatPhase;
  abilityCharge: number;
  abilityThreshold: number;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  deadeyeMaxShots: number;
  /** Bounty Hunter(2): last deadeye shot can target an enemy. */
  canDeadeyeShootEnemy: boolean;
  /** Shuffle the Deck (Reno): hold mode is active. */
  isShuffleHoldMode: boolean;
  /** Number of holds remaining during Shuffle the Deck. */
  shuffleHoldsRemaining: number;
  shuffleMaxHolds: number;
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
  crackedGround: number;
  bountyStacks: number;
  summoned: boolean;
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
  | { type: 'ace'; value: number }
  | { type: 'lucky'; value: number }
  | { type: 'barricade'; value: number }
  | { type: 'rageful'; value: number }
  | { type: 'sturdy'; value: number }
  | { type: 'venomous'; value: number }
  | { type: 'crit'; value: number }
  | { type: 'thorns'; value: number };

export type EnemyStatusEffect =
  | { type: 'block'; value: number }
  | { type: 'venom'; value: number }
  | { type: 'vulnerable'; value: number }
  | { type: 'cracked_ground'; value: number }
  | { type: 'bounty'; value: number }
  | { type: 'summoned'; value: number };

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
  /** Number of poison tiles in this match (each applies 1 venomous stack to player). */
  poisonCount?: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface DestroyedTileInfo {
  type: TileType;
  row: number;
  col: number;
}

export interface BoardHazard {
  position: GridPosition;
  type: 'lock' | 'hardened_lock' | 'poison' | 'bomb' | 'sand' | 'fools_gold';
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
