import type { CombatState, EnemyState } from '../types/combat';
import type { CombatSnapshot } from '../types/combatSnapshot';
import type { CombatConfig } from './combat/CombatManager';
import type { DevBoardEditOperation } from '../types/devControls';
import type { ArtifactInstance, TileType } from '../types/game';

type Listener = (...args: unknown[]) => void;

/** Lightweight event bus bridging Phaser scenes and React UI. */
class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }

  off(event: string, fn: Listener): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}

export const EventBus = new EventEmitter();

/** All cross-boundary events in one place. */
export const GameEvent = {
  // Navigation
  SCREEN_CHANGE: 'screen:change',

  // Combat state (Phaser -> React)
  COMBAT_STATE_UPDATE: 'combat:state-update',
  PLAYER_HP_CHANGE: 'player:hp-change',
  ENEMY_HP_CHANGE: 'enemy:hp-change',
  GOLD_CHANGE: 'gold:change',
  SWAPS_CHANGE: 'swaps:change',
  ABILITY_CHARGE_CHANGE: 'ability:charge-change',
  STATUS_EFFECT_CHANGE: 'status:effect-change',

  // Turn lifecycle
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',

  // Board events
  MATCH_RESOLVED: 'match:resolved',
  CASCADE_STEP: 'cascade:step',
  CASCADE_END: 'cascade:end',
  COMBO_UPDATE: 'combo:update',

  // Combat events
  ENEMY_DIED: 'enemy:died',
  DEADEYE_ACTIVATED: 'deadeye:activated',
  DEADEYE_ENDED: 'deadeye:ended',
  ABILITY_STARTED: 'ability:started',
  ABILITY_ENDED: 'ability:ended',
  CONSUMABLE_USED: 'consumable:used',
  /** A one-shot artifact effect has been spent (e.g. Shed Skin triggered). Payload: artifact id. */
  ARTIFACT_USED: 'artifact:used',

  // Player actions (React -> Phaser)
  TARGET_ENEMY: 'player:target-enemy',
  USE_CONSUMABLE: 'player:use-consumable',
  ACTIVATE_ABILITY: 'player:activate-ability',
  CANCEL_ABILITY: 'player:cancel-ability',
  END_TURN_EARLY: 'player:end-turn-early',

  // Enemy turn
  ENEMY_ACTION: 'enemy:action',
  TURN_BANNER: 'turn:banner',

  // Visual effects
  FLASH_LINE: 'vfx:flash-line',
  SCREEN_SHAKE: 'vfx:screen-shake',
  TILE_PARTICLES: 'vfx:tile-particles',
  /** Floating number: (target: 'player'|'enemy', index: number, text: string, color: string) */
  FLOATING_NUMBER: 'vfx:floating-number',
  /** Player dealt damage to an enemy (for attack sprite animation). */
  PLAYER_ATTACK: 'vfx:player-attack',
  /** Player was hit by an enemy attack or hostile enemy effect (for hit sprite animation). */
  PLAYER_HIT: 'vfx:player-hit',
  /** Player dealt damage to an enemy (for player->enemy line VFX). Payload: enemyId */
  PLAYER_DAMAGE_LINE: 'vfx:player-damage-line',
  /** Enemy took HP damage and should flash. Payload: enemyId */
  ENEMY_DAMAGED: 'vfx:enemy-damaged',
  /** Player took visible HP damage and should show blood on the sprite. */
  PLAYER_BLOOD_EFFECT: 'vfx:player-blood-effect',
  /** Enemy took visible HP damage and should show blood on the sprite. Payload: enemyId */
  ENEMY_BLOOD_EFFECT: 'vfx:enemy-blood-effect',
  /** Last non-summoned enemy died and should show coin effect. Payload: enemyId */
  ENEMY_COINS_EFFECT: 'vfx:enemy-coins-effect',
  /** Player restored HP and should show heal effect. */
  PLAYER_HEAL_EFFECT: 'vfx:player-heal-effect',
  /** Enemy restored HP and should show heal effect. Payload: enemyId */
  ENEMY_HEAL_EFFECT: 'vfx:enemy-heal-effect',
  /** Bomb timer reached 0 and detonated. Payload: { row, col } */
  BOMB_EFFECT: 'vfx:bomb-effect',
  /** Deadeye spark effect in combat canvas coordinates. Payload: { x, y } */
  SPARK_EFFECT: 'vfx:spark-effect',
  /** Player gunshot effect in HUD coordinates. Payload: { x, y } */
  SHOOT_EFFECT: 'vfx:shoot-effect',

  // Dev controls
  DEV_SET_BOARD_EDIT: 'dev:board-edit-set',
  DEV_BOARD_CELL_CLICKED: 'dev:board-cell-clicked',
  DEV_ADD_TILE: 'dev:add-tile',
  DEV_REMOVE_TILE: 'dev:remove-tile',
  DEV_SET_TILE_LEVEL: 'dev:set-tile-level',
  DEV_SET_GOLD: 'dev:set-gold',
  DEV_SET_HP: 'dev:set-hp',
  DEV_SET_ABILITY_CHARGE: 'dev:set-ability-charge',
  DEV_ADD_ARTIFACT: 'dev:add-artifact',
  DEV_REMOVE_ARTIFACT: 'dev:remove-artifact',

  // Board input -> CombatManager
  SWAP_REQUESTED: 'board:swap-requested',
  DEADEYE_SHOOT: 'board:deadeye-shoot',
  DEADEYE_SHOOT_ENEMY: 'board:deadeye-shoot-enemy',
  SHUFFLE_HOLD_TOGGLE: 'board:shuffle-hold-toggle',
  /** Enhanced VFX for a Deadeye shot: (x, y, tileColorHex) */
  DEADEYE_SHOT_VFX: 'vfx:deadeye-shot',

  // Map / run flow
  NODE_SELECTED: 'map:node-selected',
  RUN_STARTED: 'run:started',
  RUN_ENDED: 'run:ended',

  // Boot
  BOOT_COMPLETE: 'boot:complete',
  BOOT_PROGRESS: 'boot:progress',

  // Mid-combat save
  COMBAT_SAVE_REQUESTED: 'combat:save-requested',
  COMBAT_SCENE_RUN: 'combat:scene-run',
  COMBAT_SCENE_READY: 'combat:scene-ready',
  COMBAT_SCENE_STOP: 'combat:scene-stop',

  // Music control
  MUSIC_FADE_OUT: 'music:fade-out',
  /** Emitted when an encounter is ready, so BootScene can pick combat music based on enemy types. */
  COMBAT_MUSIC_SET: 'music:combat-set',
} as const;

