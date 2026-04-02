import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore, getEnemyStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import type { EnemyState } from '../../types/combat';

/** Max enemy slots to always reserve space for. */
const MAX_SLOTS = 3;

/**
 * EnemyTargeting: shows up to 3 fixed enemy slots on the right side.
 * Slots are always present so dead enemies don't shift others around.
 */
export const EnemyTargeting = memo(function EnemyTargeting() {
  const enemies = useCombatStore((s) => s.enemies);
  const targetedIndex = useCombatStore((s) => s.targetedEnemyIndex);

  // Pad to MAX_SLOTS with nulls for empty slots
  const slots: (EnemyState | null)[] = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    slots.push(enemies[i] ?? null);
  }

  return (
    <div className="flex flex-col gap-1 items-center">
      {slots.map((enemy, index) => (
        <EnemySlot
          key={index}
          enemy={enemy}
          index={index}
          isTargeted={enemy !== null && !enemy.isDead && index === targetedIndex}
        />
      ))}
    </div>
  );
});

interface EnemySlotProps {
  enemy: EnemyState | null;
  index: number;
  isTargeted: boolean;
}

const EnemySlot = memo(function EnemySlot({
  enemy,
  index,
  isTargeted,
}: EnemySlotProps) {
  const handleClick = useCallback(() => {
    if (enemy && !enemy.isDead) {
      EventBus.emit(GameEvent.TARGET_ENEMY, index);
      useCombatStore.getState().setTargetedEnemy(index);
    }
  }, [index, enemy]);

  // Empty or dead slot: reserve space but show nothing
  if (!enemy || enemy.isDead) {
    return <div style={{ width: 84, height: 120 }} />;
  }

  const effects = getEnemyStatusEffects(enemy);
  const nonBlockEffects = effects.filter((e) => e.type !== 'block');
  const borderColor = isTargeted ? '#FFD700' : '#555';

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center text-center px-1 py-0.5 pointer-events-auto"
      style={{
        width: 84,
        height: 120,
        border: `1px solid ${borderColor}`,
        backgroundColor: isTargeted ? 'rgba(255, 215, 0, 0.08)' : 'rgba(0,0,0,0.3)',
      }}
      title={`Target: ${enemy.enemyType}`}
    >
      {/* Enemy sprite placeholder */}
      <div
        className="border border-stone-600 border-dashed mb-0.5 flex items-center justify-center"
        style={{ width: 80, height: 60 }}
      >
        <span className="text-stone-600 capitalize" style={{ fontSize: '8px' }}>
          {enemy.enemyType.slice(0, 4)}
        </span>
      </div>

      {/* Enemy name */}
      <div className="text-[8px] text-stone-300 leading-none mb-0.5 capitalize">
        {enemy.enemyType}
        {isTargeted && (
          <span className="text-yellow-400 ml-0.5">&lt;</span>
        )}
      </div>

      {/* Intent */}
      <EnemyIntent intent={enemy.intent} />

      {/* HP bar with BLK badge to the left */}
      <div className="relative">
        {enemy.block > 0 && (
          <div className="absolute right-full top-0 mr-0.5">
            <BlockBadge value={enemy.block} />
          </div>
        )}
        <HealthBar
          current={enemy.health}
          max={enemy.maxHealth}
          width={70}
          color="#D04040"
        />
      </div>

      {/* Status effects (without block) */}
      <StatusEffects effects={nonBlockEffects} />
    </button>
  );
});
