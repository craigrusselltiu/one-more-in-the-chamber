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
      // Top bar gold indicator area
      x = 840 + Math.random() * 20;
      y = 10;
    } else {
      // Enemy sprite areas. Map index to visual slot (0->center, 1->top, 2->bottom)
      const slotY = [270, 170, 370];
      x = 800 + Math.random() * 64;
      y = (slotY[index] ?? 270) - 32 + Math.random() * 64;
    }

    setNumbers((prev) => [
      ...prev,
      { id: nextId++, text, color, x, y, vx: (Math.random() - 0.5) * 40, startTime: Date.now(), fontSize },
    ]);
  }, []);

  useEffect(() => {
    EventBus.on(GameEvent.FLOATING_NUMBER, handleFloat);
    return () => { EventBus.off(GameEvent.FLOATING_NUMBER, handleFloat); };
  }, [handleFloat]);

  // Animation loop: update positions and remove expired numbers
  useEffect(() => {
    if (numbers.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNumbers((prev) =>
        prev
          .filter((n) => now - n.startTime < 1000)
          .map((n) => n) // trigger re-render
      );
    }, 30);
    return () => clearInterval(interval);
  }, [numbers.length > 0]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {numbers.map((n) => {
        const elapsed = (Date.now() - n.startTime) / 1000;
        const t = elapsed;
        const gravity = 150;
        const startVy = -50;
        const px = n.x + n.vx * t;
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
