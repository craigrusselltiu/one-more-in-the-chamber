import { memo } from 'react';

interface AbilityMeterProps {
  charge: number;
  threshold: number;
}

/**
 * AbilityMeter: thin rect below player that fills left-to-right.
 * Shows charge count (e.g. "3/10").
 */
export const AbilityMeter = memo(function AbilityMeter({ charge, threshold }: AbilityMeterProps) {
  const pct = threshold > 0 ? Math.min(1, charge / threshold) : 0;
  const ready = charge >= threshold;

  return (
    <div className="mt-1">
      <div className="relative w-16 h-1.5 bg-stone-800 border border-stone-600">
        <div
          className="absolute inset-0 h-full"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: ready ? '#FFD700' : '#D06080',
          }}
        />
      </div>
      <div className="text-[7px] text-stone-400 text-center">
        {charge}/{threshold}
      </div>
    </div>
  );
});
