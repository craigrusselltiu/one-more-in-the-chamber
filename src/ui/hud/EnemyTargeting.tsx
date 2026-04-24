import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore, getEnemyStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import { Tooltip } from '../components/Tooltip';
import { ALL_ENEMIES } from '../../data/enemies';
import type { EnemyState } from '../../types/combat';
import { useSettingsStore } from '../../store/settingsStore';

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
  corrupt_deputy: 1.5,
  sheriffs_shadow: 1.5,
  outlaw_king: 1.5,
  outlaw_king_act1: 1.5,
  outlaw_king_act2: 1.5,
  iron_eye_isabella: 1.5,
};

/** Threshold above which a sprite is considered oversize and forces a 2-slot layout. */
const OVERSIZE_SCALE_THRESHOLD = 2.0;
const BASE_SPRITE_SIZE = 96;
const DEATH_ANIMATION_MS = 720;
const DAMAGE_FLASH_MS = 300;
const DUST_PARTICLE_LIFETIME = 0.38;
const DUST_SAMPLE_STEP = 2;
let nextDeathEffectId = 0;

interface EnemyDeathEffect {
  id: number;
  enemyId: string;
  slotIndex: number;
  spriteFile: string;
  scale: number;
  flashBeforeDust: boolean;
}

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

function getEnemySlotLayout(
  slotIdx: number,
  enemy: EnemyState | null,
  hasOversize: boolean,
): { marginLeft: number; marginTop: number; transform?: string } {
  const SLOT_OFFSET: Record<number, number> = { 0: -60, 1: 88, 2: -60 };
  const isOversizeSlot = enemy
    && (ENEMY_SPRITE_SCALE[enemy.enemyType] ?? 1) >= OVERSIZE_SCALE_THRESHOLD;
  const marginLeft = isOversizeSlot ? 40 : (SLOT_OFFSET[slotIdx] ?? 0);
  const marginTop = slotIdx > 0 ? -20 : 0;
  const slotShiftY = slotIdx === 2 ? (hasOversize ? 20 : 15) : 0;
  return {
    marginLeft,
    marginTop,
    transform: slotShiftY ? `translateY(${slotShiftY}px)` : undefined,
  };
}

function getSlotIndexForEnemyIndex(enemyIndex: number, hasOversize: boolean): number {
  if (enemyIndex <= 0) return 1;
  if (enemyIndex === 1) return hasOversize ? 2 : 0;
  return 2;
}

/**
 * EnemyTargeting: shows up to 3 fixed enemy slots on the right side.
 * Slots are always present so dead enemies don't shift others around.
 */
