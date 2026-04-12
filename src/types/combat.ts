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
  terrifiedStacks: number;
  vulnerableStacks: number;
  thorns: number;
  /** Protected: immune to tile hazard placement. Decreases by 1 at end of turn. */
  protectedStacks: number;
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
  cloak: number;
  bountyStacks: number;
  terrifiedStacks: number;
  blindedStacks: number;
  ragefulStacks: number;
  thorns: number;
  graceStacks: number;
  hardened: number;
  fuse: number;
  /** Dead Man Walking: while > 0, enemy is immune to Poison, Vulnerable, Terrified, Blinded, Bounty. Permanent (no decrement). */
  deadManWalking: number;
  /** Barricade: at the start of the enemy turn, retain block instead of clearing it. Decrement by 1 per turn. */
  barricadeStacks: number;
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
  /** Structured move actions for icon-based intent display. */
  actions?: MoveAction[];
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
  | { type: 'terrified'; value: number }
  | { type: 'vulnerable'; value: number }
  | { type: 'crit'; value: number }
  | { type: 'thorns'; value: number }
  | { type: 'protected'; value: number };

export type EnemyStatusEffect =
  | { type: 'block'; value: number }
  | { type: 'poison'; value: number }
  | { type: 'vulnerable'; value: number }
  | { type: 'cloak'; value: number }
  | { type: 'bounty'; value: number }
  | { type: 'terrified'; value: number }
  | { type: 'blinded'; value: number }
  | { type: 'rageful'; value: number }
  | { type: 'thorns'; value: number }
  | { type: 'grace'; value: number }
  | { type: 'hardened'; value: number }
  | { type: 'summoned'; value: number }
  | { type: 'fuse'; value: number }
  | { type: 'dead_man_walking'; value: number }
  | { type: 'barricade'; value: number };

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

/** A single action within an enemy move (e.g. "Attack 12" or "Lock 3"). */
export interface MoveAction {
  kind: 'attack' | 'multi_attack' | 'block' | 'lock' | 'lock_row' | 'lock_column'
    | 'poison_tiles' | 'apply_poison' | 'bomb' | 'bury' | 'suppress' | 'fools_gold'
    | 'summon' | 'heal' | 'gain_rageful' | 'apply_terrified' | 'gain_thorns'
    | 'gain_cloak' | 'gain_hardened' | 'gain_grace' | 'gain_dead_man_walking'
    | 'gain_barricade'
    | 'apply_vulnerable' | 'apply_vulnerable_self'
    | 'heal_ally'
    | 'shuffle_rows' | 'gravity_shift' | 'transform_tumbleweed';
  value: number;
  /** For multi-attack: number of hits. For shuffle_rows: rows to shuffle (encoded). */
  hits?: number;
  /** For summon: the enemy type to summon. */
  summonType?: string;
  /** For summon: if true, summoned enemy starts at full HP instead of 1/3. */
  summonFullHp?: boolean;
}

/** A complete move an enemy can perform (may contain multiple actions). */
export interface EnemyMove {
  actions: MoveAction[];
  /** Base selection weight. Default 1. */
  weight?: number;
  /** Selection weight when HP is below lowHpThreshold. */
  lowHpWeight?: number;
  /** HP ratio threshold for lowHpWeight activation. Default 0.5. */
  lowHpThreshold?: number;
}

/** Static definition for an enemy type. */
export interface EnemyDefinition {
  type: string;
  name: string;
  health: number;
  /** Legacy damage fields used by bosses and fallback AI. */
  minDamage: number;
  maxDamage: number;
  abilities: string[];
  /** Explicit moveset. If defined, AI picks from this list instead of weighted random. */
  moves?: EnemyMove[];
  /** Actions to execute at the start of combat (e.g. "Poison 3 Tiles"). */
  startOfFight?: MoveAction[];
  /** If set, this move is always used as the first intent. */
  firstMove?: EnemyMove;
  /** HP threshold triggers (e.g. "When HP drops below 50%, gain 4 Rageful"). */
  hpTriggers?: Array<{
    threshold: number;
    actions: MoveAction[];
    once?: boolean;
    /** Force the next rolled intent to use these actions (e.g. Dust Devil enrage). */
    forceNextMove?: MoveAction[];
  }>;
  /** Initial fuse stacks (e.g. Mine Cart starts with 5). */
  initialFuse?: number;
  /** Damage dealt to the player when fuse reaches 0. */
  fuseDamage?: number;
  /** If true, moves are executed sequentially in order, looping back to the start. */
  sequential?: boolean;
}
