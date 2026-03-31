import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore, getEnemyStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import type { EnemyState } from '../../types/combat';

/**
 * EnemyTargeting: shows up to 3 enemy panels on the right side.
 * Each panel has: sprite placeholder, name, intent, HP bar, status effects.
 * Click/tap an enemy to target it (free action).
 */
export const EnemyTargeting = memo(function EnemyTargeting() {
  const enemies = useCombatStore((s) => s.enemies);
  const targetedIndex = useCombatStore((s) => s.targetedEnemyIndex);

  if (enemies.length === 0) {
    return (
      <div className="text-[7px] text-stone-500 text-center">
        No enemies
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-center">
      {enemies.map((enemy, index) => (
        <EnemyPanel
          key={enemy.id}
          enemy={enemy}
          index={index}
          isTargeted={index === targetedIndex}
        />
      ))}
    </div>
  );
});

interface EnemyPanelProps {
  enemy: EnemyState;
  index: number;
  isTargeted: boolean;
}

const EnemyPanel = memo(function EnemyPanel({
  enemy,
  index,
  isTargeted,
}: EnemyPanelProps) {
  const handleClick = useCallback(() => {
    if (!enemy.isDead) {
      EventBus.emit(GameEvent.TARGET_ENEMY, index);
      useCombatStore.getState().setTargetedEnemy(index);
    }
  }, [index, enemy.isDead]);

  if (enemy.isDead) {
    return (
      <div className="opacity-30 pointer-events-none px-1 py-0.5">
        <div className="text-[7px] text-stone-500 line-through">
          {enemy.enemyType}
        </div>
      </div>
    );
  }

  const effects = getEnemyStatusEffects(enemy);
  const borderColor = isTargeted ? '#FFD700' : '#555';

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center text-center px-1 py-0.5 pointer-events-auto"
      style={{
        border: `1px solid ${borderColor}`,
        backgroundColor: isTargeted ? 'rgba(255, 215, 0, 0.08)' : 'rgba(0,0,0,0.3)',
      }}
      title={`Target: ${enemy.enemyType}`}
    >
      {/* Enemy sprite placeholder */}
      <div
        className="border border-stone-600 border-dashed mb-0.5 flex items-center justify-center"
        style={{ width: 40, height: 40 }}
      >
        <span className="text-stone-600 capitalize" style={{ fontSize: '6px' }}>
          {enemy.enemyType.slice(0, 4)}
        </span>
      </div>

      {/* Enemy name */}
      <div className="text-[7px] text-stone-300 leading-none mb-0.5 capitalize">
        {enemy.enemyType}
        {isTargeted && (
          <span className="text-yellow-400 ml-0.5">&lt;</span>
        )}
      </div>

      {/* Intent */}
      <EnemyIntent intent={enemy.intent} />

      {/* HP bar */}
      <HealthBar
        current={enemy.health}
        max={enemy.maxHealth}
        width={56}
        color="#D04040"
      />

      {/* Status effects */}
      <StatusEffects effects={effects} />
    </button>
  );
});