export const EnemyTargeting = memo(function EnemyTargeting() {
  const enemies = useCombatStore((s) => s.enemies);
  const targetedIndex = useCombatStore((s) => s.targetedEnemyIndex);
  const canShootEnemy = useCombatStore((s) => s.canDeadeyeShootEnemy);
  const juiceAnimationsEnabled = useSettingsStore((s) => s.juiceAnimationsEnabled);
  const [deathEffects, setDeathEffects] = useState<EnemyDeathEffect[]>([]);
  const [dyingEnemyIds, setDyingEnemyIds] = useState<string[]>([]);

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

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      if (!juiceAnimationsEnabled) return;
      const payload = args[0] as { enemyId: string; enemyIndex: number; flashBeforeDust?: boolean };
      const slotIndex = (() => {
        const byId = slots.findIndex((slotEnemy) => slotEnemy?.id === payload.enemyId);
        return byId >= 0 ? byId : getSlotIndexForEnemyIndex(payload.enemyIndex, hasOversize);
      })();
      const enemy = slotIndex >= 0 ? slots[slotIndex] : enemies[payload.enemyIndex] ?? null;
      if (!enemy) return;
      const spriteFile = getEnemySprite(enemy);
      if (!spriteFile) return;
      const scale = ENEMY_SPRITE_SCALE[enemy.enemyType] ?? 1;
      const effect: EnemyDeathEffect = {
        id: nextDeathEffectId++,
        enemyId: payload.enemyId,
        slotIndex,
        spriteFile,
        scale,
        flashBeforeDust: payload.flashBeforeDust ?? true,
      };
      setDyingEnemyIds((prev) => (prev.includes(payload.enemyId) ? prev : [...prev, payload.enemyId]));
      setDeathEffects((prev) => [...prev, effect]);
    };

    EventBus.on(GameEvent.ENEMY_DIED, handler);
    return () => { EventBus.off(GameEvent.ENEMY_DIED, handler); };
  }, [enemies, hasOversize, juiceAnimationsEnabled, slots]);

  useEffect(() => {
    if (juiceAnimationsEnabled) return;
    setDeathEffects([]);
    setDyingEnemyIds([]);
  }, [juiceAnimationsEnabled]);

  return (
    <div className="flex flex-col items-center" style={{ position: 'relative', gap: '-8px' }}>
      {slots.map((enemy, slotIdx) => {
        const enemyIdx = slotToEnemyIndex(slotIdx);
        const layout = getEnemySlotLayout(slotIdx, enemy, hasOversize);
        const slotEffects = deathEffects.filter((effect) => effect.slotIndex === slotIdx);
        return (
          <div key={slotIdx} style={{ ...layout, position: 'relative' }}>
            <EnemySlot
              enemy={enemy}
              index={enemyIdx}
              isTargeted={enemy !== null && !enemy.isDead && enemyIdx === targetedIndex}
              canShootEnemy={canShootEnemy}
              preserveDeadSprite={
                juiceAnimationsEnabled
                && enemy?.isDead === true
                && !!enemy?.id
                && dyingEnemyIds.includes(enemy.id)
                && slotEffects.length === 0
              }
            />
            {slotEffects.map((effect) => (
              <EnemyDeathDust
                key={effect.id}
                spriteFile={effect.spriteFile}
                scale={effect.scale}
                flashBeforeDust={effect.flashBeforeDust}
                onComplete={() => {
                  setDeathEffects((prev) => prev.filter((entry) => entry.id !== effect.id));
                  setDyingEnemyIds((prev) => prev.filter((id) => id !== effect.enemyId));
                }}
              />
            ))}
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
  preserveDeadSprite?: boolean;
}

const EnemySlot = memo(function EnemySlot({
  enemy,
  index,
  isTargeted,
  canShootEnemy,
  preserveDeadSprite = false,
}: EnemySlotProps) {
  const [shaking, setShaking] = useState(false);
  const [damageFlashing, setDamageFlashing] = useState(false);
  const damageFlashTimeouts = useRef<number[]>([]);
  const juiceAnimationsEnabled = useSettingsStore((s) => s.juiceAnimationsEnabled);

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

  useEffect(() => {
    const clearDamageFlashTimeouts = () => {
      for (const timeoutId of damageFlashTimeouts.current) window.clearTimeout(timeoutId);
      damageFlashTimeouts.current = [];
    };

    const handler = (...args: unknown[]) => {
      if (!juiceAnimationsEnabled || args[0] !== enemy?.id) return;
      clearDamageFlashTimeouts();
      setDamageFlashing(false);
      damageFlashTimeouts.current.push(window.setTimeout(() => {
        setDamageFlashing(true);
        damageFlashTimeouts.current.push(window.setTimeout(() => setDamageFlashing(false), DAMAGE_FLASH_MS));
      }, 0));
    };

    EventBus.on(GameEvent.ENEMY_DAMAGED, handler);
    return () => {
      EventBus.off(GameEvent.ENEMY_DAMAGED, handler);
      clearDamageFlashTimeouts();
    };
  }, [enemy?.id, juiceAnimationsEnabled]);

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

  // Empty slot: fixed-height spacer to prevent position shifts
  if (!enemy) {
    return <div style={{ width: 116, height: 152 }} />;
  }

  if (enemy.isDead && !preserveDeadSprite) {
    return <div style={{ width: 116, height: 152 }} />;
  }

  const effects = getEnemyStatusEffects(enemy);
  const nonBlockEffects = effects.filter((e) => e.type !== 'block');
  const spriteFile = getEnemySprite(enemy);
  const spriteScale = ENEMY_SPRITE_SCALE[enemy.enemyType];

  if (enemy.isDead) {
    return (
      <div
        className="relative flex flex-col items-center text-center px-1 py-0.5 pointer-events-none"
        style={{
          width: 116,
          height: 152,
        }}
      >
        {spriteFile ? (
          <div className="relative my-1.5 shrink-0" style={{ width: 96, height: 96 }}>
            <img
              src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
              alt=""
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: 80, imageRendering: 'pixelated', opacity: 0.5 }}
            />
            <img
              src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
              alt=""
              aria-hidden
              style={{
                width: 96,
                height: 96,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                transform: spriteScale ? `scale(${spriteScale})` : undefined,
                transformOrigin: 'bottom center',
              }}
            />
          </div>
        ) : (
          <div style={{ width: 96, height: 96 }} />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      data-no-click-sfx
      data-no-hover-sfx
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
        {spriteFile ? (
          <div className={`relative my-1.5 shrink-0${shaking ? ' enemy-shake' : ''}`} style={{ width: 96, height: 96 }}>
            <img
              src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
              alt=""
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: 80, imageRendering: 'pixelated', opacity: 0.5 }}
            />
            <img
              src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
              alt={enemy.enemyType}
              data-enemy-sprite-id={enemy.id}
              style={{
                width: 96,
                height: 96,
                imageRendering: 'pixelated',
                objectFit: 'contain',
                transform: spriteScale
                  ? `scale(${spriteScale})`
                  : undefined,
                transformOrigin: 'bottom center',
              }}
            />
            {damageFlashing && (
              <img
                src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
                alt=""
                aria-hidden
                className="enemy-damage-flash-overlay absolute top-0 left-0"
                style={{
                  width: 96,
                  height: 96,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  transform: spriteScale
                    ? `scale(${spriteScale})`
                    : undefined,
                  transformOrigin: 'bottom center',
                }}
              />
            )}
            {isTargeted && (
              // Duplicate sprite passed through the SVG outline filter — only the
              // 2px alpha-aware ring is rendered, never the body, so the breathing
              // opacity animation can never tint the original sprite.
              <img
                src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
                alt=""
                aria-hidden
                className="enemy-target-outline absolute top-0 left-0"
                style={{
                  width: 96,
                  height: 96,
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  transform: spriteScale
                    ? `scale(${spriteScale})`
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
        <div className="absolute right-full mr-1.5 flex items-center" style={{ height: '100%', top: -1 }}>
          {enemy.block > 0 && <BlockBadge value={enemy.block} />}
        </div>
        <HealthBar
          current={enemy.health}
          max={enemy.maxHealth}
          width={100}
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

interface EnemyDeathDustProps {
  spriteFile: string;
  scale: number;
  flashBeforeDust: boolean;
  onComplete: () => void;
}

interface DustParticle {
  x: number;
  y: number;
  color: string;
  size: number;
  driftX: number;
  driftY: number;
  spin: number;
  activation: number;
}

interface DustPixel {
  x: number;
  y: number;
  color: string;
  activation: number;
}

interface DustSource {
  sourceCanvas: HTMLCanvasElement;
  pixels: DustPixel[];
}

const dustSourceCache = new Map<string, Promise<DustSource>>();

function loadDustSource(spriteFile: string): Promise<DustSource> {
  const cached = dustSourceCache.get(spriteFile);
  if (cached) return cached;

  const promise = new Promise<DustSource>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = BASE_SPRITE_SIZE;
      sourceCanvas.height = BASE_SPRITE_SIZE;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) {
        reject(new Error('Unable to create dust source canvas'));
        return;
      }

      sourceCtx.clearRect(0, 0, BASE_SPRITE_SIZE, BASE_SPRITE_SIZE);
      sourceCtx.imageSmoothingEnabled = false;
      sourceCtx.drawImage(image, 0, 0, BASE_SPRITE_SIZE, BASE_SPRITE_SIZE);

      const imageData = sourceCtx.getImageData(0, 0, BASE_SPRITE_SIZE, BASE_SPRITE_SIZE).data;
      const pixels: DustPixel[] = [];
      for (let y = BASE_SPRITE_SIZE - 1; y >= 0; y -= DUST_SAMPLE_STEP) {
        for (let x = 0; x < BASE_SPRITE_SIZE; x += DUST_SAMPLE_STEP) {
          const index = (y * BASE_SPRITE_SIZE + x) * 4;
          const alpha = imageData[index + 3] ?? 0;
          if (alpha < 120) continue;
          pixels.push({
            x,
            y,
            color: `rgba(${imageData[index]}, ${imageData[index + 1]}, ${imageData[index + 2]}, ${alpha / 255})`,
            activation: Math.max(0, 1 - ((y + DUST_SAMPLE_STEP) / BASE_SPRITE_SIZE)),
          });
        }
      }

      resolve({ sourceCanvas, pixels });
    };
    image.onerror = reject;
    image.src = `${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`;
  });

  dustSourceCache.set(spriteFile, promise);
  return promise;
}

const EnemyDeathDust = memo(function EnemyDeathDust({
  spriteFile,
  scale,
  flashBeforeDust,
  onComplete,
}: EnemyDeathDustProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [dustStarted, setDustStarted] = useState(!flashBeforeDust);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };
    const flashDelay = flashBeforeDust ? DAMAGE_FLASH_MS : 0;
    const finishId = window.setTimeout(finish, flashDelay + DEATH_ANIMATION_MS + 120);
    return () => window.clearTimeout(finishId);
  }, [flashBeforeDust]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId = 0;
    let cancelled = false;

    let startTimeout = 0;

    const startAnimation = (source: DustSource) => {
      if (cancelled) return;

      setReady(true);

      const particles: DustParticle[] = source.pixels.map((pixel) => ({
        ...pixel,
        size: Math.random() < 0.7 ? 2 : 1,
        driftX: (Math.random() - 0.5) * 16,
        driftY: 8 + Math.random() * 18,
        spin: (Math.random() - 0.5) * 10,
      }));

      const start = performance.now();
      setDustStarted(true);
      const draw = (now: number) => {
        if (cancelled) return;

        const elapsed = now - start;
        const progress = Math.min(1, elapsed / DEATH_ANIMATION_MS);
        const cutoffY = Math.max(0, Math.ceil(BASE_SPRITE_SIZE * (1 - progress)));

        ctx.clearRect(0, 0, BASE_SPRITE_SIZE, BASE_SPRITE_SIZE);
        ctx.imageSmoothingEnabled = false;

        if (cutoffY > 0) {
          ctx.drawImage(
            source.sourceCanvas,
            0,
            0,
            BASE_SPRITE_SIZE,
            cutoffY,
            0,
            0,
            BASE_SPRITE_SIZE,
            cutoffY,
          );
        }

        for (const particle of particles) {
          if (progress < particle.activation) continue;

          const local = Math.min(1, (progress - particle.activation) / DUST_PARTICLE_LIFETIME);
          const alpha = 1 - local;
          if (alpha <= 0) continue;

          const px = particle.x + particle.driftX * local + particle.spin * local * local;
          const py = particle.y - particle.driftY * local + 3 * local * local;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.fillRect(Math.round(px), Math.round(py), particle.size, particle.size);
        }

        ctx.globalAlpha = 1;

        if (progress < 1) {
          frameId = window.requestAnimationFrame(draw);
        }
      };

      frameId = window.requestAnimationFrame(draw);
    };

    loadDustSource(spriteFile)
      .then((source) => {
        if (cancelled) return;
        startTimeout = window.setTimeout(() => startAnimation(source), flashBeforeDust ? DAMAGE_FLASH_MS : 0);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(startTimeout);
      window.cancelAnimationFrame(frameId);
    };
  }, [flashBeforeDust, spriteFile]);

  return (
    <div
      className="pointer-events-none absolute left-1/2"
      style={{
        top: 7,
        width: BASE_SPRITE_SIZE,
        height: BASE_SPRITE_SIZE,
        transform: 'translateX(-50%)',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
        alt=""
        aria-hidden
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 80,
          imageRendering: 'pixelated',
          opacity: 0.35,
          transform: `scale(${Math.min(1.2, Math.max(0.9, scale))})`,
          transformOrigin: 'center',
          animation: `enemy-death-shadow ${DEATH_ANIMATION_MS}ms ease-out forwards`,
          animationDelay: flashBeforeDust ? `${DAMAGE_FLASH_MS}ms` : undefined,
        }}
      />
      {!ready && (
        <img
          src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: BASE_SPRITE_SIZE,
            height: BASE_SPRITE_SIZE,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            transform: `scale(${scale})`,
            transformOrigin: 'bottom center',
          }}
        />
      )}
      {!dustStarted && flashBeforeDust && (
        <img
          src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
          alt=""
          aria-hidden
          className="enemy-damage-flash-overlay absolute top-0 left-0"
          style={{
            width: BASE_SPRITE_SIZE,
            height: BASE_SPRITE_SIZE,
            imageRendering: 'pixelated',
            objectFit: 'contain',
            transform: `scale(${scale})`,
            transformOrigin: 'bottom center',
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        width={BASE_SPRITE_SIZE}
        height={BASE_SPRITE_SIZE}
        style={{
          position: 'absolute',
          inset: 0,
          width: BASE_SPRITE_SIZE,
          height: BASE_SPRITE_SIZE,
          imageRendering: 'pixelated',
          opacity: ready ? 1 : 0,
          transform: `scale(${scale})`,
          transformOrigin: 'bottom center',
        }}
      />
    </div>
  );
});
