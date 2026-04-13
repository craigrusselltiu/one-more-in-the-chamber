import { memo, useCallback, useState, useEffect } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore, getEnemyStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import { Tooltip } from '../components/Tooltip';
import { ALL_ENEMIES } from '../../data/enemies';
import type { EnemyState } from '../../types/combat';

/** Map enemy type to sprite file. Dusty Dan reuses the bandit sprite. */
const ENEMY_SPRITES: Record<string, string> = {
  coyote: 'coyote.png',
  bandit: 'bandit.png',
  vulture: 'vulture.png',
  rattlesnake: 'rattlesnake.png',
  pack_mule: 'pack_mule.png',
  dusty_dan: 'dusty.png',
  tumbleweed_golem: 'tumbleweed_golem.png',
  dust_devil: 'dust_devil.png',
  prospector_gone_mad: 'mad_prospector.png',
  powder_monkey: 'powder_monkey.png',
  mining_canary: 'canary.png',
  tunnel_rat: 'tunnel_rat.png',
  mine_foreman: 'mining_foreman.png',
  ore_golem: 'ore_golem.png',
  mine_cart: 'minecart.png',
  copperhead_cassidy: 'copperhead.png',
  train_guard: 'train_guard.png',
  guard_dog: 'guard_dog.png',
  hellfire_preacher: 'hellfire_preacher.png',
  hangman: 'hangman.png',
  corrupt_deputy: 'corrupt_deputy.png',
  saloon_brawler: 'saloon_brawler.png',
  sheriffs_shadow: 'sheriffs_shadow.png',
  outlaw_king: 'outlaw_king.png',
  outlaw_king_act1: 'outlaw_king.png',
  outlaw_king_act2: 'outlaw_king.png',
  iron_eye_isabella: 'ironeye.png',
};

/** Enemies with random sprite variants, picked deterministically by enemy id. */
const ENEMY_SPRITE_VARIANTS: Record<string, string[]> = {
  mining_canary: ['canary.png', 'canary_alt.png'],
};

/** Per-enemy sprite scale overrides. Scale is applied via CSS transform with
 *  a bottom-center origin so the feet stay anchored to the shadow. */
const ENEMY_SPRITE_SCALE: Record<string, number> = {
  hangman: 1.5,
  mine_cart: 1.5,
  mine_foreman: 1.5,
  ore_golem: 1.5,
  dusty_dan: 1.5,
  copperhead_cassidy: 1.5,
  outlaw_king: 1.5,
  outlaw_king_act1: 1.5,
  outlaw_king_act2: 1.5,
  iron_eye_isabella: 1.5,
};

/** Resolve sprite filename for an enemy, picking a variant if available. */
function getEnemySprite(enemy: EnemyState): string | undefined {
  const variants = ENEMY_SPRITE_VARIANTS[enemy.enemyType];
  if (variants) {
    let hash = 0;
    for (let i = 0; i < enemy.id.length; i++) hash = (hash + enemy.id.charCodeAt(i)) | 0;
    return variants[Math.abs(hash) % variants.length];
  }
  // Iron Eye Isabella switches to her enraged sprite at <50% HP (matches the
  // 50% HP trigger that grants Rageful, Block, Barricade, Cloak, Grace, Terrified).
  if (
    enemy.enemyType === 'iron_eye_isabella'
    && enemy.health > 0
    && enemy.health < enemy.maxHealth * 0.5
  ) {
    return 'ironeye_alt.png';
  }
  return ENEMY_SPRITES[enemy.enemyType];
}

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
  const SLOT_OFFSET: Record<number, number> = { 0: -60, 1: 88, 2: -60 };

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
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      if (args[0] === enemy?.id) {
        setShaking(true);
        setTimeout(() => setShaking(false), 300);
      }
    };
    EventBus.on(GameEvent.ENEMY_ACTION, handler);
    return () => { EventBus.off(GameEvent.ENEMY_ACTION, handler); };
  }, [enemy?.id]);

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
      className="relative flex flex-col items-center text-center px-1 py-0.5 pointer-events-auto outline-none cursor-pointer"
      style={{
        width: 116,
        height: 152,
      }}
    >
      {/* Intent above sprite. Scaled enemies (e.g. Outlaw King, Iron Eye) grow
          upward from the bottom, so the intent must be lifted by the extra
          sprite height to stay above the head. */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: -16 - 96 * ((ENEMY_SPRITE_SCALE[enemy.enemyType] ?? 1) - 1) }}
      >
        <EnemyIntent intent={enemy.intent} rageful={enemy.ragefulStacks} />
      </div>

      {/* Enemy sprite with shadow + name tooltip */}
      <Tooltip text={ALL_ENEMIES[enemy.enemyType]?.name ?? enemy.enemyType} position="bottom" gap={16}>
        {getEnemySprite(enemy) ? (
          <div className={`relative my-1.5 shrink-0${shaking ? ' enemy-shake' : ''}`} style={{ width: 96, height: 96 }}>
            <img
              src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
              alt=""
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: 80, imageRendering: 'pixelated', opacity: 0.5 }}
            />
            <img
              className={isTargeted ? 'enemy-targeted' : undefined}
              src={`${import.meta.env.BASE_URL}assets/sprites/${getEnemySprite(enemy)}`}
              alt={enemy.enemyType}
              style={{
                width: 96,
                height: 96,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                transform: ENEMY_SPRITE_SCALE[enemy.enemyType]
                  ? `scale(${ENEMY_SPRITE_SCALE[enemy.enemyType]})`
                  : undefined,
                transformOrigin: 'bottom center',
              }}
            />
          </div>
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
      </Tooltip>

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
