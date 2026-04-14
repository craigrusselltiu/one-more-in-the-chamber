/**
 * Types for mid-combat save/restore.
 * A CombatSnapshot captures the full combat state at a stable point
 * (after swap resolution, before next input) so the fight can be
 * resumed exactly where it left off.
 */

import type { TileType, TraitId, ArtifactInstance, CharacterId } from './game';
import type { CombatPhase, EnemyState, EnemyDefinition } from './combat';
import type { TileHazardState } from './tiles';
import type { GravityDirection } from '../game/board/CascadeResolver';
import type { EliteModifierId } from '../game/combat/EliteModifiers';
import type { BossPhase } from '../game/combat/BossController';

/** Snapshot version for future-proofing. Bump on breaking changes. */
export const SNAPSHOT_VERSION = 1;

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface SerializedTile {
  type: TileType;
  row: number;
  col: number;
  isExplosive: boolean;
  isShowdown: boolean;
  isShadow?: boolean;
  hazard: TileHazardState | null;
}

export interface SerializedBoard {
  /** 8x8 grid; null = empty cell (shouldn't happen at save time). */
  tiles: (SerializedTile | null)[][];
  activeTileTypes: TileType[];
  gravityDirection: GravityDirection;
  mirageReplacementType?: TileType | null;
}

export interface SerializedPlayer {
  health: number;
  maxHealth: number;
  block: number;
  aceStacks?: number;
  aceMultiplier: number;
  luckyStacks?: number;
  barricadeStacks?: number;
  ragefulStacks?: number;
  sturdyStacks?: number;
  graceStacks?: number;
  poisonedStacks?: number;
  readyStacks?: number;
  duelStacks?: number;
  chainStacks?: number;
  protectedStacks?: number;
  critChance: number;
  thorns: number;
  shedSkinAvailable?: boolean;
  deadManWalkingAvailable?: boolean;
  damageReduction?: number;
  gold: number;
  goldThisFight: number;
  goldObtainedThisFight?: number;
  abilityCharge: number;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
}

export interface SerializedEnemy {
  state: EnemyState;
  definition: EnemyDefinition;
  skipNextAction: boolean;
}

export interface SerializedBossController {
  bossType: string;
  phase: BossPhase;
  transitionTriggered: boolean;
  turnParity: number;
}

// ---------------------------------------------------------------------------
// Top-level snapshot
// ---------------------------------------------------------------------------

export interface CombatSnapshot {
  version: number;
  runId: string;
  timestamp: number;
  character: CharacterId;

  // Board
  board: SerializedBoard;

  // CombatManager state
  turnNumber: number;
  swapsRemaining: number;
  swapsPerTurn: number;
  targetedEnemyIndex: number;
  phase: CombatPhase;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  deadeyeMaxShots: number;
  isBoss: boolean;
  nextMatchMultiplier: number;
  damageDealtThisFight: number;
  swapsUsedThisTurn: number;

  // Player
  player: SerializedPlayer;

  // Enemies (definitions + runtime state)
  enemies: SerializedEnemy[];

  // Boss controller (null if not a boss fight)
  bossController: SerializedBossController | null;

  // Elite modifier (null if not elite)
  eliteModifierId: EliteModifierId | null;

  // Board-level suppressed types: [tileType, turnsRemaining]
  suppressedTypes: [TileType, number][];

  // Scoring / tracking state
  longestCascadeThisFight: number;
  playerTookDamageThisFight: boolean;

  // Subsystem state for exploit-free restore
  matchCountThisFight: number;
  damageDealtThisTurn?: boolean;
  undertakerDoubleDamageReady?: boolean;
  firstMatchThisFight: boolean;
  lassoUsedThisFight: boolean;

  // Original config for reconstruction (artifacts, traits, etc.)
  artifacts: ArtifactInstance[];
  traitCounts: Partial<Record<TraitId, number>>;
}
