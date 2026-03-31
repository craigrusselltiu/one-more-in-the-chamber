import { memo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import type { Screen } from '../../App';

export const MainMenu = memo(function MainMenu() {
  const run = useRunStore((s) => s.run);
  const hasActiveRun = run && run.status === 'active';

  const handleNewGame = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'tile-select' satisfies Screen);
  };

  const handleContinue = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  return (
    <div className="relative bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
      {/* Title -- centered on screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-400 font-mono tracking-wide leading-tight">
            ONE MORE
            <br />
            IN THE CHAMBER
          </h1>
          <p className="text-xs text-stone-500 font-mono mt-2">
            A roguelike match-3 western
          </p>
        </div>
      </div>

      {/* Menu items -- bottom left */}
      <div className="absolute left-6 bottom-8 flex flex-col gap-1">
        {hasActiveRun && (
          <button
            onClick={handleContinue}
            className="text-left text-sm font-mono text-stone-300 hover:text-amber-400 transition-colors"
          >
            Continue
          </button>
        )}
        <button
          onClick={handleNewGame}
          className="text-left text-sm font-mono text-stone-300 hover:text-amber-400 transition-colors"
        >
          New Game
        </button>
        <button
          className="text-left text-sm font-mono text-stone-600 cursor-not-allowed"
          disabled
        >
          Reputation Shop
        </button>
        <button
          className="text-left text-sm font-mono text-stone-600 cursor-not-allowed"
          disabled
        >
          Settings
        </button>
      </div>

      {/* Version -- bottom right */}
      <div className="absolute right-4 bottom-3">
        <span className="text-[9px] text-stone-700 font-mono">v0.1.0</span>
      </div>
    </div>
  );
});
