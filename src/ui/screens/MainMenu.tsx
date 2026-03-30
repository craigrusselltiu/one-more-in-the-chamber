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
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h1 className="text-3xl font-bold text-amber-400 mb-2 font-mono tracking-wide">
        ONE MORE IN THE CHAMBER
      </h1>
      <p className="text-sm text-stone-400 mb-8 font-mono">
        A roguelike match-3 western
      </p>
      <div className="flex flex-col gap-3 w-48">
        <button
          onClick={handleContinue}
          disabled={!hasActiveRun}
          className={`px-4 py-2 font-mono text-sm border ${
            hasActiveRun
              ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
              : 'bg-stone-700/50 text-stone-500 border-stone-600 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
        <button
          onClick={handleNewGame}
          className="px-4 py-2 bg-amber-900/60 text-amber-300 font-mono text-sm border border-amber-700 hover:bg-amber-800/60"
        >
          New Game
        </button>
        <button
          className="px-4 py-2 bg-stone-700/50 text-stone-400 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
          disabled
        >
          Reputation Shop
        </button>
        <button
          className="px-4 py-2 bg-stone-700/50 text-stone-400 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
          disabled
        >
          Settings
        </button>
      </div>
    </div>
  );
});
