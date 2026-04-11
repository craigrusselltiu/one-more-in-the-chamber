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
 */
export function chooseMineCartTimedIntent(turnsLeft: number, failureDamage: number): EnemyIntent {
  return {
    type: 'attack',
    value: failureDamage,
    description: turnsLeft <= 1 ? `ATK ${failureDamage}` : `ATK ${failureDamage} IN ${turnsLeft}`,
    actions: [{ kind: 'attack', value: failureDamage }],
  };
}
