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

  // Build fixed 3-slot layout.
  // Single enemy goes to the middle slot. Multiple enemies fill top-down
  // and keep their array index so summoned enemies don't shift the original.
  const slots: (EnemyState | null)[] = [null, null, null];
  if (enemies.length === 1) {
    slots[1] = enemies[0];
  } else {
    for (let i = 0; i < Math.min(enemies.length, MAX_SLOTS); i++) {
      slots[i] = enemies[i];
    }
  }

  // Map slot index to actual enemy index for targeting
  const slotToEnemyIndex = (slotIdx: number): number => {
    if (enemies.length === 1) return 0;
    return slotIdx;
  };

  return (
    <div className="flex flex-col gap-1 items-center">
      {slots.map((enemy, slotIdx) => {
        const enemyIdx = slotToEnemyIndex(slotIdx);
        return (
          <EnemySlot
            key={slotIdx}
            enemy={enemy}
            index={enemyIdx}
            isTargeted={enemy !== null && !enemy.isDead && enemyIdx === targetedIndex}
          />
        );
      })}
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
      {/* Intent above sprite */}
      <EnemyIntent intent={enemy.intent} />

      {/* Enemy sprite placeholder */}
      <div
        className="border border-stone-600 border-dashed mb-0.5 flex items-center justify-center shrink-0"
        style={{ width: 64, height: 64 }}
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

      {/* HP bar centered, block badge overlaid to the left */}
      <div className="relative">
        <div className="absolute right-full top-0 mr-0.5 flex items-center" style={{ height: '100%' }}>
          {enemy.block > 0 && <BlockBadge value={enemy.block} />}
        </div>
        <HealthBar
          current={enemy.health}
          max={enemy.maxHealth}
          width={70}
          color="#D04040"
        />
      </div>

      {/* Status effects (without block) - fixed height section */}
      <div style={{ minHeight: 22 }}>
        <StatusEffects effects={nonBlockEffects} />
      </div>
    </button>
  );
});
