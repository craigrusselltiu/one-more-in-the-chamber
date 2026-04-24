import { memo, useEffect, useRef, useState, type RefObject } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useSettingsStore } from '../../store/settingsStore';

interface AttackLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

let nextId = 0;

function cssEscape(value: string): string {
  const css = (globalThis as unknown as { CSS?: { escape?: (s: string) => string } }).CSS;
  if (css?.escape) return css.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

export const CombatAttackLines = memo(function CombatAttackLines({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [lines, setLines] = useState<AttackLine[]>([]);
  const timeoutsRef = useRef(new Map<number, number>());

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
      const enemyId = args[0] as string;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const playerEl = container.querySelector('[data-player-sprite]') as HTMLElement | null;
      const enemyEl = container.querySelector(
        `[data-enemy-sprite-id="${cssEscape(enemyId)}"]`,
      ) as HTMLElement | null;

      if (!playerEl || !enemyEl) return;

      const playerRect = playerEl.getBoundingClientRect();
      const enemyRect = enemyEl.getBoundingClientRect();

      // Map DOM pixels into the 960x540 virtual HUD space.
      const scaleX = 960 / containerRect.width;
      const scaleY = 540 / containerRect.height;

      const x1 = Math.round((playerRect.right - containerRect.left) * scaleX);
      const y1 = Math.round((playerRect.top + playerRect.height * 0.18 - containerRect.top) * scaleY);
      const x2 = Math.round((enemyRect.left + enemyRect.width / 2 - containerRect.left) * scaleX);
      const y2 = Math.round((enemyRect.top + enemyRect.height / 2 - containerRect.top) * scaleY);

      const id = nextId++;
      setLines((prev) => [...prev, { id, x1, y1, x2, y2 }]);

      const timeout = window.setTimeout(() => {
        setLines((prev) => prev.filter((l) => l.id !== id));
        timeoutsRef.current.delete(id);
      }, 260);
      timeoutsRef.current.set(id, timeout);
    };

    EventBus.on(GameEvent.PLAYER_DAMAGE_LINE, handler);
    return () => {
      EventBus.off(GameEvent.PLAYER_DAMAGE_LINE, handler);
      for (const timeout of timeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, [containerRef]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[120]"
      width={960}
      height={540}
      viewBox="0 0 960 540"
    >
      {lines.map((l) => (
        <g key={l.id} className="player-attack-line" shapeRendering="crispEdges">
          <line
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
        </g>
      ))}
    </svg>
  );
});
