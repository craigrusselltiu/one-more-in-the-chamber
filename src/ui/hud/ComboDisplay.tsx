import { memo } from 'react';
import { useCombatStore } from '../../store/combatStore';

/**
 * ComboDisplay: shows cascade/combo count during match resolution.
 * Centered below the board area. Hidden when combo is 0.
 */
export const ComboDisplay = memo(function ComboDisplay() {
  const combo = useCombatStore((s) => s.comboCount);

  if (combo <= 1) return null;

  return (
    <div className="text-center">
      <span
        className="text-[10px] font-bold"
        style={{
          color: combo >= 5 ? '#FFD700' : combo >= 3 ? '#D4A030' : '#C0C0C0',
        }}
      >
        x{combo}
      </span>
    </div>
  );
});
