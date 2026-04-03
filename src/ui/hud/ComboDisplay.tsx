import { memo, useRef, useEffect, useState } from 'react';
import { useCombatStore } from '../../store/combatStore';

/** Calculate the cascade resource multiplier. */
function getComboMultiplier(combo: number): number {
  if (combo <= 1) return 1.0;
  return 1 + (combo - 1) * 0.1;
}

/**
 * ComboDisplay: shows cascade/combo count during match resolution.
 * Positioned above the player panel. Shows multiplier.
 * Pops on each increment.
 */
export const ComboDisplay = memo(function ComboDisplay() {
  const combo = useCombatStore((s) => s.comboCount);
  const [scale, setScale] = useState(1);
  const prevCombo = useRef(combo);

  // Pop animation when combo increases
  useEffect(() => {
    if (combo > prevCombo.current && combo > 1) {
      setScale(1.4);
      const timeout = setTimeout(() => setScale(1), 200);
      return () => clearTimeout(timeout);
    }
    prevCombo.current = combo;
  }, [combo]);

  if (combo <= 1) return null;

  const multiplier = getComboMultiplier(combo);

  return (
    <div
      className="text-center"
      style={{
        transform: `scale(${scale})`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      <span
        className="text-[10px] font-bold"
        style={{
          color: combo >= 5 ? '#FFD700' : combo >= 3 ? '#D4A030' : '#C0C0C0',
        }}
      >
        {combo}x combo!
      </span>
      <span
        className="text-[8px] ml-1"
        style={{
          color: combo >= 5 ? '#FFD700' : combo >= 3 ? '#D4A030' : '#C0C0C0',
          opacity: 0.8,
        }}
      >
        ({multiplier.toFixed(1)}x)
      </span>
    </div>
  );
});

export { getComboMultiplier };
