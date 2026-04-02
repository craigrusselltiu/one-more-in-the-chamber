import { memo, useState, useRef, useEffect } from 'react';
import { useRunStore } from '../../store/runStore';
import { getActName } from '../../game/map/MapGenerator';
import { EventBus, GameEvent } from '../../game/EventBus';
import { MapScreen } from '../screens/MapScreen';
import { ConsumableSlots } from './ConsumableSlots';
import type { Act } from '../../types/game';
import type { Screen } from '../../App';

/** Format seconds into MM:SS or H:MM:SS. */
function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * TopBar: act label + consumable slots (left), HP + gold (right), gear (far right).
 * Shared between map and combat screens for visual consistency.
 * Reads from runStore, which CombatBridge keeps in sync during combat.
 */
export const TopBar = memo(function TopBar({ showMapButton, showConsumables }: { showMapButton?: boolean; showConsumables?: boolean }) {
  const run = useRunStore((s) => s.run);
  const act = (run?.currentAct ?? 1) as Act;
  const health = run?.health ?? 100;
  const maxHealth = run?.maxHealth ?? 100;
  const gold = run?.gold ?? 0;
  const runStartedAt = run?.runStartedAt ?? 0;
  const [showMap, setShowMap] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const endRun = useRunStore((s) => s.endRun);

  // Update elapsed timer every second
  useEffect(() => {
    if (!runStartedAt) return;
    setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [runStartedAt]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleGiveUp = () => {
    setShowMenu(false);
    endRun(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'score' satisfies Screen);
  };

  return (
    <>
      <div className="flex justify-between items-center px-2 h-5 bg-black/50 text-[8px] font-mono pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">
            Act {act} - {getActName(act)}
          </span>
          {showConsumables && <ConsumableSlots />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-stone-500">{formatTimer(elapsed)}</span>
          <span className="text-red-400">HP {health}/{maxHealth}</span>
          <span className="text-yellow-300">{gold} gold</span>
          {showMapButton && (
            <button
              onClick={() => setShowMap((v) => !v)}
              className="text-stone-400 hover:text-stone-200"
              title="Map"
            >
              [M]
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-stone-500 hover:text-stone-300"
              title="Settings"
            >
              [=]
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-px bg-stone-900 border border-stone-600 z-50 min-w-[80px]">
                <button
                  onClick={handleGiveUp}
                  className="w-full text-left px-2 py-1 text-red-400 hover:bg-stone-800 text-[8px]"
                >
                  Give Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showMap && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMap(false); }}
        >
          <MapScreen readonly onClose={() => setShowMap(false)} />
        </div>
      )}
    </>
  );
});