/**
 * Typed event payloads for documentation and cast safety.
 * Phaser emits these; React hooks cast at the call site.
 */
export interface EventPayloads {
  [GameEvent.SCREEN_CHANGE]: [screen: string];
  [GameEvent.COMBAT_STATE_UPDATE]: [state: CombatState];
  [GameEvent.PLAYER_HP_CHANGE]: [current: number, max: number];
  [GameEvent.ENEMY_HP_CHANGE]: [enemy: EnemyState];
  [GameEvent.GOLD_CHANGE]: [gold: number];
  [GameEvent.SWAPS_CHANGE]: [remaining: number, total: number];
  [GameEvent.ABILITY_CHARGE_CHANGE]: [charge: number, threshold: number];
  [GameEvent.TURN_START]: [state: CombatState];
  [GameEvent.TURN_END]: [state: CombatState];
  [GameEvent.COMBAT_START]: [state: CombatState];
  [GameEvent.COMBAT_END]: [victory: boolean];
  [GameEvent.COMBO_UPDATE]: [combo: number];
  [GameEvent.TARGET_ENEMY]: [index: number];
  [GameEvent.USE_CONSUMABLE]: [slotIndex: number];
  [GameEvent.ACTIVATE_ABILITY]: [];
  [GameEvent.END_TURN_EARLY]: [];
  [GameEvent.NODE_SELECTED]: [nodeId: string];
  [GameEvent.RUN_STARTED]: [];
  [GameEvent.RUN_ENDED]: [completed: boolean];
  [GameEvent.COMBAT_SCENE_RUN]: [payload: { config?: CombatConfig; snapshot?: CombatSnapshot }];
  [GameEvent.COMBAT_SCENE_READY]: [];
  [GameEvent.COMBAT_SCENE_STOP]: [];
  [GameEvent.ENEMY_DIED]: [payload: { enemyId: string; enemyIndex: number; flashBeforeDust?: boolean }];
  [GameEvent.DEADEYE_ACTIVATED]: [];
  [GameEvent.DEADEYE_ENDED]: [];
  [GameEvent.ABILITY_STARTED]: [payload: { character: string }];
  [GameEvent.ABILITY_ENDED]: [payload: { character: string }];
  [GameEvent.PLAYER_ATTACK]: [];
  [GameEvent.PLAYER_HIT]: [];
  [GameEvent.ARTIFACT_USED]: [artifactId: string];
  [GameEvent.PLAYER_DAMAGE_LINE]: [enemyId: string];
  [GameEvent.ENEMY_DAMAGED]: [enemyId: string];
  [GameEvent.PLAYER_BLOOD_EFFECT]: [];
  [GameEvent.ENEMY_BLOOD_EFFECT]: [enemyId: string];
  [GameEvent.ENEMY_COINS_EFFECT]: [enemyId: string];
  [GameEvent.PLAYER_HEAL_EFFECT]: [];
  [GameEvent.ENEMY_HEAL_EFFECT]: [enemyId: string];
  [GameEvent.BOMB_EFFECT]: [payload: { row: number; col: number }];
  [GameEvent.SPARK_EFFECT]: [payload: { x: number; y: number }];
  [GameEvent.SHOOT_EFFECT]: [payload: { x: number; y: number }];
  [GameEvent.DEV_SET_BOARD_EDIT]: [operation: DevBoardEditOperation | null];
  [GameEvent.DEV_BOARD_CELL_CLICKED]: [row: number, col: number];
  [GameEvent.DEV_ADD_TILE]: [type: TileType, level?: number];
  [GameEvent.DEV_REMOVE_TILE]: [type: TileType];
  [GameEvent.DEV_SET_TILE_LEVEL]: [type: TileType, level: number];
  [GameEvent.DEV_SET_GOLD]: [amount: number];
  [GameEvent.DEV_SET_HP]: [current: number, max: number];
  [GameEvent.DEV_SET_ABILITY_CHARGE]: [charge: number];
  [GameEvent.DEV_ADD_ARTIFACT]: [artifact: ArtifactInstance];
  [GameEvent.DEV_REMOVE_ARTIFACT]: [id: string];
}
