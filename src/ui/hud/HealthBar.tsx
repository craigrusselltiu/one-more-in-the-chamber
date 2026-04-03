import { memo } from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  /** Width in pixels at internal resolution. Default 64. */
  width?: number;
  /** Color override. Default auto (green/yellow/red by %). */
  color?: string;
}

/**
 * HealthBar: colored rect (green > yellow > red by %).
 * HP numbers overlaid. Used for both player and enemies.
 */
export const HealthBar = memo(function HealthBar({
  current,
  max,
  label,
  width = 64,
  color,
}: HealthBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const barColor =
    color ?? (pct > 0.5 ? '#40D840' : pct > 0.25 ? '#D4A030' : '#D04040');

  return (
    <div className="mb-0.5">
      {label && (
        <div className="text-stone-400 text-[8px] mb-px leading-none">
          {label}
        </div>
      )}
      <div
        className="relative bg-stone-800 border border-stone-600"
        style={{ width, height: 10 }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: barColor,
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-[8px] text-white leading-none font-bold"
          style={{ textShadow: '-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000' }}
        >
          {current}/{max}
        </span>
      </div>
    </div>
  );
});
