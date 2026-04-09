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
  graceStacks: number;
  poisonedStacks: number;
  readyStacks: number;
  chainStacks: number;
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
  /** False Shuffle (Reno): hold mode is active. */
  isShuffleHoldMode: boolean;
  /** Number of holds remaining during False Shuffle. */
  shuffleHoldsRemaining: number;
  shuffleMaxHolds: number;
  /** Turn limit for timed encounters (e.g. Mine Cart). 0 = no limit. */
  turnLimit: number;
  /** Tile types currently suppressed by warrants (produce no output when matched). */
  suppressedTileTypes: TileType[];
  /** If mirage is active, the tile type it transformed into this combat. */
  mirageType: TileType | null;
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
  poisonStacks: number;
  vulnerable: number;
  crackedGround: number;
  bountyStacks: number;
  terrifiedStacks: number;
  summoned: boolean;
  intent: EnemyIntent;
  isDead: boolean;
  /** Internal flag to prevent processing the same death multiple times. */
  _deathProcessed?: boolean;
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
  | { type: 'grace'; value: number }
  | { type: 'poisoned'; value: number }
  | { type: 'ready'; value: number }
  | { type: 'chain'; value: number }
  | { type: 'crit'; value: number }
  | { type: 'thorns'; value: number };

export type EnemyStatusEffect =
  | { type: 'block'; value: number }
  | { type: 'poison'; value: number }
  | { type: 'vulnerable'; value: number }
  | { type: 'cracked_ground'; value: number }
  | { type: 'bounty'; value: number }
  | { type: 'terrified'; value: number }
  | { type: 'summoned'; value: number };

export interface MatchResult {
  tiles: GridPosition[];
  tileType: TileType;
  length: number;
  isExplosive: boolean;
  isShowdown: boolean;
  isShadow: boolean;
  isCross: boolean;
  /** Intersection points for cross clears (L/T/+ patterns). */
  crossIntersections: GridPosition[];
  matchBonus: number;
  /** Number of fool's gold tiles in this match (set by CascadeResolver before clearing). */
  foolsGoldCount?: number;
  /** Number of poison tiles in this match (each applies 1 poison stack to player). */
  poisonCount?: number;
  /** Number of shadow tiles in this match (each fires a shadow bolt for 4 damage). */
  shadowCount?: number;
  /** Number of bomb tiles defused in this match (Blasting Pan gold). */
  bombCount?: number;
  /** Number of suppressed tiles in this match (produces no resources). */
  suppressCount?: number;
  /** True if this match was created from chain destruction (explosive/showdown), not a direct match. */
  isChainDestruction?: boolean;
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
