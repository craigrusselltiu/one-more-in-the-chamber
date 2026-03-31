import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { getActName } from '../../game/map/MapGenerator';
import type { Act } from '../../types/game';

/**
 * TopBar: act label (left), HP + gold (right), gear (far right).
 * Shared between map and combat screens for visual consistency.
 * Reads from runStore, which CombatBridge keeps in sync during combat.
 */
export const TopBar = memo(function TopBar() {
  const run = useRunStore((s) => s.run);
  const act = (run?.currentAct ?? 1) as Act;
  const health = run?.health ?? 100;
  const maxHealth = run?.maxHealth ?? 100;
  const gold = run?.gold ?? 0;

  return (
    <div className="flex justify-between items-center px-2 h-4 bg-black/50 text-[8px] font-mono pointer-events-auto">
      <span className="text-amber-400 font-bold">
        Act {act} -- {getActName(act)}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-red-400">HP {health}/{maxHealth}</span>
        <span className="text-yellow-300">{gold} gold</span>
        <button
          className="text-stone-500 hover:text-stone-300"
          title="Settings"
        >
          [=]
        </button>
      </div>
    </div>
  );
});
