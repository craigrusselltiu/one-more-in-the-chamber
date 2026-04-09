import type { EnemyIntent } from '../../types/combat';
import type { Enemy } from './Enemy';
import type { BoardHazardManager } from '../board/BoardHazardManager';

/**
 * EnemyAI: chooses intents for enemies.
 * Enemies with explicit movesets (defined in enemies.ts) use Enemy.chooseIntent() directly.
 * Legacy enemies without movesets fall back to Enemy.chooseIntent() which uses weighted random.
 */

export function chooseEnemyIntent(enemy: Enemy, _aliveCount: number): EnemyIntent {
  return enemy.chooseIntent();
}

/**
 * Intent for Mine Cart in a timed encounter context.
 * Shows turns remaining until crash instead of a real attack.
 */
export function chooseMineCartTimedIntent(turnsLeft: number, failureDamage: number): EnemyIntent {
  return {
    type: 'ability',
    value: failureDamage,
    description: turnsLeft <= 1 ? `ATK ${failureDamage}` : `ATK ${failureDamage} IN ${turnsLeft}`,
  };
}

/**
 * Execute a board-manipulation intent (legacy fallback).
 * Used only for enemies without structured movesets.
 */
export function executeBoardManipulation(
  enemy: Enemy,
  intent: EnemyIntent,
  hazardManager: BoardHazardManager,
  bombCountdownBonus = 0,
): string {
  const def = enemy.getDefinition();
  const desc = intent.description;

  if (desc.startsWith('POISON')) {
    const count = intent.value ?? 2;
    hazardManager.placeRandomPoison(count);
    return `${def.name} poisons ${count} tiles`;
  }

  if (desc.startsWith('LOCK')) {
    const count = intent.value ?? 1;
    hazardManager.placeRandomLocks(count);
    return `${def.name} locks ${count} tiles`;
  }

  if (desc.startsWith('BURY')) {
    const count = intent.value ?? 3;
    hazardManager.placeRandomSand(count);
    return `${def.name} buries ${count} tiles`;
  }

  if (desc.startsWith('BOMB')) {
    const count = intent.value ?? 1;
    hazardManager.placeRandomBombs(count, 3 + bombCountdownBonus);
    return `${def.name} places ${count} bombs`;
  }

  return '';
}
