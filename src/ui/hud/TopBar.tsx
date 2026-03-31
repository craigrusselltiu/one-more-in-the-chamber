import { memo } from 'react';
import { useCombatStore } from '../../store/combatStore';

const ACT_LABELS: Record<number, string> = {
  1: 'Act I',
  2: 'Act II',
  3: 'Act III',
};

/**
 * TopBar: act label (left), gold count (center), gear (far right).
 * Matches SPEC layout: ~16px tall bar at top of combat screen.
 */
export const TopBar = memo(function TopBar() {
  const currentAct = useCombatStore((s) => s.currentAct);
  const gold = useCombatStore((s) => s.gold);

  return (
    <div className="flex justify-between items-center px-2 h-4 bg-black/50 text-[8px] pointer-events-auto">
      <span className="text-amber-400 font-bold">
        {ACT_LABELS[currentAct] ?? 'Act I'}
      </span>
      <span className="text-yellow-300">
        {gold} gold
      </span>
      <button
        className="text-stone-500 hover:text-stone-300"
        title="Settings"
      >
        [=]
      </button>
    </div>
  );
});
