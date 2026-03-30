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
  SCREEN_CHANGE: 'screen:change',
  COMBAT_STATE_UPDATE: 'combat:state-update',
  PLAYER_HP_CHANGE: 'player:hp-change',
  ENEMY_HP_CHANGE: 'enemy:hp-change',
  GOLD_CHANGE: 'gold:change',
  SWAPS_CHANGE: 'swaps:change',
  ABILITY_CHARGE_CHANGE: 'ability:charge-change',
  STATUS_EFFECT_CHANGE: 'status:effect-change',
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  COMBAT_END: 'combat:end',
} as const;
