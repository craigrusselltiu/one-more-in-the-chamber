import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { STARTER_POOL, ADDITIONAL_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/**
 * TileSelectScreen: Choose a tile at run start (1 of 3 from starter pool)
 * or between acts (1 of 3 from additional pool, no repeats).
 *
 * Layout follows choice.jpg reference: title banner top-center,
 * cards laid out horizontally, confirm/skip at bottom.
 */
export const TileSelectScreen = memo(function TileSelectScreen() {
  const run = useRunStore((s) => s.run);
  const startRun = useRunStore((s) => s.startRun);
  const addTileType = useRunStore((s) => s.addTileType);
  const advanceAct = useRunStore((s) => s.advanceAct);
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
      advanceAct();
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const title = isStarterSelection ? 'Choose Your 4th Tile' : 'Choose a New Tile';
  const subtitle = isStarterSelection
    ? 'This tile defines your early-game identity'
    : `Act ${(run?.currentAct ?? 1) + 1} begins. More tiles, more dilution.`;

  return (
    <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
      {/* Title banner */}
      <div className="text-center mb-6">
        <h2 className="text-lg text-amber-400 font-mono font-bold">{title}</h2>
        <p className="text-[10px] text-stone-500 font-mono mt-1">{subtitle}</p>
      </div>

      {/* Tile cards */}
      <div className="flex gap-3">
        {offered.map((tileType) => {
          const def = TILE_DEFINITIONS[tileType];
          const isSelected = selected === tileType;
          return (
            <button
              key={tileType}
              onClick={() => setSelected(tileType)}
              className="flex flex-col items-center w-28 transition-all"
              style={{
                border: `2px solid ${isSelected ? '#f59e0b' : '#44403c'}`,
                backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.4)' : 'rgba(28, 25, 23, 0.8)',
                padding: '8px 6px',
                transform: isSelected ? 'translateY(-4px)' : 'none',
              }}
            >
              <div
                className="w-8 h-8 rounded-sm mb-1.5"
                style={{ backgroundColor: def.color }}
              />
              <span className="text-amber-300 font-mono text-xs font-bold">
                {def.label}
              </span>
              <span className="text-stone-400 font-mono text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                {def.description}
              </span>
              <span className="text-stone-600 font-mono mt-1.5" style={{ fontSize: '8px' }}>
                Base: {def.baseValue}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        className={`mt-5 px-5 py-1.5 font-mono text-xs border ${
          selected
            ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
            : 'bg-stone-800/50 text-stone-600 border-stone-700 cursor-not-allowed'
        }`}
      >
        Confirm
      </button>
    </div>
  );
});
