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

interface ShootEffect {
  id: number;
  x: number;
  y: number;
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
  const [shootEffects, setShootEffects] = useState<ShootEffect[]>([]);
  const lineTimeoutsRef = useRef(new Map<number, number>());
  const shootTimeoutsRef = useRef(new Map<number, number>());

  useEffect(() => {
    const lineHandler = (...args: unknown[]) => {
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
      EventBus.emit(GameEvent.SHOOT_EFFECT, { x: x1, y: y1 });

      const timeout = window.setTimeout(() => {
        setLines((prev) => prev.filter((l) => l.id !== id));
        lineTimeoutsRef.current.delete(id);
      }, 260);
      lineTimeoutsRef.current.set(id, timeout);
    };

    const shootHandler = (...args: unknown[]) => {
      if (!useSettingsStore.getState().juiceAnimationsEnabled) return;
      const payload = args[0] as { x: number; y: number };
      const id = nextId++;
      setShootEffects((prev) => [...prev, { id, x: payload.x, y: payload.y }]);

      const timeout = window.setTimeout(() => {
        setShootEffects((prev) => prev.filter((effect) => effect.id !== id));
        shootTimeoutsRef.current.delete(id);
      }, 240);
      shootTimeoutsRef.current.set(id, timeout);
    };

    EventBus.on(GameEvent.PLAYER_DAMAGE_LINE, lineHandler);
    EventBus.on(GameEvent.SHOOT_EFFECT, shootHandler);
    return () => {
      EventBus.off(GameEvent.PLAYER_DAMAGE_LINE, lineHandler);
      EventBus.off(GameEvent.SHOOT_EFFECT, shootHandler);
      for (const timeout of lineTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      lineTimeoutsRef.current.clear();
      for (const timeout of shootTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      shootTimeoutsRef.current.clear();
    };
  }, [containerRef]);

  if (lines.length === 0 && shootEffects.length === 0) return null;

  return (
    <>
      {lines.length > 0 && (
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
      )}
      {shootEffects.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-[121]">
          {shootEffects.map((effect) => (
            <div
              key={effect.id}
              className="combat-shoot-effect"
              style={{
                left: effect.x + 10,
                top: effect.y,
                backgroundImage: `url(${import.meta.env.BASE_URL}assets/effects/shoot.png)`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
});
