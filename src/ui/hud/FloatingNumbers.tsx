import { memo, useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';

interface FloatingNumber {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  dx: number;
  fontSize: number;
  target: 'player' | 'enemy' | 'topbar' | 'topbar-health';
}

let nextId = 0;

/**
 * FloatingNumbers: renders damage/buff/debuff numbers as React elements
 * so they appear above the React HUD (HP bars, etc).
 * Numbers pop upward then arc down with gravity, fading out.
 */
export const FloatingNumbers = memo(function FloatingNumbers() {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  const removalTimers = useRef<number[]>([]);
  const prevGoldRef = useRef(-1);

  const handleFloat = useCallback((...args: unknown[]) => {
    const target = args[0] as 'player' | 'enemy' | 'topbar' | 'topbar-health';
    const index = (args[1] as number) ?? 0;
    const text = args[2] as string;
    const color = (args[3] as string) ?? '#ffffff';
    const fontSize = (args[4] as number) ?? 13;

    // Position in the 960x540 virtual space
    let x: number;
    let y: number;

    // Spawn areas (rectangles) for each target type
    if (target === 'player') {
      // Player sprite area
      x = 80 + Math.random() * 96;
      y = 190 + Math.random() * 96;
    } else if (target === 'topbar') {
      // Just right of the gold indicator
      x = 890;
      y = 14;
    } else if (target === 'topbar-health') {
      // Near the health indicator (sits left of gold on the topbar)
      x = 825;
      y = 14;
    } else {
      // Enemy sprite areas: zig-zag layout matching EnemyTargeting.
      // Alive index -> visual slot: 0->center(1), 1->top(0), 2->bottom(2)
      const SLOT_MAP = [1, 0, 2];
      const slot = SLOT_MAP[index] ?? 1;
      const SLOT_X = [772, 900, 772]; // left, right, left
      const SLOT_Y = [150, 280, 410]; // top, center, bottom
      x = (SLOT_X[slot] ?? 900) + Math.random() * 40 - 20;
      y = (SLOT_Y[slot] ?? 280) + Math.random() * 40 - 20;
    }

    const id = nextId++;
    const dx = target === 'topbar' || target === 'topbar-health'
      ? 10 + (Math.random() - 0.5) * 8
      : (Math.random() - 0.5) * 40;

    setNumbers((prev) => [...prev, { id, text, color, x, y, dx, fontSize, target }]);
    removalTimers.current.push(window.setTimeout(() => {
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    }, 1050));
  }, []);

  useEffect(() => {
    EventBus.on(GameEvent.FLOATING_NUMBER, handleFloat);
    return () => { EventBus.off(GameEvent.FLOATING_NUMBER, handleFloat); };
  }, [handleFloat]);

  // Auto-float gold changes by listening to GOLD_CHANGE
  useEffect(() => {
    const handleGoldChange = (...args: unknown[]) => {
      const newGold = args[0] as number;
      if (prevGoldRef.current < 0) {
        // First emission — just store, don't float
        prevGoldRef.current = newGold;
        return;
      }
      const delta = newGold - prevGoldRef.current;
      prevGoldRef.current = newGold;
      if (delta === 0) return;
      const text = delta > 0 ? `+${delta}` : `${delta}`;
      const color = delta > 0 ? '#FFD700' : '#ff4444';
      handleFloat('topbar', 0, text, color, 13);
    };
    EventBus.on(GameEvent.GOLD_CHANGE, handleGoldChange);
    return () => { EventBus.off(GameEvent.GOLD_CHANGE, handleGoldChange); };
  }, [handleFloat]);

  useEffect(() => {
    return () => {
      for (const timer of removalTimers.current) window.clearTimeout(timer);
      removalTimers.current = [];
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden">
      {numbers.map((n) => {
        const isTopbar = n.target === 'topbar' || n.target === 'topbar-health';
        return (
          <span
            key={n.id}
            className="absolute font-bold"
            style={{
              left: n.x,
              top: n.y,
              color: n.color,
              fontSize: `${n.fontSize}px`,
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill',
              whiteSpace: 'nowrap',
              animation: `${isTopbar ? 'combat-float-topbar' : 'combat-float-arc'} 1000ms ease-out forwards`,
              '--float-dx': `${n.dx}px`,
            } as CSSProperties}
          >
            {n.text}
          </span>
        );
      })}
    </div>
  );
});
