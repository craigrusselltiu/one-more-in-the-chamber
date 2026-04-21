import { memo, useEffect, useRef, useState } from 'react';

const SRC = `${import.meta.env.BASE_URL}assets/health.png`;
// Sprite is 64x18: top 64x9 is the frame, bottom 64x9 is the fill.
const SPRITE_NATIVE_W = 64;
const SPRITE_H = 12;

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  /** Width in pixels at internal resolution. Default 64. */
  width?: number;
  /** Unused since switching to sprite; kept to avoid touching callers. */
  color?: string;
}

/**
 * HealthBar: sprite-based (frame + fill from assets/health.png).
 * On damage, a tinted "ghost" fill lingers at the prior width and eases
 * down to the new value -- fighting-game style.
 */
export const HealthBar = memo(function HealthBar({
  current,
  max,
  label,
  width = SPRITE_NATIVE_W,
}: HealthBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  const [ghostPct, setGhostPct] = useState(pct);
  const [ghostAnimating, setGhostAnimating] = useState(false);
  const prevPctRef = useRef(pct);

  useEffect(() => {
    const prev = prevPctRef.current;
    prevPctRef.current = pct;
    if (pct < prev) {
      setGhostAnimating(true);
      const t = setTimeout(() => setGhostPct(pct), 200);
      return () => clearTimeout(t);
    }
    setGhostAnimating(false);
    setGhostPct(pct);
  }, [pct]);

  const spriteBg = {
    backgroundImage: `url(${SRC})`,
    backgroundSize: `${width}px ${SPRITE_H * 2}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated' as const,
  };

  return (
    <div className="mb-0.5">
      {label && (
        <div className="text-stone-400 text-[8px] mb-px leading-none">
          {label}
        </div>
      )}
      <div className="relative" style={{ width }}>
        <div
          className="relative overflow-hidden"
          style={{ width, height: SPRITE_H, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="absolute inset-0"
            style={{ ...spriteBg, backgroundPosition: '0 0' }}
          />
          <div
            className="absolute top-0 left-0"
            style={{
              ...spriteBg,
              backgroundPosition: `0 -${SPRITE_H}px`,
              height: SPRITE_H,
              width: `${ghostPct * 100}%`,
              filter: 'brightness(0.45) saturate(0.85)',
              transition: ghostAnimating ? 'width 0.5s ease-out' : 'none',
            }}
          />
          <div
            className="absolute top-0 left-0"
            style={{
              ...spriteBg,
              backgroundPosition: `0 -${SPRITE_H}px`,
              height: SPRITE_H,
              width: `${pct * 100}%`,
            }}
          />
        </div>
        <span
          className="absolute text-[7px] text-white leading-none font-bold whitespace-nowrap"
          style={{
            top: SPRITE_H - 5,
            left: 8,
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {current}/{max}
        </span>
      </div>
    </div>
  );
});
