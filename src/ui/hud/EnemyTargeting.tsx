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
 *  a bottom-center origin so the feet stay anchored to the shadow.
 *  Scale >= 2.0 disables the top enemy slot (max 2 visible enemies). */
const ENEMY_SPRITE_SCALE: Record<string, number> = {
  hangman: 1.5,
  pack_mule: 1.5,
  dust_devil: 1.5,
  tumbleweed_golem: 2.0,
  mine_cart: 1.5,
  mine_foreman: 1.5,
  ore_golem: 2.0,
  dusty_dan: 1.5,
  copperhead_cassidy: 1.5,
  outlaw_king: 1.5,
  outlaw_king_act1: 1.5,
  outlaw_king_act2: 1.5,
  iron_eye_isabella: 1.5,
};

/** Threshold above which a sprite is considered oversize and forces a 2-slot layout. */
const OVERSIZE_SCALE_THRESHOLD = 2.0;

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
  // If any enemy in the encounter is oversize (>=2x scale), disable the top
  // slot and route the second enemy to the bottom — leaves room for the big
  // sprite. We deliberately include DEAD oversize enemies so the layout
  // doesn't reshuffle (and visibly teleport the minion) the moment the 2x dies.
  const hasOversize = enemies.some(
    (e) => e && (ENEMY_SPRITE_SCALE[e.enemyType] ?? 1) >= OVERSIZE_SCALE_THRESHOLD,
  );
  const slots: (EnemyState | null)[] = [null, null, null];
  if (enemies.length >= 1) slots[1] = enemies[0];
  if (hasOversize) {
    if (enemies.length >= 2) slots[2] = enemies[1];
    // Any 3rd enemy is ignored — encounter design should ensure max 2 enemies with an oversize boss.
  } else {
    if (enemies.length >= 2) slots[0] = enemies[1];
    if (enemies.length >= 3) slots[2] = enemies[2];
  }

  // Map visual slot index back to enemy array index by looking up the assigned enemy.
  const slotToEnemyIndex = (slotIdx: number): number => {
    const e = slots[slotIdx];
    if (!e) return slotIdx;
    const idx = enemies.indexOf(e);
    return idx === -1 ? slotIdx : idx;
  };

  // Zig-zag offsets: slots 0 & 2 (top/bottom) left, slot 1 (center) right
  const SLOT_OFFSET: Record<number, number> = { 0: -60, 1: 88, 2: -60 };

  return (
    <div className="flex flex-col items-center" style={{ position: 'relative', gap: '-8px' }}>
      {slots.map((enemy, slotIdx) => {
        const enemyIdx = slotToEnemyIndex(slotIdx);
        // 2x sprites extend ~48px past their container on each side; if this
        // slot holds one, pull it left enough that the right edge clears the
        // screen. Other slots/scales keep the normal zig-zag offset.
        // When a 2x enemy is present (in slot 1), visually push slot 2 down
        // ~20px so the minion isn't right under the big sprite. Use transform
        // (not marginTop) to avoid growing the flex container — the parent
        // is justify-center, which would otherwise shift slot 1 upward.
        const isOversizeSlot = enemy
          && (ENEMY_SPRITE_SCALE[enemy.enemyType] ?? 1) >= OVERSIZE_SCALE_THRESHOLD;
        const marginLeft = isOversizeSlot ? 40 : (SLOT_OFFSET[slotIdx] ?? 0);
        const marginTop = slotIdx > 0 ? -20 : 0;
        const transform = hasOversize && slotIdx === 2 ? 'translateY(20px)' : undefined;
        return (
          <div key={slotIdx} style={{ marginLeft, marginTop, transform }}>
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
            {isTargeted && (
              // Duplicate sprite passed through the SVG outline filter — only the
              // 2px alpha-aware ring is rendered, never the body, so the breathing
              // opacity animation can never tint the original sprite.
              <img
                src={`${import.meta.env.BASE_URL}assets/sprites/${getEnemySprite(enemy)}`}
                alt=""
                aria-hidden
                className="enemy-target-outline absolute top-0 left-0"
                style={{
                  width: 96,
                  height: 96,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  transform: ENEMY_SPRITE_SCALE[enemy.enemyType]
                    ? `scale(${ENEMY_SPRITE_SCALE[enemy.enemyType]})`
                    : undefined,
                  transformOrigin: 'bottom center',
                  filter: 'url(#enemy-target-outline)',
                }}
              />
            )}
          </div>
        ) : (
          <div
            className={`border ${isTargeted ? 'border-white' : 'border-stone-600'} border-dashed mb-0.5 flex items-center justify-center shrink-0`}
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
