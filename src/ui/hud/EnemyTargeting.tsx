import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore, getEnemyStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import type { EnemyState } from '../../types/combat';

/** Map enemy type to sprite file. Dusty Dan reuses the bandit sprite. */
const ENEMY_SPRITES: Record<string, string> = {
  coyote: 'coyote.png',
  bandit: 'bandit.png',
  vulture: 'vulture.png',
  rattlesnake: 'rattlesnake.png',
  dusty_dan: 'dusty.png',
  card_shark: 'card_shark.png',
  tumbleweed_golem: 'tumbleweed_golem.png',
};

/**
 * EnemyTargeting: shows up to 3 fixed enemy slots on the right side.
 * Slots are always present so dead enemies don't shift others around.
 */
export const EnemyTargeting = memo(function EnemyTargeting() {
  const enemies = useCombatStore((s) => s.enemies);
  const targetedIndex = useCombatStore((s) => s.targetedEnemyIndex);
  const canShootEnemy = useCombatStore((s) => s.canDeadeyeShootEnemy);

  // Build fixed 3-slot layout.
  // First enemy (index 0) always stays in the center slot (slot 1).
  // Additional enemies fill top (slot 0) then bottom (slot 2).
  // This prevents the main enemy from shifting when minions are summoned.
  const slots: (EnemyState | null)[] = [null, null, null];
  if (enemies.length >= 1) slots[1] = enemies[0];
  if (enemies.length >= 2) slots[0] = enemies[1];
  if (enemies.length >= 3) slots[2] = enemies[2];

  // Map visual slot index back to enemy array index
  const SLOT_TO_ENEMY: Record<number, number> = { 0: 1, 1: 0, 2: 2 };
  const slotToEnemyIndex = (slotIdx: number): number => SLOT_TO_ENEMY[slotIdx] ?? slotIdx;

  // Zig-zag offsets: slots 0 & 2 (top/bottom) left, slot 1 (center) right
  const SLOT_OFFSET: Record<number, number> = { 0: -60, 1: 68, 2: -60 };

  return (
    <div className="flex flex-col items-center" style={{ position: 'relative', gap: '-8px' }}>
      {slots.map((enemy, slotIdx) => {
        const enemyIdx = slotToEnemyIndex(slotIdx);
        return (
          <div key={slotIdx} style={{ marginLeft: SLOT_OFFSET[slotIdx] ?? 0, marginTop: slotIdx > 0 ? -20 : 0 }}>
            <EnemySlot
              enemy={enemy}
              index={enemyIdx}
              isTargeted={enemy !== null && !enemy.isDead && enemyIdx === targetedIndex}
              canShootEnemy={canShootEnemy}
            />
          </div>
        );
      })}
    </div>
  );
});

interface EnemySlotProps {
  enemy: EnemyState | null;
  index: number;
  isTargeted: boolean;
  canShootEnemy: boolean;
}

const EnemySlot = memo(function EnemySlot({
  enemy,
  index,
  isTargeted,
  canShootEnemy,
}: EnemySlotProps) {
  const handleClick = useCallback(() => {
    if (enemy && !enemy.isDead) {
      if (canShootEnemy) {
        EventBus.emit(GameEvent.DEADEYE_SHOOT_ENEMY, index);
      } else {
        EventBus.emit(GameEvent.TARGET_ENEMY, index);
        useCombatStore.getState().setTargetedEnemy(index);
      }
    }
  }, [index, enemy, canShootEnemy]);

  // Empty or dead slot: fixed-height spacer to prevent position shifts
  if (!enemy || enemy.isDead) {
    return <div style={{ width: 116, height: 152 }} />;
  }

  const effects = getEnemyStatusEffects(enemy);
  const nonBlockEffects = effects.filter((e) => e.type !== 'block');

  return (
    <button
      onClick={handleClick}
      data-no-click-sfx
      className="flex flex-col items-center text-center px-1 py-0.5 pointer-events-auto outline-none cursor-pointer"
      style={{
        width: 116,
        height: 152,
      }}
    >
      {/* Intent above sprite */}
      <EnemyIntent intent={enemy.intent} />

      {/* Enemy sprite */}
      {ENEMY_SPRITES[enemy.enemyType] ? (
        <img
          src={`${import.meta.env.BASE_URL}assets/sprites/${ENEMY_SPRITES[enemy.enemyType]}`}
          alt={enemy.enemyType}
          className={`mb-0.5 shrink-0${isTargeted ? ' enemy-targeted' : ''}`}
          style={{ width: 96, height: 96, imageRendering: 'pixelated', objectFit: 'contain' }}
        />
      ) : (
        <div
          className={`border border-stone-600 border-dashed mb-0.5 flex items-center justify-center shrink-0${isTargeted ? ' enemy-targeted' : ''}`}
          style={{ width: 96, height: 96 }}
        >
          <span className="text-stone-600 capitalize" style={{ fontSize: '8px' }}>
            {enemy.enemyType.slice(0, 4)}
          </span>
        </div>
      )}

      {/* Enemy name */}
      <div className="text-[8px] text-stone-300 leading-none mb-0.5 capitalize">
        {enemy.enemyType}
      </div>

      {/* HP bar centered, block badge overlaid to the left */}
      <div className="relative">
        <div className="absolute right-full top-0 mr-1.5 flex items-center" style={{ height: '100%' }}>
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
