import { memo } from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
}

/**
 * HealthBar: colored rect (green > yellow > red gradient by %).
 * HP numbers overlaid.
 */
export const HealthBar = memo(function HealthBar({ current, max, label }: HealthBarProps) {
  const pct = max > 0 ? current / max : 0;
  const color = pct > 0.5 ? '#40D840' : pct > 0.25 ? '#D4A030' : '#D04040';

  return (
    <div className="mb-1">
      <div className="text-stone-400 text-[8px] mb-0.5">{label}</div>
      <div className="relative w-16 h-2 bg-stone-800 border border-stone-600">
        <div
          className="absolute inset-0 h-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white">
          {current}/{max}
        </span>
      </div>
    </div>
  );
});
