import type { EnemyIntent } from '../../types/combat';
import type { Enemy } from './Enemy';

/**
 * EnemyAI: delegates intent selection to Enemy.chooseIntent() which uses
 * the structured moveset system defined in enemies.ts.
 */

export function chooseEnemyIntent(enemy: Enemy, aliveCount: number, allyInjured = false): EnemyIntent {
  return enemy.chooseIntent(aliveCount, allyInjured);
}
