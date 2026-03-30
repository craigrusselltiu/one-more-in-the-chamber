/**
 * AnimationStateMachine: priority-based animation system.
 * Priority (highest first): Death > Hit > Ability > Attack > Block > Heal > Match > Idle.
 * One animation at a time. Effects apply mechanically regardless of animation state.
 */

export type AnimationState =
  | 'idle'
  | 'match'
  | 'heal'
  | 'block'
  | 'attack'
  | 'ability'
  | 'hit'
  | 'death';

const PRIORITY: Record<AnimationState, number> = {
  idle: 0,
  match: 1,
  heal: 2,
  block: 3,
  attack: 4,
  ability: 5,
  hit: 6,
  death: 7,
};

export class AnimationStateMachine {
  private current: AnimationState = 'idle';
  private locked = false;

  getCurrent(): AnimationState {
    return this.current;
  }

  /** Attempt to transition. Returns true if accepted. */
  transition(next: AnimationState): boolean {
    if (this.locked && next !== 'death') return false;
    if (PRIORITY[next] < PRIORITY[this.current] && this.current !== 'idle') {
      return false;
    }
    this.current = next;
    if (next === 'death') this.locked = true;
    return true;
  }

  /** Called when current animation completes. Returns to idle. */
  complete(): void {
    if (this.locked) return;
    this.current = 'idle';
  }

  reset(): void {
    this.current = 'idle';
    this.locked = false;
  }
}
