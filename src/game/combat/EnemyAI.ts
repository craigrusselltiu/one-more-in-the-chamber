import type { EnemyIntent } from '../../types/combat';
import type { Enemy } from './Enemy';

/**
 * EnemyAI: delegates intent selection to Enemy.chooseIntent() which uses
 * the structured moveset system defined in enemies.ts.
 */

export function chooseEnemyIntent(enemy: Enemy, aliveCount: number, allyInjured = false): EnemyIntent {
  return enemy.chooseIntent(aliveCount, allyInjured);
}

/**
 * Intent for Mine Cart in a timed encounter context.
 * Shows turns remaining until crash instead of a real attack.
 * `turnsLeft` should be the enemy's fuse value (kept in sync with the
 * Fuse status icon). Always shows "IN N" for N >= 1 so the countdown
 * stays visible on the final turn.
 */
export function chooseMineCartTimedIntent(turnsLeft: number, failureDamage: number): EnemyIntent {
  return {
    type: 'attack',
    value: failureDamage,
    description: turnsLeft <= 0 ? `ATK ${failureDamage}` : `ATK ${failureDamage} IN ${turnsLeft}`,
    actions: [{ kind: 'attack', value: failureDamage }],
  };
}
