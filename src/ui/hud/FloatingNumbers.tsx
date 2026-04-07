import { memo, useState, useEffect, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';

interface FloatingNumber {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  startTime: number;
  fontSize: number;
  target: 'player' | 'enemy' | 'topbar';
}

let nextId = 0;

/**
 * FloatingNumbers: renders damage/buff/debuff numbers as React elements
 * so they appear above the React HUD (HP bars, etc).
 * Numbers pop upward then arc down with gravity, fading out.
 */
export const FloatingNumbers = memo(function FloatingNumbers() {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);

  const handleFloat = useCallback((...args: unknown[]) => {
    const target = args[0] as 'player' | 'enemy' | 'topbar';
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

    setNumbers((prev) => [
      ...prev,
      { id: nextId++, text, color, x, y, vx: target === 'topbar' ? (Math.random() - 0.5) * 10 : (Math.random() - 0.5) * 40, startTime: Date.now(), fontSize, target },
    ]);
  }, []);

  useEffect(() => {
    EventBus.on(GameEvent.FLOATING_NUMBER, handleFloat);
    return () => { EventBus.off(GameEvent.FLOATING_NUMBER, handleFloat); };
  }, [handleFloat]);

  // Auto-float gold changes by listening to GOLD_CHANGE
  const prevGoldRef = { current: -1 };
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

  // Animation loop: update positions and remove expired numbers
  useEffect(() => {
    if (numbers.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNumbers((prev) =>
        prev
          .filter((n) => now - n.startTime < 1000)
          .map((n) => n) // trigger re-render for position updates
      );
    }, 30);
    return () => clearInterval(interval);
  }, [numbers.length > 0]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden">
      {numbers.map((n) => {
        const elapsed = (Date.now() - n.startTime) / 1000;
        const t = elapsed;
        // Topbar floats drift left and stay level; others pop up then arc down
        const startVy = n.target === 'topbar' ? 0 : -50;
        const gravity = n.target === 'topbar' ? 0 : 150;
        const dx = n.target === 'topbar' ? 10 * t : n.vx * t;
        const px = n.x + dx;
        const py = n.y + startVy * t + 0.5 * gravity * t * t;
        const alpha = Math.max(0, 1 - elapsed);

        return (
          <span
            key={n.id}
            className="absolute font-bold"
            style={{
              left: px,
              top: py,
              color: n.color,
              fontSize: `${n.fontSize}px`,
              opacity: alpha,
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke fill',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {n.text}
          </span>
        );
      })}
    </div>
  );
});
