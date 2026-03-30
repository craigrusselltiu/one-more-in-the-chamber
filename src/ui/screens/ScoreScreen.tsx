import { memo } from 'react';

/**
 * ScoreScreen: end-of-run scoring breakdown.
 * Formula: (Base + Bonus) x Ascension x Time
 */
export const ScoreScreen = memo(function ScoreScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h2 className="text-xl text-amber-400 font-mono mb-4">Run Complete</h2>
      <p className="text-stone-400 font-mono text-sm">Score screen coming soon</p>
    </div>
  );
});
