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
 * Pops on each increment, fades out after cascade ends.
 */
export const ComboDisplay = memo(function ComboDisplay() {
  const combo = useCombatStore((s) => s.comboCount);
  const [scale, setScale] = useState(1);
  const [visible, setVisible] = useState(false);
  const [displayCombo, setDisplayCombo] = useState(0);
  const prevCombo = useRef(combo);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (combo > prevCombo.current && combo > 1) {
      // Combo increased: show and pop
      setDisplayCombo(combo);
      setVisible(true);
      setScale(1.4);
      setTimeout(() => setScale(1), 200);

      // Reset fade timer
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setVisible(false), 1200);
    } else if (combo <= 1 && prevCombo.current > 1) {
      // Cascade ended (combo reset): start fade
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setVisible(false), 800);
    }
    prevCombo.current = combo;
  }, [combo]);

  if (!visible && displayCombo <= 1) return null;

  const multiplier = getComboMultiplier(displayCombo);

  return (
    <div
      className="text-center"
      style={{
        transform: `scale(${scale})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.15s ease-out, opacity 0.6s ease-out',
      }}
    >
      <span
        className="text-[10px] font-bold"
        style={{
          color: displayCombo >= 5 ? '#FFD700' : displayCombo >= 3 ? '#D4A030' : '#C0C0C0',
        }}
      >
        {displayCombo}x combo!
      </span>
      <span
        className="text-[8px] ml-1"
        style={{
          color: displayCombo >= 5 ? '#FFD700' : displayCombo >= 3 ? '#D4A030' : '#C0C0C0',
          opacity: 0.8,
        }}
      >
        ({multiplier.toFixed(1)}x)
      </span>
    </div>
  );
});

export { getComboMultiplier };
