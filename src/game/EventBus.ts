import type { CombatState, EnemyState } from '../types/combat';

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
  CONSUMABLE_USED: 'consumable:used',

  // Player actions (React -> Phaser)
  TARGET_ENEMY: 'player:target-enemy',
  USE_CONSUMABLE: 'player:use-consumable',
  ACTIVATE_ABILITY: 'player:activate-ability',
  END_TURN_EARLY: 'player:end-turn-early',

  // Visual effects
  FLASH_LINE: 'vfx:flash-line',
  FLASH_LINE_TO_ENEMY: 'vfx:flash-line-to-enemy',
  SCREEN_SHAKE: 'vfx:screen-shake',
  TILE_PARTICLES: 'vfx:tile-particles',
  /** Floating number: (target: 'player'|'enemy', index: number, text: string, color: string) */
  FLOATING_NUMBER: 'vfx:floating-number',

  // Board input -> CombatManager
  SWAP_REQUESTED: 'board:swap-requested',
  DEADEYE_SHOOT: 'board:deadeye-shoot',
  SHUFFLE_HOLD_TOGGLE: 'board:shuffle-hold-toggle',
  /** Enhanced VFX for a Deadeye shot: (x, y, tileColorHex) */
  DEADEYE_SHOT_VFX: 'vfx:deadeye-shot',

  // Map / run flow
  NODE_SELECTED: 'map:node-selected',
  RUN_STARTED: 'run:started',
  RUN_ENDED: 'run:ended',

  // Boot
  BOOT_COMPLETE: 'boot:complete',

  // Mid-combat save
  COMBAT_SAVE_REQUESTED: 'combat:save-requested',

  // Music control
  MUSIC_FADE_OUT: 'music:fade-out',
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
}
