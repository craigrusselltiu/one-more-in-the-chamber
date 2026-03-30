import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { STARTER_POOL, ADDITIONAL_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/**
 * TileSelectScreen: Choose a tile at run start (1 of 3 from starter pool)
 * or between acts (1 of 3 from additional pool, no repeats).
 */
export const TileSelectScreen = memo(function TileSelectScreen() {
  const run = useRunStore((s) => s.run);
  const startRun = useRunStore((s) => s.startRun);
  const addTileType = useRunStore((s) => s.addTileType);
  const [selected, setSelected] = useState<TileType | null>(null);

  const isStarterSelection = !run;
  const pool = isStarterSelection ? STARTER_POOL : ADDITIONAL_POOL;

  // Pick 3 random tiles from pool (excluding already-owned)
  const offered = useMemo(() => {
    const owned = run?.activeTileTypes ?? [];
    const available = pool.filter((t) => !owned.includes(t));
    // Shuffle and pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run, pool]);

  const handleConfirm = () => {
    if (!selected) return;

    if (isStarterSelection) {
      const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      startRun(seed, selected);
    } else {
      addTileType(selected);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const title = isStarterSelection ? 'Choose Your 4th Tile' : 'Choose a New Tile';
  const subtitle = isStarterSelection
    ? 'This tile defines your early-game identity'
    : `Act ${(run?.currentAct ?? 1) + 1} begins. More tiles, more dilution.`;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/95">
      <h2 className="text-xl text-amber-400 font-mono mb-1">{title}</h2>
      <p className="text-xs text-stone-400 font-mono mb-6">{subtitle}</p>

      <div className="flex gap-4">
        {offered.map((tileType) => {
          const def = TILE_DEFINITIONS[tileType];
          const isSelected = selected === tileType;
          return (
            <button
              key={tileType}
              onClick={() => setSelected(tileType)}
              className={`flex flex-col items-center p-4 w-36 border-2 transition-colors ${
                isSelected
                  ? 'border-amber-400 bg-amber-900/30'
                  : 'border-stone-600 bg-stone-800/50 hover:border-stone-400'
              }`}
            >
              <div
                className="w-10 h-10 rounded mb-2"
                style={{ backgroundColor: def.color }}
              />
              <span className="text-amber-300 font-mono text-sm font-bold">
                {def.label}
              </span>
              <span className="text-stone-400 font-mono text-xs mt-1 text-center">
                {def.description}
              </span>
              <span className="text-stone-500 font-mono text-xs mt-2">
                Base: {def.baseValue}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        className={`mt-6 px-6 py-2 font-mono text-sm border ${
          selected
            ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
            : 'bg-stone-700/50 text-stone-500 border-stone-600 cursor-not-allowed'
        }`}
      >
        Confirm
      </button>
    </div>
  );
});
