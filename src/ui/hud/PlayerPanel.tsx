import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { EventBus, GameEvent } from '../../game/EventBus';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: sprite placeholder, HP bar, status effects.
 * Ability meter is rendered under the board in CombatHUD.
 */
const CHARACTER_SPRITES: Record<string, string> = {
  red_panda: 'rust.png',
  reno: 'reno.png',
};

const CHARACTER_ATTACK_SPRITES: Record<string, string> = {
  red_panda: 'rust_attack.png',
  reno: 'reno_attack.png',
};

const RUST_SHEET_FRAME_SIZE = 64;
const RUST_SHEET_COLS = 4;
const RUST_IDLE_FRAME_COUNT = 4;
const RUST_ATTACK_FRAME = 4;
const RUST_IDLE_FRAME_DELAY_MS = 180;
const CHARACTER_DISPLAY_SIZE = 96;

let rustSheetCache: HTMLImageElement | null = null;
let rustSheetLoadPromise: Promise<HTMLImageElement> | null = null;

function loadRustSheet(): Promise<HTMLImageElement> {
  if (rustSheetCache) return Promise.resolve(rustSheetCache);
  if (rustSheetLoadPromise) return rustSheetLoadPromise;

  rustSheetLoadPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      rustSheetCache = image;
      resolve(image);
    };
    image.onerror = reject;
    image.src = `${import.meta.env.BASE_URL}assets/sprites/rust_sheet.png`;
  });

  return rustSheetLoadPromise;
}

export const PlayerPanel = memo(function PlayerPanel() {
  const character = useCombatStore((s) => s.character);
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const block = useCombatStore((s) => s.playerBlock);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);
  const nonBlockEffects = useMemo(() => effects.filter((e) => e.type !== 'block'), [effects]);

  const [attacking, setAttacking] = useState(false);
  const [rustIdleFrame, setRustIdleFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (character !== 'red_panda' || attacking) {
      setRustIdleFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setRustIdleFrame((frame) => (frame + 1) % RUST_IDLE_FRAME_COUNT);
    }, RUST_IDLE_FRAME_DELAY_MS);

    return () => clearInterval(interval);
  }, [character, attacking]);

  useEffect(() => {
    const handler = () => {
      setAttacking(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAttacking(false), 500);
    };
    EventBus.on(GameEvent.PLAYER_ATTACK, handler);
    return () => {
      EventBus.off(GameEvent.PLAYER_ATTACK, handler);
      clearTimeout(timerRef.current);
    };
  }, []);

  const spriteFile = attacking
    ? (CHARACTER_ATTACK_SPRITES[character] ?? CHARACTER_SPRITES[character] ?? 'rust.png')
    : (CHARACTER_SPRITES[character] ?? 'rust.png');

  return (
    <div className="flex flex-col items-center">
      {/* Character sprite with shadow */}
      <div className="relative mb-1" style={{ width: 96, height: 96 }}>
        <img
          src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
          alt=""
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: 80, imageRendering: 'pixelated', opacity: 0.5 }}
        />
        {character === 'red_panda' ? (
          <RustCombatSprite attacking={attacking} idleFrame={rustIdleFrame} />
        ) : (
          <img
            src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
            alt="Player"
            data-player-sprite
            style={{ width: CHARACTER_DISPLAY_SIZE, height: CHARACTER_DISPLAY_SIZE, imageRendering: 'pixelated', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* HP bar centered, block badge overlaid to the left */}
      <div className="relative">
        <div className="absolute right-full mr-1.5 flex items-center" style={{ height: '100%', top: -1 }}>
          {block > 0 && <BlockBadge value={block} />}
        </div>
        <HealthBar current={health} max={maxHealth} width={120} />
      </div>

      {/* Status effects (excl block) - fixed height section */}
      <div style={{ minHeight: 24 }}>
        <StatusEffects effects={nonBlockEffects} />
      </div>

    </div>
  );
});

const RustCombatSprite = memo(function RustCombatSprite({
  attacking,
  idleFrame,
}: {
  attacking: boolean;
  idleFrame: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const intScale = Math.max(1, Math.ceil(CHARACTER_DISPLAY_SIZE / RUST_SHEET_FRAME_SIZE));
  const canvasSize = RUST_SHEET_FRAME_SIZE * intScale;
  const frameIndex = attacking ? RUST_ATTACK_FRAME : idleFrame;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.imageSmoothingEnabled = false;

    loadRustSheet().then((image) => {
      const frameCol = frameIndex % RUST_SHEET_COLS;
      const frameRow = Math.floor(frameIndex / RUST_SHEET_COLS);
      const sx = frameCol * RUST_SHEET_FRAME_SIZE;
      const sy = frameRow * RUST_SHEET_FRAME_SIZE;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        sx,
        sy,
        RUST_SHEET_FRAME_SIZE,
        RUST_SHEET_FRAME_SIZE,
        0,
        0,
        canvasSize,
        canvasSize,
      );
    });
  }, [canvasSize, frameIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      data-player-sprite
      style={{
        width: CHARACTER_DISPLAY_SIZE,
        height: CHARACTER_DISPLAY_SIZE,
        imageRendering: 'pixelated',
      }}
    />
  );
});
